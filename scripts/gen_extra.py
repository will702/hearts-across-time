#!/usr/bin/env python3
"""Generate painted foreground occluder layers + key-moment character poses.

Usage:
  python scripts/gen_extra.py fg     # 5 strip occluder -> assets/gen/fg/bg<era>_fg.png
  python scripts/gen_extra.py poses  # 3 pose singlets  -> assets/gen/poses/pose_*.png
Output mentah magenta; diproses build_extra.py. Sekuensial retry+backoff."""
import subprocess, sys, time
from pathlib import Path

GEN = Path(__file__).with_name("gen_image.py")

STYLE = ("Hand-drawn watercolor comic art, storybook style: sketchy graphite pencil outlines with "
         "wobbly varied weight, soft translucent watercolor washes, muted desaturated palette, "
         "melancholic mood. Solid flat magenta #FF00FF background everywhere the object is not. "
         "No text, no watermark.")

FG_STYLE = ("Near-camera foreground occluder strip for a 2D side-scroller, dark silhouette-style "
            "shapes with a faint warm edge light, occupying ONLY the bottom third of a wide frame; "
            "everything above is flat magenta. No people, no animals. " + STYLE)

FGS = {
  "bg2088_fg": FG_STYLE + "Broken jagged concrete slabs and bent rusty rebar rods silhouetted at the "
               "bottom edge, cracked and tilted in both directions, dusty ash-brown darkness.",
  "bg1944_fg": FG_STYLE + "Low mounds of dark churned earth with coiled barbed wire spirals and a "
               "few snapped wooden stakes, trench lip silhouettes along the bottom edge, umber-black.",
  "bg1968A_fg": FG_STYLE + "Dark shadows of stacked crates and a shelf corner at the very bottom "
                "edge, one short chain dropping into the frame from the top edge on the right side, "
                "warm black-brown darkness.",
  "bg1968B_fg": FG_STYLE + "Thick dark industrial pipes running along the bottom edge with valve "
                "wheels and flanges, cool near-black blue-grey silhouettes.",
  "bg1999_fg": FG_STYLE + "Heavy dark machinery bases and thick cable bundles along the bottom "
               "edge, one pillar base at the left, deep near-black midnight blue silhouettes with "
               "a faint cyan edge glow.",
}

POSE_STYLE = ("Full-body chibi character painting (big head, small body, about 1:3 proportions), "
              "T-pose-free, seen from the side profile, feet planted at the bottom edge. " + STYLE)

POSES = {
  # (file, prompt, input reference path or None)
  "pose_elena_hold": (POSE_STYLE + "The same young woman character from the reference image "
                      "(ash-blonde half-up hair, white lab coat over dusty-rose dress, pale boots "
                      "with dark straps): she kneels slightly forward, both her small hands extended "
                      "gently as if tenderly holding someone's trembling hand, soft warm worried "
                      "expression. Only her, no other character.",
                      "assets/gen/cells/elena_neutral.png"),
  "pose_elena_kneel": (POSE_STYLE + "The same young woman character from the reference image "
                       "(ash-blonde half-up hair, white lab coat over dusty-rose dress, pale boots): "
                       "kneeling on one knee on the ground, head gently bowed, clutching a small "
                       "glowing green glass vial to her chest, bittersweet serene expression.",
                       "assets/gen/cells/elena_neutral.png"),
  "pose_arthur_tua_reach": (POSE_STYLE + "The same elderly man character from the reference image "
                            "(grey hair, beige cardigan, old trousers, wooden cane): reaching out one "
                            "trembling hand upward and forward as if toward a glowing tube just "
                            "outside the frame, leaning heavily on his cane with the other hand, "
                            "yearning expression.",
                            "assets/gen/cells/arthur_tua_neutral.png"),
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
    mode = sys.argv[1] if len(sys.argv) > 1 else "fg"
    ok = True
    if mode == "fg":
        Path("assets/gen/fg").mkdir(parents=True, exist_ok=True)
        for bid, prompt in FGS.items():
            out = f"assets/gen/fg/{bid}.png"
            print(f"== {bid}", flush=True)
            ok &= run([sys.executable, str(GEN), "--max-tokens", "8000", prompt, "-o", out])
            time.sleep(0.5)
    elif mode == "poses":
        Path("assets/gen/poses").mkdir(parents=True, exist_ok=True)
        for pid, (prompt, inp) in POSES.items():
            out = f"assets/gen/poses/{pid}.png"
            print(f"== {pid}", flush=True)
            ok &= run([sys.executable, str(GEN), "--max-tokens", "8000", prompt,
                       "--input", inp, "-o", out])
            time.sleep(0.5)
    else:
        print("usage: gen_extra.py fg|poses", file=sys.stderr)
        return 2
    print(f"done {mode} ok={ok}")
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main())
