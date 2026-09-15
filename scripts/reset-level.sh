#!/usr/bin/env bash
# Puts the repository back to the start state of a level.
set -euo pipefail
cd "$(dirname "$0")/.."
exec node scripts/training.mjs reset ${1:+--level "$1"}
