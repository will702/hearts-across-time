#!/usr/bin/env python3
"""Compose final character sheets into assets/art/characters/<char>_sheet.png and QC montages.

Usage: compose_all.py            (all 5 characters)
"""
import subprocess, sys
from pathlib import Path

from PIL import Image, ImageDraw

EXPRS = ["neutral", "smile", "sad", "shock", "angry", "mad", "warm", "happy"]
CHARS = ["elena", "arthur_muda", "arthur_dewasa", "arthur_buron", "arthur_tua"]
BS = Path(__file__).with_name("build_sheets.py")
CELL = Path("assets/gen/cells")


# Base art facing: elena faces RIGHT (engine draws her unmirrored when walking right);
# all arthurs face LEFT (engine mirrors them onto the right-hand side of dialogs -> sheets must face RIGHT).
FLIP = {"elena": [], "arthur_muda": ["--flip"], "arthur_dewasa": ["--flip"],
        "arthur_buron": ["--flip"], "arthur_tua": ["--flip"]}


def cell_for(char, expr):
    src = "assets/gen/%s_base.png" % char if expr == "neutral" else f"assets/gen/{char}_{expr}.png"
    out = CELL / f"{char}_{expr}.png"
    subprocess.run([sys.executable, str(BS), "cell", src, str(out), "--h", "192"] + FLIP[char], check=True)
    return str(out)


def main():
    CELL.mkdir(parents=True, exist_ok=True)
    for char in CHARS:
        rows = []
        for expr in EXPRS:
            p = cell_for(char, expr)
            if char == "elena" and expr == "neutral":
                ws = []
                for i in (1, 2, 3):
                    out = CELL / f"elena_walk{i}.png"
                    subprocess.run([sys.executable, str(BS), "cell", f"assets/gen/elena_walk{i}.png",
                                    str(out), "--h", "192"] + FLIP[char], check=True)
                    ws.append(str(out))
                rows.append([p] + ws)
            else:
                rows.append([p, p, p, p])
        spec = CELL / f"{char}_spec.json"
        spec.write_text(__import__("json").dumps({"rows": rows}))
        subprocess.run([sys.executable, str(BS), "compose", str(spec), f"assets/art/characters/{char}_sheet.png"], check=True)
        # QC montage: sheet on checkerboard + labels
        sheet = Image.open(f"assets/art/characters/{char}_sheet.png").convert("RGBA")
        bg = Image.new("RGBA", (sheet.width * 2, sheet.height * 2), (64, 64, 72, 255))
        big = sheet.resize((sheet.width * 2, sheet.height * 2), Image.LANCZOS)
        d = ImageDraw.Draw(bg)
        for y in range(0, bg.height, 20):
            for x in range(0, bg.width, 20):
                if (x // 20 + y // 20) % 2 == 0:
                    d.rectangle([x, y, x + 19, y + 19], fill=(86, 86, 98, 255))
        bg.alpha_composite(big)
        for i, e in enumerate(EXPRS):
            d.text((6, i * 420 + 6), e, fill=(255, 255, 0, 255))
        bg.convert("RGB").save(f"assets/gen/{char}_sheet_qc.png")
        print(f"qc assets/gen/{char}_sheet_qc.png")
    print("all sheets composed")


if __name__ == "__main__":
    main()
