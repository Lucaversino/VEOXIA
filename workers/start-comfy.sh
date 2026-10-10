#!/usr/bin/env bash
set -euo pipefail
cd "${COMFYUI_DIR:-/workspace/ComfyUI-master}"
exec python main.py --listen 127.0.0.1 --port 8188
