#!/usr/bin/env bash
set -euo pipefail
# Rode em um Pod RunPod com PyTorch/CUDA e GPU NVIDIA; copie o ComfyUI-master.zip antes.
ROOT="${ROOT:-/workspace}"
ZIP="${COMFYUI_ZIP:-$ROOT/ComfyUI-master.zip}"
if [[ ! -f "$ZIP" ]]; then echo "Arquivo ausente: $ZIP" >&2; exit 1; fi
mkdir -p "$ROOT"
unzip -q -o "$ZIP" -d "$ROOT"
cd "$ROOT/ComfyUI-master"
python -m pip install -r requirements.txt
python -m pip install -r "$ROOT/veox-worker/requirements.txt"
echo "ComfyUI preparado. Copie legalmente o checkpoint SDXL para $ROOT/ComfyUI-master/models/checkpoints/"
echo "Depois execute: python main.py --listen 127.0.0.1 --port 8188"
echo "Em outro terminal: cd $ROOT/veox-worker && python worker.py"
