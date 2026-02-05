import asyncio
from time import time

from app.core.config import settings

try:
    from redis.asyncio import Redis
except Exception:  # pragma: no cover
    Redis = None  # type: ignore[assignment]


class RateLimiter:
    def __init__(self) -> None:
        self._state: dict[str, tuple[int, float]] = {}
        self._lock = asyncio.Lock()
        self._hits = 0
        self._redis: Redis | None = None
        self._redis_checked = False

    async def _redis_client(self) -> Redis | None:
        if self._redis_checked:
            return self._redis
        self._redis_checked = True
        if not settings.redis_url or Redis is None:
            return None
        try:
            client = Redis.from_url(settings.redis_url, decode_responses=True)
            await client.ping()
            self._redis = client
        except Exception:
            self._redis = None
        return self._redis

    async def _hit_redis(self, key: str, limit: int, window_seconds: int) -> bool:
        client = await self._redis_client()
        if client is None:
            return False
        bucket = f"rl:{key}"
        try:
            count = await client.incr(bucket)
            if count == 1:
                await client.expire(bucket, window_seconds)
            return count > limit
        except Exception:
            return False

    async def _hit_memory(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time()
        async with self._lock:
            count, start = self._state.get(key, (0, now))
            if now - start >= window_seconds:
                count, start = 0, now
            count += 1
            self._state[key] = (count, start)
            self._hits += 1
            # Opportunistic cleanup to keep memory bounded.
            if self._hits % 1000 == 0:
                cutoff = now - window_seconds
                self._state = {
                    k: v for k, v in self._state.items() if v[0] > 0 and v[1] >= cutoff
                }
            return count > limit

    async def is_limited(self, key: str, limit: int, window_seconds: int = 60) -> bool:
        if limit <= 0:
            return False
        limited = await self._hit_redis(key, limit, window_seconds)
        if limited:
            return True
        return await self._hit_memory(key, limit, window_seconds)

    async def close(self) -> None:
        if self._redis is not None:
            await self._redis.aclose()
        self._redis = None
        self._redis_checked = False

    async def reset_for_tests(self) -> None:
        async with self._lock:
            self._state.clear()
            self._hits = 0


rate_limiter = RateLimiter()
