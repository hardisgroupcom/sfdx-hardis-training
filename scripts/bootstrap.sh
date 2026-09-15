#!/usr/bin/env bash
# Seeds one training org. The Training menu in VS Code runs the same thing:
#   Welcome page > Training > Set up one of my training orgs
set -euo pipefail
cd "$(dirname "$0")/.."
exec node scripts/training.mjs seed ${1:+--org "$1"}
