#!/usr/bin/env python3
"""Generate animated prop sprite strips for Hearts Across Time.

One image per prop = horizontal strip of 3 side-by-side animation frames
on a flat magenta background (chroma-keyed later by build_props.py).
Usage:
  python scripts/gen_props.py            # all props
  python scripts/gen_props.py flag1944 barrel2088   # subset
Sequential with retry + backoff (same pattern as gen_bgs.py)."""
import subprocess, sys, time
from pathlib import Path

GEN = Path(__file__).with_name("gen_image.py")

STYLE = ("Hand-drawn watercolor comic art, storybook style: sketchy graphite pencil outlines with "
         "wobbly varied weight, soft translucent watercolor washes, muted desaturated palette, "
         "melancholic mood. Solid flat magenta #FF00FF background everywhere the object is not. "
         "No text, no watermark, no people.")

STRIP = ("A horizontal sprite strip of EXACTLY 3 SIDE-BY-SIDE animation frames of the SAME single "
         "object: frame 1, frame 2, frame 3 shown as a looping cycle. Same object, same size, same "
         "anchor position in all three frames, only the animated parts change between frames. "
         "Frames evenly spaced, one object centered in each equal third of the image. "
         "Wide 3:1 layout. Nothing else in the image.")

PROPS = {
  # —— pilot ——
  "flag1944": f"{STYLE} {STRIP} A tattered WW2 battlefield flag: plain dark crimson-brown cloth, "
              "no emblem, on a leaning splintered wooden pole planted at the bottom edge. The cloth "
              "rips and flutters in the wind; between the 3 frames only the cloth ripple changes "
              "(billowing left / mid-sway / snapping right). Pole never moves.",
  "barrel2088": f"{STYLE} {STRIP} A rusty dented metal barrel standing on the bottom edge, filled "
                "with glowing orange embers; small flames and one wisp of smoke rise from inside. "
                "Between the 3 frames only the flame shape and height change (low / medium / high). "
                "The barrel never moves.",
  # —— batch 2 ——
  "lantern1944": f"{STYLE} {STRIP} A WW2 trench lantern: dark metal cage with warm amber glass "
                 "panels, hanging at the bottom of a short cord from the top of its frame, sitting "
                 "on the ground. Between the 3 frames only the inner flame glow changes "
                 "(dim / bright / medium).",
  "beacon1968B": f"{STYLE} {STRIP} A small red rotating warning light on a grey metal wall bracket, "
                 "cold-war military lab prop. Between the 3 frames only the red glow changes "
                 "(off / half glow / full glow with a soft halo). Bracket never moves. Cool grey "
                 "steel palette with a warm red accent.",
  "steam1968B": f"{STYLE} {STRIP} The flanged end of a thick grey-blue industrial pipe with a valve "
                "wheel, leaking a puff of white steam sideways. Between the 3 frames only the steam "
                "cloud changes (small wisp / growing puff / wide dissipating cloud). Pipe stays put.",
  "bulb1968A": f"{STYLE} {STRIP} A bare incandescent bulb on a long black cord hanging straight "
               "down, lit with a warm amber glow and a thin metal shade on top. Between the 3 frames "
               "only the bulb's swing angle changes slightly (left / center / right) and the glow "
               "flickers subtly.",
  "radio1968A": f"{STYLE} {STRIP} A 1960s wooden tabletop radio with a speaker grille and a small "
                "amber tuning dial window, sitting on the bottom edge. Between the 3 frames only "
                "the dial glow changes (dark / soft amber / bright amber). Body never moves.",
  "consoleWave1999": f"{STYLE} {STRIP} A small boxy CRT oscilloscope monitor on a swivel base, dark "
                     "blue-grey casing, screen showing a single thin cyan waveform line. Between the "
                     "3 frames only the waveform shape changes (flat / sine pulse / spike). Cold "
                     "midnight-blue palette with faint cyan glow.",
  "poster2088": f"{STYLE} {STRIP} A tattered old paper poster (blank, no readable text) pasted on an "
                "invisible wall, bottom corners peeling and flapping in the wind. Between the 3 "
                "frames only the curl of the peeling corners changes (slight / lifted / flapping). "
                "Sepia aged-paper palette.",
}


def run(args, tries=3):
    for i in range(tries):
        p = subprocess.run(args, capture_output=True, text=True)
        if p.returncode == 0 and Path(args[-1]).exists():
            return True
        print(p.stdout.strip() or p.stderr.strip(), file=sys.stderr)
        time.sleep(3 * (i + 1))
    return False


def main() -> int:
    want = sys.argv[1:] or list(PROPS)
    ok = True
    for pid in want:
        out = f"assets/gen/props/{pid}.png"
        Path("assets/gen/props").mkdir(parents=True, exist_ok=True)
        print(f"== {pid}", flush=True)
        ok &= run([sys.executable, str(GEN), "--max-tokens", "8000", PROPS[pid], "-o", out])
        time.sleep(0.5)
    print(f"done props ok={ok}")
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main())
