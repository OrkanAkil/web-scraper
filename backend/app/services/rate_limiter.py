import asyncio
from collections import defaultdict
from datetime import datetime, timedelta


class RateLimiter:
    """Per-domain rate limiter to avoid overwhelming target servers."""

    def __init__(self):
        self._last_request: dict[str, float] = defaultdict(float)
        self._locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

    async def wait(self, domain: str, delay_ms: int = 1000):
        async with self._locks[domain]:
            now = asyncio.get_event_loop().time()
            last = self._last_request[domain]
            delay_seconds = delay_ms / 1000.0
            elapsed = now - last

            if elapsed < delay_seconds:
                wait_time = delay_seconds - elapsed
                await asyncio.sleep(wait_time)

            self._last_request[domain] = asyncio.get_event_loop().time()

    def reset(self, domain: str = None):
        if domain:
            self._last_request.pop(domain, None)
            self._locks.pop(domain, None)
        else:
            self._last_request.clear()
            self._locks.clear()


rate_limiter = RateLimiter()
