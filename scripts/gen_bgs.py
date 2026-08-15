#!/usr/bin/env python3
"""Generate the 11 parallax background layers for Hearts Across Time.

Each lands in assets/gen/bg/<id>.png (raw, magenta sky, unprocessed).
Sequential with retry + backoff."""
import subprocess, sys, time
from pathlib import Path

GEN = Path(__file__).with_name("gen_image.py")

STYLE = ("Hand-drawn watercolor comic background art, storybook style: sketchy graphite pencil "
         "outlines with wobbly varied weight, soft translucent watercolor washes, subtle paper grain, "
         "muted desaturated palette, melancholic mood. Wide panoramic composition (about 3:1). "
         "No people, no characters, no text, no watermark. Everything not part of the scenery itself "
         "(sky, empty space) is one solid flat magenta #FF00FF. Keep the far left and right edges "
         "simple and uncluttered so the image can tile horizontally.")

BGS = {
    # 2088 — ruined future city (sepia ash + crimson haze)
    "bg2088_far": f"{STYLE}. Distant ruined city skyline silhouettes for a 2D side-scroller far parallax layer: "
                  "row of collapsed skyscrapers and broken tower shapes fading into sepia haze, ash-grey beige tones, "
                  "one hazy pale crimson glow on the horizon. Skyline occupies only the lower half of the frame.",
    "bg2088_mid": f"{STYLE}. Mid-ground ruined city ruins closer view: jagged broken building shells with empty dark "
                  "windows, collapsed concrete slabs, a leaning telephone pole, burnt umber and taupe tones. "
                  "Ruins occupy the lower two thirds, sky stays magenta.",
    "bg2088_near": f"{STYLE}. Foreground rubble ground strip for near parallax layer: dark warm-brown mounds of debris, "
                   "broken wooden beams sticking out at angles, scattered bricks, one leaning pole, dusty ash texture. "
                   "A continuous horizontal strip filling only the bottom third of the frame; everything above it is magenta.",
    # 1944 — WWII trench
    "bg1944_far": f"{STYLE}. Torn battlefield horizon for far parallax: shattered bare trees, splintered trunks, a distant "
                  "ruined chapel, thin smoke columns rising, dark reddish-brown silhouettes against magenta sky. "
                  "Horizon sits in the lower half.",
    "bg1944_mid": f"{STYLE}. WWI/WWII trench parapet mid layer: continuous wall of stacked sandbags, coiled barbed wire on "
                  "wooden posts above, duckboard planks, dark churned earth, muddy burnt-sienna and umber tones. "
                  "The sandbag wall fills the lower two thirds; above it only magenta.",
    # 1968 A — hideout bunker (warm dark browns)
    "bg1968A_far": f"{STYLE}. Damp underground bunker hideout far wall: stained concrete block wall with darker seams, one "
                   "small window boarded up with crooked wooden planks, thin pipes along the wall, dark umber brown tones. "
                   "Wall fills the frame edge to edge, magenta only behind nothing.",
    "bg1968A_mid": f"{STYLE}. Bunker hideout props mid layer arranged along the floor line: wooden crates stacked, an oil "
                   "drum, a coiled rope, one bare bulb hanging on a cord from above with a little metal shade, satchel bag "
                   "leaning on a crate, warm dark-brown palette. Props sit on the bottom edge, magenta behind and above.",
    # 1968 B — military lab (cold steel blue-grey)
    "bg1968B_far": f"{STYLE}. Cold military laboratory far wall: tall riveted steel panels with vertical seams, overhead "
                   "pipes and conduits running along the top, small red warning beacons, cool desaturated blue-grey palette. "
                   "Wall fills the frame edge to edge.",
    "bg1968B_mid": f"{STYLE}. Row of 1960s mainframe computer cabinets along the floor line: tall grey-blue cabinets with "
                   "reel-to-reel tape circles and tiny square indicator dots, cables on the floor, cool steel palette with "
                   "small amber and green lights. Cabinets sit on the bottom edge, magenta behind and above.",
    # 1999 — cryo chamber (midnight blue)
    "bg1999_far": f"{STYLE}. Cryogenic laboratory far wall at night: tall dark wall panels with thin glowing cyan seams, a "
                  "large dim observation window band, deep midnight blue palette with faint cyan glow. Wall fills the frame.",
    "bg1999_mid": f"{STYLE}. Cryogenic capsule pod side view standing on the floor line: one large vertical glass containment "
                  "tube on a heavy dark metal base, thick cables looping from its top, frost at its foot, deep midnight blue "
                  "and cyan glow palette. Pod is centered-left, magenta behind and around it.",
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
    ok = True
    for bid, prompt in BGS.items():
        out = f"assets/gen/bg/{bid}.png"
        print(f"== {bid}", flush=True)
        ok &= run([sys.executable, str(GEN), "--max-tokens", "8000", prompt, "-o", out])
        time.sleep(0.5)
    print(f"done bgs ok={ok}")
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main())
