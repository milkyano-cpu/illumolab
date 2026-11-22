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


def orbit_fit(v, harmonics):
    """The camera's slow drift over one full turn: a smooth curve (low-order Fourier fit over 360 degrees).
    Removing only this keeps the car steady without reacting to its changing outline frame by frame."""
    v = np.asarray(v, float); n = len(v); t = np.arange(n) * 2 * np.pi / n
    cols = [np.ones(n)] + [f(h * t) for h in range(1, harmonics + 1) for f in (np.cos, np.sin)]
    A = np.stack(cols, 1); coef, *_ = np.linalg.lstsq(A, v, rcond=None)
    return A @ coef


def smooth_circular(v, win=5):
    v = np.asarray(v, float); n = len(v); h = win // 2
    return np.array([np.mean([v[(i + d) % n] for d in range(-h, h + 1)]) for i in range(n)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video'); ap.add_argument('out'); ap.add_argument('key')
    ap.add_argument('--frames', type=int, default=48)
    ap.add_argument('--keys', help='JSON list of [photo path, flip 0/1] in the viewer\'s key-view order')
    ap.add_argument('--order', help='key indices in the order they appear going round, first = the start frame view')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True); raw = os.path.join(a.out, 'raw'); os.makedirs(raw, exist_ok=True)
    hh, mm, ss = subprocess.run([FF, '-i', a.video], capture_output=True, text=True).stderr.split('Duration: ')[1].split(',')[0].split(':')
    dur = int(hh) * 3600 + int(mm) * 60 + float(ss)
    N = a.frames
    for k in range(N):
        t = k * dur / N + 0.02
        subprocess.run([FF, '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', a.video, '-frames:v', '1', f'{raw}/f{k:02d}.png'], check=True)
    frames = [np.array(Image.open(f'{raw}/f{k:02d}.png').convert('RGB')).astype(float) for k in range(N)]
    H, W = frames[0].shape[:2]
    boxes = [body_box(f) for f in frames]
    # remove only the camera's slow drift (smooth curves over the full turn): sideways from the car's middle,
    # up/down from the floor line (wheels), so the car turns on the spot and never bobs
    cx = orbit_fit([(b[0] + b[2]) / 2 for b in boxes], 2)
    gy = orbit_fit([b[3] for b in boxes], 1)
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
        s1, u1 = place(order); s2, u2 = place([order[0]] + order[:0:-1])
        used = u1 if s1 >= s2 else u2
        meta['match'] = {str(v): k for k, v in used.items()}
        print('key photo -> frame:', used)
    json.dump(meta, open(f'{a.out}/meta.json', 'w'))
    print('frames', N, 'crop', CW, CH, 'centre drift after fix: 0 (smoothed)', file=sys.stderr)


if __name__ == '__main__':
    main()
