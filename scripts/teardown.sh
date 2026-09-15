#!/usr/bin/env bash
# Removes the Helios app and its data from one training org.
set -euo pipefail
cd "$(dirname "$0")/.."
exec node scripts/training.mjs teardown ${1:+--org "$1"}
