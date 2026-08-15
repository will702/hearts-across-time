#!/usr/bin/env python3
"""Thin OpenRouter image-gen client for Hearts Across Time asset pipeline.

Same API as the generate-image skill script, but with an explicit
--max-tokens budget (default 8000) so capped-credit keys do not fail.

Usage:
  python scripts/gen_image.py "prompt" --output out.png
  python scripts/gen_image.py "edit prompt" --input in.png --output out.png
"""
import argparse, base64, os, sys
from pathlib import Path

MODEL = "google/gemini-3.1-flash-image-preview"
MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".gif": "image/gif", ".webp": "image/webp"}


def find_key() -> str | None:
    if os.environ.get("OPENROUTER_API_KEY"):
        return os.environ["OPENROUTER_API_KEY"]
    d = Path.cwd()
    for p in [d] + list(d.parents):
        f = p / ".env"
        if f.exists():
            for line in f.read_text().splitlines():
                if line.startswith("OPENROUTER_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("prompt")
    ap.add_argument("--input", "-i")
    ap.add_argument("--output", "-o", required=True)
    ap.add_argument("--model", "-m", default=MODEL)
    ap.add_argument("--max-tokens", type=int, default=8000)
    a = ap.parse_args()

    key = find_key()
    if not key:
        print("OPENROUTER_API_KEY not found", file=sys.stderr)
        return 1

    if a.input:
        ext = Path(a.input).suffix.lower()
        b64 = base64.b64encode(Path(a.input).read_bytes()).decode()
        content = [
            {"type": "text", "text": a.prompt},
            {"type": "image_url",
             "image_url": {"url": f"data:{MIME.get(ext, 'image/png')};base64,{b64}"}},
        ]
    else:
        content = a.prompt

    import requests
    r = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={"model": a.model, "max_tokens": a.max_tokens,
              "modalities": ["image", "text"],
              "messages": [{"role": "user", "content": content}]},
        timeout=300,
    )
    if r.status_code != 200:
        print(f"API error {r.status_code}: {r.text[:400]}", file=sys.stderr)
        return 1
    msg = r.json()["choices"][0]["message"]
    images = msg.get("images") or [p for p in (msg.get("content") or [])
                                   if isinstance(p, dict) and p.get("type") == "image"]
    if not images:
        print(f"no image in response: {str(msg)[:400]}", file=sys.stderr)
        return 1
    url = images[0].get("image_url", {}).get("url", "")
    if not url.startswith("data:"):
        print("unexpected image payload", file=sys.stderr)
        return 1
    data = base64.b64decode(url.split(",", 1)[1])
    Path(a.output).parent.mkdir(parents=True, exist_ok=True)
    Path(a.output).write_bytes(data)
    print(f"saved {a.output} ({len(data)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
