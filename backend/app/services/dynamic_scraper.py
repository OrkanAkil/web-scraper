from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin


class DynamicScraper:
    """Scrapes JavaScript-rendered pages using Playwright headless browser."""

    async def fetch_page(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        cookies: Optional[Dict[str, str]] = None,
        timeout: int = 30,
        user_agent: str = "ScrapePilot/1.0",
        wait_for_selector: Optional[str] = None,
        wait_timeout_ms: int = 10000,
    ) -> tuple[str, str]:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=user_agent,
                extra_http_headers=headers or {},
            )

            if cookies:
                cookie_list = []
                from urllib.parse import urlparse
                parsed = urlparse(url)
                for name, value in cookies.items():
                    cookie_list.append({
                        "name": name,
                        "value": value,
                        "domain": parsed.netloc,
                        "path": "/",
                    })
                await context.add_cookies(cookie_list)

            page = await context.new_page()

            try:
                await page.goto(url, timeout=timeout * 1000, wait_until="networkidle")

                if wait_for_selector:
                    await page.wait_for_selector(wait_for_selector, timeout=wait_timeout_ms)

                html = await page.content()
                final_url = page.url
                return html, final_url
            finally:
                await browser.close()

    async def fetch_page_with_scroll(
        self,
        url: str,
        scroll_count: int = 10,
        wait_after_scroll_ms: int = 2000,
        headers: Optional[Dict[str, str]] = None,
        cookies: Optional[Dict[str, str]] = None,
        timeout: int = 30,
        user_agent: str = "ScrapePilot/1.0",
        wait_for_selector: Optional[str] = None,
        wait_timeout_ms: int = 10000,
    ) -> tuple[str, str]:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=user_agent,
                extra_http_headers=headers or {},
            )

            if cookies:
                cookie_list = []
                from urllib.parse import urlparse
                parsed = urlparse(url)
                for name, value in cookies.items():
                    cookie_list.append({
                        "name": name,
                        "value": value,
                        "domain": parsed.netloc,
                        "path": "/",
                    })
                await context.add_cookies(cookie_list)

            page = await context.new_page()

            try:
                await page.goto(url, timeout=timeout * 1000, wait_until="networkidle")

                if wait_for_selector:
                    await page.wait_for_selector(wait_for_selector, timeout=wait_timeout_ms)

                # Perform scrolling for infinite scroll pages
                for i in range(scroll_count):
                    previous_height = await page.evaluate("document.body.scrollHeight")
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    await page.wait_for_timeout(wait_after_scroll_ms)
                    new_height = await page.evaluate("document.body.scrollHeight")
                    if new_height == previous_height:
                        break  # No more content to load

                html = await page.content()
                final_url = page.url
                return html, final_url
            finally:
                await browser.close()

    def parse_page(
        self,
        html: str,
        selectors: Dict[str, str],
        base_url: str = "",
    ) -> List[Dict[str, Any]]:
        # Reuse static scraper's parsing logic
        from app.services.static_scraper import static_scraper
        return static_scraper.parse_page(html, selectors, base_url)

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
        from app.services.static_scraper import static_scraper
        return static_scraper.find_next_page(html, next_selector, base_url)


dynamic_scraper = DynamicScraper()
