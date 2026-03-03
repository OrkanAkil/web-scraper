import httpx
from bs4 import BeautifulSoup
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin


class StaticScraper:
    """Scrapes static HTML pages using httpx + BeautifulSoup."""

    async def fetch_page(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        cookies: Optional[Dict[str, str]] = None,
        timeout: int = 30,
        user_agent: str = "ScrapePilot/1.0",
    ) -> tuple[str, str]:
        default_headers = {
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
        }
        if headers:
            default_headers.update(headers)

        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            verify=True,
        ) as client:
            response = await client.get(url, headers=default_headers, cookies=cookies)
            response.raise_for_status()
            return response.text, str(response.url)

    def parse_page(
        self,
        html: str,
        selectors: Dict[str, str],
        base_url: str = "",
    ) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html, "lxml")
        results = []

        if not selectors:
            return results

        # Find the common parent selector if exists
        # Try to find repeating elements by the first selector
        first_field = list(selectors.keys())[0]
        first_selector = selectors[first_field]

        # Find all matching elements for the first selector
        first_elements = soup.select(first_selector)

        if not first_elements:
            return results

        # Try to find a common parent for all selectors
        # Strategy: for each first_element, go up and find siblings that contain other selectors
        for element in first_elements:
            row = {}
            # Get the parent that likely contains all fields
            parent = element.parent
            for _ in range(5):  # Go up max 5 levels
                if parent is None:
                    break
                # Check if this parent contains matches for all selectors
                has_all = True
                for field_name, selector in selectors.items():
                    found = parent.select_one(selector)
                    if found is None:
                        has_all = False
                        break
                if has_all:
                    break
                parent = parent.parent

            if parent is None:
                parent = element.parent or element

            for field_name, selector in selectors.items():
                found = parent.select_one(selector)
                if found:
                    # Get href for links, src for images, text for others
                    if found.name == "a" and found.get("href"):
                        href = found.get("href", "")
                        if base_url and not href.startswith(("http://", "https://")):
                            href = urljoin(base_url, href)
                        row[field_name] = found.get_text(strip=True)
                        row[f"{field_name}_url"] = href
                    elif found.name == "img" and found.get("src"):
                        src = found.get("src", "")
                        if base_url and not src.startswith(("http://", "https://")):
                            src = urljoin(base_url, src)
                        row[field_name] = src
                    else:
                        row[field_name] = found.get_text(strip=True)
                else:
                    row[field_name] = None

            if any(v is not None for v in row.values()):
                results.append(row)

        return results

    def get_page_title(self, html: str) -> Optional[str]:
        soup = BeautifulSoup(html, "lxml")
        title = soup.find("title")
        return title.get_text(strip=True) if title else None

    def find_next_page(
        self,
        html: str,
        next_selector: str,
        base_url: str = "",
    ) -> Optional[str]:
        soup = BeautifulSoup(html, "lxml")
        next_el = soup.select_one(next_selector)
        if next_el:
            href = next_el.get("href")
            if href:
                if not href.startswith(("http://", "https://")):
                    href = urljoin(base_url, href)
                return href
        return None


static_scraper = StaticScraper()
