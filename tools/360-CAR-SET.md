# 360 car set (the recipe)

When James says **"360 car set"**, do every remaining car in the finder exactly like the BMW M2 (G87),
which is the approved standard (live as `360/m2/v10-*`, built 22-23 Nov 2026).

**Only start once James confirms the client has paid.** It needs about 2,000-2,400 Higgsfield credits.

## The set: 22 cars (1 done, 21 to go)

| Done | Car | Finder key |
|---|---|---|
| yes | BMW M2 (G87) | m2g87 |
| | BMW M2 (F87) | m2f87 |
| | BMW M3 (G80) | m3g80 |
| | BMW M4 (G82) | m4g82 |
| | Toyota GR86 (ZN8) | gr86 |
| | Toyota 86 (ZN6) | zn6 |
| | Toyota GR Supra (A90) | supra |
| | Subaru BRZ (ZD8) | brz |
| | Subaru WRX (VB) | wrxvb |
| | Tesla Model 3 | model3 |
| | Tesla Model Y | modely |
| | Kia EV6 | ev6 |
| | Kia Stinger | stinger |
| | VW Golf R (Mk7/7.5) | golfr7 |
| | VW Golf GTI (Mk8) | gti8 |
| | Audi RS3 (8Y) | rs3 |
| | Audi S3 (8Y) | s3 |
| | Ford Focus RS (Mk3) | focusrs |
| | Nissan GT-R (R35) | gtr |
| | Nissan 370Z | z370 |
| | Honda Civic Type R (FL5) | ctr |
| | Mercedes-AMG A45 S | a45 |

## Rules (from James)

- iilumo only: no ADRO, Zero Offset, Maxton or Zaero branding, plates, decals or dealer details. Everything is iilumolab's own.
- No front plate. Rear plate = matte black plate with the grey iilumo cube (reference: the M2 rear still, Higgsfield job `3b6d1c39-7163-4925-8435-14521b845b22`).
- Same look as the M2: pure white studio, soft shadow, crisp photoreal render, the car's own colour.
- Same quality: 2K upscale, 48 frames, arrow stops on the exact straight front/side/rear views, car centred, turns on the spot (no sliding, no bobbing), 1600 px computer / 640 px phone frames.
- Check the audit: the old "golfr7" photos are really a GTI and "gti8" are really a Golf R. Render the right car.

## Steps per car (about 90-95 credits)

1. **Start image** (3-7 credits): a clean three-quarter front studio render of the car (FLUX 3 or GPT Image 2, 2K), iilumo look, no front plate. Pad it onto a **21:9** white canvas at its natural size (do NOT shrink the car: a small car made Seedance zoom in and stop at 3/4 of a turn).
2. **Rear still** (3 credits): the car from behind with the iilumo rear plate (edit with the plate reference), used as a reference image.
3. **Turntable** (70 credits): Seedance 2.5, `omni_reference`, 10 s, 720p, **aspect 21:9**, no audio. start_image = end_image = the padded start image; image_references = a front view, a side view, the rear still. Prompt: the M2 prompt (exactly one full 360 orbit, clockwise, constant speed/height/distance, never zooms, car always fully in frame and centred, white studio, iilumo rear plate, no front plate).
4. **Check** the video: full loop back to the start, never touches the frame edge, steady size. If not, re-render (70).
5. **Upscale** (about 17 credits): `upscale_video`, provider bytedance, preset `aigc`, 2k, 24 fps, source 1470x630.
6. **Frames**: `FFMPEG=<imageio-ffmpeg binary> python3 tools/turntable.py <2k.mp4> <out> <key> --stops [--keys keys.json --order ...]`
   (finds the exact straight views, puts the 8 stops on them, pins the car's spin point, cleans floor marks, writes meta.json).
   Leave `--level` off unless the camera leans over ~1 degree.
7. **Site**: copy frames as `360/<key>/v1-tNN.jpg` (+ `-s`) to the design site and `cx-360-<key>-v1-*` to the theme, then
   `python3 tools/turntable_js.py <out>/meta.json <CONST>_TURN <key> <KEYVIEW> v1 main.js ../iilumolab-theme/assets/concept.js`
   and point that car's VIEWS entry at the new const. Bump the version name on every re-render (cache).
8. Push the theme (draft #168316534946 only), redeploy the design site, check in the browser: centred stops, no wobble.
