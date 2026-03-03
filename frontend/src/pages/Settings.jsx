import { useState, useEffect } from 'react'
import { Shield, Server, Globe, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { healthCheck } from '../api/client'

export default function Settings() {
    const [health, setHealth] = useState(null)
    const [checking, setChecking] = useState(false)

    async function checkHealth() {
        setChecking(true)
        try {
            const res = await healthCheck()
            setHealth(res.data)
            toast.success('Backend is healthy!')
        } catch (err) {
            setHealth({ status: 'error', error: err.message })
            toast.error('Backend unreachable')
        } finally {
            setChecking(false)
        }
    }

    useEffect(() => { checkHealth() }, [])

    return (
        <div className="animate-fade-in max-w-3xl">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-[var(--color-text-secondary)] mb-8">Application configuration and status</p>

            {/* Health Check */}
            <div className="card mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Server className="w-5 h-5 text-brand-500" />
                        Backend Status
                    </h2>
                    <button onClick={checkHealth} disabled={checking} className="btn-secondary text-xs">
                        {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Check
                    </button>
                </div>
                {health && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 ${health.status === 'ok' ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                        {health.status === 'ok' ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        )}
                        <div>
                            <p className="font-medium text-sm">
                                {health.status === 'ok' ? 'All systems operational' : 'Backend unreachable'}
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                                {health.service} {health.version && `v${health.version}`}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* About */}
            <div className="card mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <Globe className="w-5 h-5 text-brand-500" />
                    About ScrapePilot
                </h2>
                <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                    <p>
                        <span className="font-semibold text-[var(--color-text)]">ScrapePilot</span> is a production-grade web scraping studio
                        built with FastAPI, React, Celery, and Playwright. It supports both static and JavaScript-rendered pages
                        with real-time monitoring, scheduling, and data export.
                    </p>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="p-3 rounded-xl bg-[var(--color-bg)]">
                            <p className="font-semibold text-[var(--color-text)] text-xs">Backend</p>
                            <p className="text-xs mt-0.5">Python · FastAPI · Celery · PostgreSQL</p>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--color-bg)]">
                            <p className="font-semibold text-[var(--color-text)] text-xs">Frontend</p>
                            <p className="text-xs mt-0.5">React · Vite · Tailwind CSS</p>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--color-bg)]">
                            <p className="font-semibold text-[var(--color-text)] text-xs">Scraping</p>
                            <p className="text-xs mt-0.5">httpx · BeautifulSoup · Playwright</p>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--color-bg)]">
                            <p className="font-semibold text-[var(--color-text)] text-xs">Infrastructure</p>
                            <p className="text-xs mt-0.5">Redis · Docker Compose · WebSocket</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legal Disclaimer */}
            <div className="card border-amber-200 dark:border-amber-800">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-amber-500" />
                    Legal & Ethical Disclaimer
                </h2>
                <div className="space-y-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    <p>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">⚠️ Important:</span> Web scraping may be subject to legal
                        restrictions depending on the target website's Terms of Service, applicable laws (such as the Computer Fraud and Abuse Act in
                        the US, or GDPR in the EU), and the nature of the data being collected.
                    </p>
                    <p>By using ScrapePilot, you agree to:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Always respect <code className="text-xs bg-[var(--color-bg)] px-1.5 py-0.5 rounded">robots.txt</code> directives</li>
                        <li>Comply with the target website's Terms of Service</li>
                        <li>Not scrape personal or sensitive data without consent</li>
                        <li>Use appropriate rate limiting to avoid server overload</li>
                        <li>Not use scraped data for unlawful purposes</li>
                        <li>Accept full responsibility for your scraping activities</li>
                    </ul>
                    <p className="mt-3 font-medium text-[var(--color-text)]">
                        The developers of ScrapePilot are not responsible for any misuse of this tool.
                        Use it responsibly and ethically.
                    </p>
                </div>
            </div>
        </div>
    )
}
