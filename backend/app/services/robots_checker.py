import httpx
from urllib.parse import urlparse, urljoin
from typing import Optional


class RobotsChecker:
    """Checks robots.txt for a given URL to determine if scraping is allowed."""

    def __init__(self):
        self._cache: dict[str, Optional[str]] = {}

    async def fetch_robots_txt(self, url: str) -> Optional[str]:
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"

        if robots_url in self._cache:
            return self._cache[robots_url]

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(robots_url, follow_redirects=True)
                if response.status_code == 200:
                    content = response.text
                    self._cache[robots_url] = content
                    return content
                else:
                    self._cache[robots_url] = None
                    return None
        except Exception:
            self._cache[robots_url] = None
            return None

    def is_allowed(self, robots_txt: Optional[str], url: str, user_agent: str = "*") -> bool:
        if robots_txt is None:
            return True

        parsed = urlparse(url)
        path = parsed.path or "/"

        lines = robots_txt.strip().split("\n")
        current_agent = None
        rules = []

        for line in lines:
            line = line.strip()
            if not line or line.startswith("#"):
                continue

            if line.lower().startswith("user-agent:"):
                agent = line.split(":", 1)[1].strip()
                current_agent = agent
            elif line.lower().startswith("disallow:") and current_agent in ("*", user_agent):
                disallow_path = line.split(":", 1)[1].strip()
                if disallow_path:
                    rules.append(("disallow", disallow_path))
            elif line.lower().startswith("allow:") and current_agent in ("*", user_agent):
                allow_path = line.split(":", 1)[1].strip()
                if allow_path:
                    rules.append(("allow", allow_path))

        for rule_type, rule_path in reversed(rules):
            if path.startswith(rule_path):
                return rule_type == "allow"

        return True

    async def check(self, url: str, user_agent: str = "*") -> dict:
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        robots_txt = await self.fetch_robots_txt(url)

        if robots_txt is None:
            return {
                "url": url,
                "allowed": True,
                "robots_url": robots_url,
                "details": "No robots.txt found — scraping is allowed by default.",
            }

        allowed = self.is_allowed(robots_txt, url, user_agent)
        return {
            "url": url,
            "allowed": allowed,
            "robots_url": robots_url,
            "details": f"{'Allowed' if allowed else 'Disallowed'} by robots.txt rules.",
        }


robots_checker = RobotsChecker()
