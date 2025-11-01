from __future__ import annotations

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

# Ensure `app` package is importable when tests run from repository root.
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
