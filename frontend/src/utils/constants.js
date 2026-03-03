export const JOB_STATUS_MAP = {
    pending: { label: 'Pending', class: 'badge-neutral', color: 'gray' },
    running: { label: 'Running', class: 'badge-info', color: 'blue' },
    completed: { label: 'Completed', class: 'badge-success', color: 'green' },
    failed: { label: 'Failed', class: 'badge-danger', color: 'red' },
    cancelled: { label: 'Cancelled', class: 'badge-warning', color: 'yellow' },
}

export const RENDER_MODES = [
    { value: 'static', label: 'Static (HTML)', description: 'Fast, for server-rendered pages' },
    { value: 'dynamic', label: 'Dynamic (JS)', description: 'Headless browser, for SPAs' },
]

export const PAGINATION_TYPES = [
    { value: 'next_button', label: 'Next Button', description: 'Click "Next" link' },
    { value: 'page_numbers', label: 'Page Numbers', description: 'Navigate page links' },
    { value: 'infinite_scroll', label: 'Infinite Scroll', description: 'Auto-scroll down' },
]

export const EXPORT_FORMATS = [
    { value: 'csv', label: 'CSV', icon: '📄' },
    { value: 'json', label: 'JSON', icon: '📋' },
    { value: 'excel', label: 'Excel', icon: '📊' },
]

export const DEMO_TARGETS = [
    {
        name: 'Quotes to Scrape',
        url: 'https://quotes.toscrape.com',
        description: 'Famous quotes with authors and tags',
        selectors: {
            quote: '.quote .text',
            author: '.quote .author',
            tags: '.quote .tags',
        },
        pagination: { enabled: true, type: 'next_button', next_selector: '.pager .next a', max_pages: 5 },
        render_mode: 'static',
    },
    {
        name: 'Books to Scrape',
        url: 'https://books.toscrape.com',
        description: 'Book catalog with prices and ratings',
        selectors: {
            title: '.product_pod h3 a',
            price: '.product_pod .price_color',
            availability: '.product_pod .instock.availability',
        },
        pagination: { enabled: true, type: 'next_button', next_selector: '.pager .next a', max_pages: 5 },
        render_mode: 'static',
    },
    {
        name: 'Hacker News',
        url: 'https://news.ycombinator.com',
        description: 'Top tech news stories and scores',
        selectors: {
            title: '.titleline a',
            score: '.score',
            source: '.sitestr',
        },
        pagination: { enabled: true, type: 'next_button', next_selector: '.morelink', max_pages: 3 },
        render_mode: 'static',
    },
]

export function formatDuration(seconds) {
    if (!seconds) return '-'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}m ${secs}s`
}

export function formatDate(dateStr) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
}

export function formatRelativeTime(dateStr) {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'just now'
}
