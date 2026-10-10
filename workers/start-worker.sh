#!/usr/bin/env bash
set -euo pipefail
cd "${VEOX_WORKER_DIR:-/workspace/veox-worker}"
set -a
source .env
set +a
exec python -u worker.py
