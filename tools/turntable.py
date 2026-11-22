#!/usr/bin/env python3
"""Turn a 360-degree studio turntable video into the website's drag-to-rotate frames.

    python3 tools/turntable.py <video.mp4> <out-folder> <car-key> [--frames 48] [--keys key-photos.json]

What it does:
  1. pulls N evenly spaced frames from the video (one full turn)
  2. finds the car body in every frame (ignores the soft floor shadow)
  3. moves every frame so the car sits dead centre and on the same floor line,
     smoothing the moves across neighbouring frames so nothing jitters
  4. crops all frames to one shared size, background forced to pure white
  5. saves a computer size (1100 px wide) and a phone size (640 px wide)
  6. optional: matches hand-made key photos (with their tap dots) to the closest frames by colour
  7. writes meta.json with the frame boxes (for dot placement) and the matches
"""
import argparse, json, os, subprocess, sys
import numpy as np
from PIL import Image

FF = os.environ.get('FFMPEG') or 'ffmpeg'


def whiten(a):  # studio background (~250) to pure white
    return np.clip(a * 255 / 246, 0, 255)


def clean_floor(img):
    """Keep the car and its shadow; turn everything else pure white (removes floor rings or marks the render adds)."""
    from PIL import ImageFilter
    a = np.asarray(img).astype(float)
    m = Image.fromarray(((a.min(axis=2) < 236) * 255).astype('uint8'))
    small = m.resize((m.width // 4, m.height // 4), Image.BILINEAR).point(lambda v: 255 if v > 60 else 0)
    solid = small.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))      # thin lines vanish
    keep = solid.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(3))    # soft margin round car + shadow
    keep = np.asarray(keep.resize(img.size, Image.BILINEAR)).astype(float)[..., None] / 255
    return Image.fromarray((a * keep + 255 * (1 - keep)).clip(0, 255).astype('uint8'))


def body_box(a):
    """Car body box: darker than the floor shadow; robust to a few stray pixels."""
    m = whiten(a).min(axis=2) < 200
    ys, xs = np.where(m)
    if not len(xs):
        return None
    return [float(np.percentile(xs, .3)), float(np.percentile(ys, .3)), float(np.percentile(xs, 99.7)), float(np.percentile(ys, 99.7))]


def lean(a):
    """Camera lean in degrees: compares the lowest tyre points at the far left and far right of the car.
    Only meaningful when both tyres are side by side (straight front, straight rear, side profiles)."""
    body = whiten(a).min(axis=2) < 200; dark = whiten(a).min(axis=2) < 90
    ys, xs = np.where(body); x0, x1 = xs.min(), xs.max(); w = x1 - x0
    def low(xa, xb):
        r = np.where(dark[:, xa:xb].any(axis=1))[0]; return r.max() if len(r) else None
    L = low(x0, int(x0 + w * .32)); R = low(int(x1 - w * .32), x1)
    if L is None or R is None: return None
    return float(np.degrees(np.arctan2(R - L, w * .68)))


def sym_lean(a):
    """Lean of a straight-on front or rear view: the rotation (0.1 degree steps) at which the car is most mirror-symmetric."""
    clean = np.asarray(clean_floor(Image.fromarray(whiten(a).astype('uint8')))).astype(float)   # no floor marks in the measurement
    m = Image.fromarray(((clean.min(axis=2) < 200) * 255).astype('uint8'))
    m = m.resize((m.width // 2, m.height // 2))
    best, best_ang = -1, 0.0
    for ang in np.arange(-3, 3.01, 0.1):
        r = np.asarray(m.rotate(float(ang), resample=Image.BILINEAR)) > 128
        ys, xs = np.where(r)
        if not len(xs): continue
        c = r[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        sc = (c & c[:, ::-1]).sum() / max(1, (c | c[:, ::-1]).sum())
        if sc > best: best, best_ang = sc, float(ang)
    return best_ang, best


def orbit_fit(v, harmonics):
    """The camera's slow drift over one full turn: a smooth curve (low-order Fourier fit over 360 degrees).
    Removing only this keeps the car steady without reacting to its changing outline frame by frame."""
    v = np.asarray(v, float); n = len(v); t = np.arange(n) * 2 * np.pi / n
    cols = [np.ones(n)] + [f(h * t) for h in range(1, harmonics + 1) for f in (np.cos, np.sin)]
    A = np.stack(cols, 1); coef, *_ = np.linalg.lstsq(A, v, rcond=None)
    return A @ coef


def find_stops(video, dur, tmp):
    """Exact times of the 8 arrow stops: the start view (t=0), dead-on front, exact side, dead-on rear, exact other side,
    and the three-quarter views half-way between them. Straight-on = most mirror-symmetric; side = longest outline."""
    d = os.path.join(tmp, 'dense'); os.makedirs(d, exist_ok=True)
    subprocess.run([FF, '-v', 'error', '-y', '-i', video, '-vf', 'fps=20,scale=640:-1', f'{d}/d%03d.png'], check=True)
    fs = sorted(f for f in os.listdir(d) if f.endswith('.png'))
    sym, wid, red = [], [], []
    for f in fs:
        a = np.array(Image.open(os.path.join(d, f)).convert('RGB')).astype(float); w = whiten(a)
        m = w.min(axis=2) < 200; ys, xs = np.where(m)
        x0, x1, y0, y1 = [int(v) for v in (np.percentile(xs, .3), np.percentile(xs, 99.7), np.percentile(ys, .3), np.percentile(ys, 99.7))]
        c = m[y0:y1, x0:x1]; sym.append((c & c[:, ::-1]).sum() / max(1, (c | c[:, ::-1]).sum()))
        wid.append((x1 - x0) / max(1, y1 - y0)); red.append(((a[..., 0] > 140) & (a[..., 1] < 70) & (a[..., 2] < 70)).sum())
    sym, wid, red = map(np.array, (sym, wid, red)); n = len(fs); t = np.arange(n) / 20
    def peak(arr, lo, hi):
        i0, i1 = int(lo * 20), int(hi * 20); return t[i0 + int(np.argmax(arr[i0:i1]))]
    half = dur / 2
    a1 = peak(sym, 0.3, half); a2 = peak(sym, a1 + dur * .3, min(dur - .3, a1 + dur * .7))   # the two straight-on views
    front, rear = (a1, a2) if red[int(a1 * 20)] < red[int(a2 * 20)] else (a2, a1)
    s1 = peak(wid, min(front, rear) + .3, max(front, rear) - .3)                               # side between them
    s2 = peak(np.concatenate([wid, wid]), max(front, rear) + .3, min(front, rear) + dur - .3) % dur  # side across the loop
    key = sorted([0.0, front, rear, s1, s2])
    stops = []
    for i, k in enumerate(key):                       # three-quarter stops half-way between neighbours (start view is already one)
        stops.append(k); nxt = key[i + 1] if i + 1 < len(key) else dur
        if k != 0.0 and nxt != dur: stops.append((k + nxt) / 2)
        elif k != 0.0 and nxt == dur: stops.append((k + dur) / 2)
    stops = sorted(set(round(x, 3) for x in stops))[:8]
    print('stops (s):', stops, '| front', front, 'rear', rear, 'sides', s1, s2, file=sys.stderr)
    return stops


def smooth_circular(v, win=5):
    v = np.asarray(v, float); n = len(v); h = win // 2
    return np.array([np.mean([v[(i + d) % n] for d in range(-h, h + 1)]) for i in range(n)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video'); ap.add_argument('out'); ap.add_argument('key')
    ap.add_argument('--frames', type=int, default=48)
    ap.add_argument('--keys', help='JSON list of [photo path, flip 0/1] in the viewer\'s key-view order')
    ap.add_argument('--level', action='store_true', help='also straighten a leaning camera (only for leans over ~1 degree; smaller is below what it can measure)')
    ap.add_argument('--stops', action='store_true', help='put the 8 arrow stops on the exact straight-on/side/three-quarter views, centred')
    ap.add_argument('--order', help='key indices in the order they appear going round, first = the start frame view')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True); raw = os.path.join(a.out, 'raw'); os.makedirs(raw, exist_ok=True)
    hh, mm, ss = subprocess.run([FF, '-i', a.video], capture_output=True, text=True).stderr.split('Duration: ')[1].split(',')[0].split(':')
    dur = int(hh) * 3600 + int(mm) * 60 + float(ss)
    N = a.frames
    times = [k * dur / N + 0.02 for k in range(N)]
    stop_idx = []
    if a.stops:
        st = find_stops(a.video, dur, a.out); per = N // len(st); times = []
        for i, t0 in enumerate(st):
            t1 = st[i + 1] if i + 1 < len(st) else dur
            stop_idx.append(len(times)); times += [t0 + (t1 - t0) * j / per for j in range(per)]
        times = [min(dur - .03, max(0.02, t)) for t in times]
    for k in range(N):
        t = times[k]
        subprocess.run([FF, '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', a.video, '-frames:v', '1', f'{raw}/f{k:02d}.png'], check=True)
    frames = [np.array(Image.open(f'{raw}/f{k:02d}.png').convert('RGB')).astype(float) for k in range(N)]
    H, W = frames[0].shape[:2]
    if stop_idx and a.level:   # optional: level the camera: find the lean at the straight front and rear (best mirror symmetry), ease between them
        fi, ri = stop_idx[1], stop_idx[5]
        (fa, fs), (ra, rs) = sym_lean(frames[fi]), sym_lean(frames[ri])
        print(f'lean: front {fa:+.1f} deg (symmetry {fs:.3f}), rear {ra:+.1f} deg (symmetry {rs:.3f}) -> levelled', file=sys.stderr)
        roll = np.zeros(N)
        for k in range(N):   # smooth cosine blend front -> rear -> front around the turn
            d = ((k - fi) % N) / N * 2 * np.pi; w = (1 - np.cos(d)) / 2 if (ri - fi) % N else 0
            roll[k] = fa * (1 - w) + ra * w
        frames = [np.asarray(Image.fromarray(whiten(f).astype('uint8')).rotate(float(roll[k]), resample=Image.BICUBIC, fillcolor=(255, 255, 255))).astype(float)
                  for k, f in enumerate(frames)]
    boxes = [body_box(f) for f in frames]
    # remove only the camera's slow drift (smooth curves over the full turn): sideways from the car's middle,
    # up/down from the floor line (wheels), so the car turns on the spot and never bobs
    cx = orbit_fit([(b[0] + b[2]) / 2 for b in boxes], 2)
    gy = orbit_fit([b[3] for b in boxes], 1)
    if stop_idx:   # pin the point the car spins around (its middle, measured at the straight front/side/rear/side views)
        straight = stop_idx[1::2]
        th = np.array([k * 2 * np.pi / N for k in straight])
        A = np.stack([np.ones_like(th), np.cos(th), np.sin(th)], 1)
        tk = np.arange(N) * 2 * np.pi / N; Ak = np.stack([np.ones(N), np.cos(tk), np.sin(tk)], 1)
        fx, *_ = np.linalg.lstsq(A, np.array([(boxes[k][0] + boxes[k][2]) / 2 for k in straight]), rcond=None)
        fy, *_ = np.linalg.lstsq(A, np.array([boxes[k][3] for k in straight]), rcond=None)
        cx = Ak @ fx; gy = Ak @ fy   # one smooth curve each: the car turns on the spot, no sliding, no bobbing
    TX, TY = W / 2, H / 2
    FLOOR = float(np.mean(gy))
    shifted = []
    for k, f in enumerate(frames):
        dx, dy = int(round(TX - cx[k])), int(round(FLOOR - gy[k]))
        im = clean_floor(Image.fromarray(whiten(f).astype('uint8')))
        c = Image.new('RGB', (W, H), (255, 255, 255)); c.paste(im, (dx, dy))
        b = boxes[k]; shifted.append((c, [b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy]))
    # one shared crop with even margins around the widest/tallest view
    X0 = min(b[0] for _, b in shifted); X1 = max(b[2] for _, b in shifted)
    Y0 = min(b[1] for _, b in shifted); Y1 = max(b[3] for _, b in shifted)
    # 16:9 frame (the viewer's shape), symmetric round the centre, ~30% white space round the widest/tallest view
    TY = (Y0 + Y1) / 2   # middle of the car's full up/down extent over the turn
    half = max(TX - X0, X1 - TX) * 1.30
    vh = max(half * 2 * 9 / 16, max(TY - Y0, Y1 - TY) * 2 * 1.35)
    half = max(half, vh * 16 / 9 / 2)
    cx0, cx1 = int(round(TX - half)), int(round(TX + half)); cy0, cy1 = int(round(TY - vh / 2)), int(round(TY + vh / 2))
    CW, CH = cx1 - cx0, cy1 - cy0
    pad = Image.new('RGB', (W + 2 * W, H + 2 * H), (255, 255, 255))   # room for the margin beyond the video frame
    out_boxes = []
    for k, (c, b) in enumerate(shifted):
        big = pad.copy(); big.paste(c, (W, H)); im = big.crop((cx0 + W, cy0 + H, cx1 + W, cy1 + H))
        for w, suf in [(1100, ''), (640, '-s')]:
            im.resize((w, round(CH * w / CW)), Image.LANCZOS).save(f'{a.out}/{a.key}-t{k:02d}{suf}.jpg', quality=84, optimize=True, progressive=True)
        out_boxes.append([round(b[0] - cx0), round(b[1] - cy0), round(b[2] - cx0), round(b[3] - cy0)])
    meta = {'crop': [CW, CH], 'boxes': out_boxes, 'match': {}}
    if a.keys:
        keys = json.load(open(a.keys))
        def thumb(img, box, flip=False):
            x0, y0, x1, y1 = [int(v) for v in box]
            t = Image.fromarray(whiten(img).astype('uint8')).crop((x0, y0, x1, y1)).resize((96, 48))
            return np.array(t.transpose(Image.FLIP_LEFT_RIGHT) if flip else t).astype(float)
        fts = [thumb(np.array(c).astype(float), b) for c, b in shifted]
        S = []
        for path, flip in keys:
            img = np.array(Image.open(path).convert('RGB')).astype(float)
            t = thumb(img, body_box(img), bool(flip))
            S.append([-np.abs(f - t).mean() for f in fts])
        # the key views come round in a fixed order (--order, starting with the start-frame view at frame 0);
        # place them in that order, either spin direction, maximising the total match
        order = [int(x) for x in a.order.split(',')] if a.order else list(range(len(keys)))
        def place(seq):  # dynamic programming: key i at frame f, previous key at least 2 frames earlier
            n = len(seq); NEG = -1e18
            dp = [[NEG] * N for _ in range(n)]; back = [[-1] * N for _ in range(n)]
            dp[0][0] = S[seq[0]][0]
            for i in range(1, n):
                for f in range(2 * i, N):
                    prev = max(range(0, f - 1), key=lambda g: dp[i - 1][g])
                    if dp[i - 1][prev] > NEG: dp[i][f] = dp[i - 1][prev] + S[seq[i]][f]; back[i][f] = prev
            f = max(range(N), key=lambda g: dp[n - 1][g]); total = dp[n - 1][f]; picks = [0] * n
            for i in range(n - 1, -1, -1): picks[i] = f; f = back[i][f]
            return total, dict(zip(seq, picks))
        if stop_idx:
            used = {order[i]: stop_idx[i] for i in range(min(len(order), len(stop_idx)))}
        else:
            s1, u1 = place(order); s2, u2 = place([order[0]] + order[:0:-1])
            used = u1 if s1 >= s2 else u2
        meta['match'] = {str(v): k for k, v in used.items()}
        print('key photo -> frame:', used)
    json.dump(meta, open(f'{a.out}/meta.json', 'w'))
    print('frames', N, 'crop', CW, CH, 'centre drift after fix: 0 (smoothed)', file=sys.stderr)


if __name__ == '__main__':
    main()
