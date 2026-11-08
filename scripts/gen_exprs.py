#!/usr/bin/env python3
"""Generate expression + walk edit variants for one character.

Usage: gen_exprs.py <char> [--walk]
Reads assets/gen/<char>_base.png, writes assets/gen/<char>_<expr>.png
(and <char>_walk{1,2,3}.png when --walk).
Sequential with one retry per variant.<|close|>"""
import argparse, subprocess, sys, time
from pathlib import Path

EXPRS = {
    "smile": "a gentle closed-lip smile, softly lifted cheeks, content relaxed eyes",
    "sad": "sorrowful: eyebrows slanted upward, glossy teary eyes, small trembling frown",
    "shock": "shocked gasp: wide round eyes, raised eyebrows, small open mouth",
    "angry": "angry pout: eyebrows furrowed slanting down toward center, small frown, puffed cheeks",
    "mad": "furious unhinged rage: intense wide glaring eyes, deep furrowed brows, jagged gritted-teeth scowl",
    "warm": "tender loving warmth: soft half-lidded warm eyes, gentle affectionate smile, strong pink blush on both cheeks",
    "happy": "joyful laughing: closed crescent-shaped happy eyes, open cheerful smile, rosy cheeks",
}
WALKS = {
    "walk1": "mid-stride walking pose: left leg stepping forward, right leg trailing back",
    "walk2": "passing pose: legs together under body, weight balanced",
    "walk3": "mid-stride walking pose: right leg stepping forward, left leg trailing back",
}
GEN = Path(__file__).with_name("gen_image.py")


def run(args, tries=2):
    for i in range(tries):
        p = subprocess.run(args, capture_output=True, text=True)
        if p.returncode == 0 and Path(args[-1]).exists():
            return True
        print(p.stdout.strip() or p.stderr.strip(), file=sys.stderr)
        time.sleep(2)
    return False


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("char")
    ap.add_argument("--walk", action="store_true")
    a = ap.parse_args()
    char = a.char
    base = f"assets/gen/{char}_base.png"
    ok = True
    for name, desc in EXPRS.items():
        out = f"assets/gen/{char}_{name}.png"
        print(f"== {char} {name}", flush=True)
        prompt = (f"Edit ONLY the facial expression: {desc}. Keep the character's identity, "
                  f"hairstyle, hat or helmet if any, outfit, body pose, colors, background color "
                  f"and watercolor art style exactly identical. Same framing, full body, magenta background.")
        ok &= run([sys.executable, str(GEN), prompt, "-i", base, "-o", out])
        time.sleep(0.5)
    if a.walk:
        for name, desc in WALKS.items():
            out = f"assets/gen/{char}_{name}.png"
            print(f"== {char} {name}", flush=True)
            prompt = (f"Edit ONLY the body pose: {desc}, as if walking to the left. Keep the same calm "
                      f"neutral face, identity, outfit, hair, colors, background color and watercolor style "
                      f"exactly identical. Full body visible, magenta background.")
            ok &= run([sys.executable, str(GEN), prompt, "-i", base, "-o", out])
            time.sleep(0.5)
    print(f"done {char} ok={ok}")
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main())
