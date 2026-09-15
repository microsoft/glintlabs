"""Small, dependency-free progress reporting for survey generation scripts."""

from __future__ import annotations

import sys
import time
from dataclasses import dataclass, field
from typing import TextIO


@dataclass
class ProgressReporter:
    start: int = 0
    end: int = 100
    enabled: bool = True
    stream: TextIO = sys.stderr
    width: int = 24
    started_at: float = field(default_factory=time.monotonic)

    def update(self, percent: float, message: str) -> None:
        if not self.enabled:
            return
        local = max(0.0, min(100.0, percent))
        mapped = round(self.start + (self.end - self.start) * local / 100)
        filled = round(self.width * mapped / 100)
        bar = "#" * filled + "-" * (self.width - filled)
        elapsed = int(time.monotonic() - self.started_at)
        minutes, seconds = divmod(elapsed, 60)
        print(
            f"[{bar}] {mapped:3d}%  {message}  ({minutes:02d}:{seconds:02d})",
            file=self.stream,
            flush=True,
        )
