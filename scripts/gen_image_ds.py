#!/usr/bin/env python3
"""Alibaba Cloud Model Studio (DashScope) text-to-image client for the asset pipeline.

Mirror of gen_image.py but backed by WanX via the DashScope async task API.
Reads DASHSCOPE_API_KEY from env or the nearest .env (same convention as gen_image.py).

Usage:
  python scripts/gen_image_ds.py "prompt" -o out.png [--size 1280*720] [--negative "..."]
"""
import argparse, os, sys, time
from pathlib import Path

BASE = "https://dashscope-intl.aliyuncs.com"
MODEL = "wan2.1-t2i-turbo"


def find_key() -> str | None:
    if os.environ.get("DASHSCOPE_API_KEY"):
        return os.environ["DASHSCOPE_API_KEY"]
    d = Path.cwd()
    for p in [d] + list(d.parents):
        f = p / ".env"
        if f.exists():
            for line in f.read_text().splitlines():
                if line.startswith("DASHSCOPE_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("prompt")
    ap.add_argument("--output", "-o", required=True)
    ap.add_argument("--model", "-m", default=MODEL)
    ap.add_argument("--size", default="1280*720", help="WanX size WxH, e.g. 1280*720")
    ap.add_argument("--negative", default="")
    ap.add_argument("--timeout", type=int, default=300)
    a = ap.parse_args()

    key = find_key()
    if not key:
        print("DASHSCOPE_API_KEY not found", file=sys.stderr)
        return 1

    import requests
    h = {"Authorization": f"Bearer {key}", "Content-Type": "application/json",
         "X-DashScope-Async": "enable"}
    body = {"model": a.model,
            "input": {"prompt": a.prompt},
            "parameters": {"size": a.size, "n": 1}}
    if a.negative:
        body["input"]["negative_prompt"] = a.negative
    r = requests.post(f"{BASE}/api/v1/services/aigc/text2image/image-synthesis",
                      headers=h, json=body, timeout=60)
    if r.status_code != 200:
        print(f"submit failed HTTP {r.status_code}: {r.text[:400]}", file=sys.stderr)
        return 1
    task = r.json().get("output", {})
    tid = task.get("task_id")
    if not tid:
        print(f"no task_id: {r.text[:400]}", file=sys.stderr)
        return 1
    print(f"task {tid} submitted", flush=True)

    deadline = time.time() + a.timeout
    url = None
    while time.time() < deadline:
        time.sleep(5)
        s = requests.get(f"{BASE}/api/v1/tasks/{tid}", headers=h, timeout=60).json()
        out = s.get("output", {})
        stt = out.get("task_status")
        if stt == "SUCCEEDED":
            res = out.get("results") or []
            url = res[0].get("url") if res else None
            break
        if stt in ("FAILED", "CANCELED", "UNKNOWN"):
            print(f"task {stt}: {s}", file=sys.stderr)
            return 1
        print(f"  status {stt}...", flush=True)
    if not url:
        print("no image url before timeout", file=sys.stderr)
        return 1

    img = requests.get(url, timeout=120).content
    Path(a.output).parent.mkdir(parents=True, exist_ok=True)
    Path(a.output).write_bytes(img)
    from PIL import Image
    im = Image.open(a.output)
    print(f"saved {a.output} {im.size} {im.mode}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
