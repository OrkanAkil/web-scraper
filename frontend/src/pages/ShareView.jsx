import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Zap, Database, Clock, ChevronLeft, ChevronRight, Search, FileText, ExternalLink, Loader2 } from 'lucide-react'
import { getSharedData } from '../api/client'
import { formatDuration, formatDate } from '../utils/constants'

export default function ShareView() {
    const { token } = useParams()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => { loadData() }, [token, page])

    async function loadData() {
        try {
            setLoading(true)
            const res = await getSharedData(token, { page, page_size: 50 })
            setData(res.data)
        } catch (err) {
            if (err.response?.status === 404) setError('This share link was not found.')
            else if (err.response?.status === 410) setError('This share link has expired.')
            else setError('Failed to load shared data.')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                        <ExternalLink className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Link Unavailable</h1>
                    <p className="text-[var(--color-text-secondary)]">{error}</p>
                </div>
            </div>
        )
    }

    if (!data) return null

    const filteredResults = searchQuery
        ? data.results.filter(r => JSON.stringify(r.data).toLowerCase().includes(searchQuery.toLowerCase()))
        : data.results

    return (
        <div className="min-h-screen bg-[var(--color-bg)]">
            {/* Header */}
            <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">ScrapePilot — Shared Results</h1>
                            <p className="text-sm text-[var(--color-text-secondary)] font-mono">{data.job.target_url}</p>
                        </div>
                    </div>
                    {data.expires_at && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                            ⏳ This link expires on {formatDate(data.expires_at)}
                        </p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-sm">
                            <Database className="w-4 h-4 text-brand-500" />
                            <span className="font-semibold">{data.total_results}</span>
                            <span className="text-[var(--color-text-secondary)]">items</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <FileText className="w-4 h-4 text-brand-500" />
                            <span className="font-semibold">{data.job.total_pages}</span>
                            <span className="text-[var(--color-text-secondary)]">pages</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-brand-500" />
                            <span className="font-semibold">{formatDuration(data.job.duration_seconds)}</span>
                            <span className="text-[var(--color-text-secondary)]">duration</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-8 py-6">
                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search results..." className="input-field pl-10" />
                </div>

                {/* Table */}
                {filteredResults.length > 0 ? (
                    <>
                        <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[var(--color-bg)]">
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">#</th>
                                        {filteredResults[0] && Object.keys(filteredResults[0].data).map((key) => (
                                            <th key={key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                                                {key}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredResults.map((item, i) => (
                                        <tr key={item.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                                            <td className="px-4 py-3 text-[var(--color-text-secondary)]">{(page - 1) * 50 + i + 1}</td>
                                            {Object.values(item.data).map((val, j) => (
                                                <td key={j} className="px-4 py-3 max-w-xs truncate">{String(val || '-')}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-[var(--color-text-secondary)]">
                                Page {page} of {data.total_pages} ({data.total_results} total)
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button onClick={() => setPage(p => Math.min(data.total_pages, p + 1))} disabled={page >= data.total_pages} className="btn-secondary text-xs">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-10 text-[var(--color-text-secondary)]">No results found</div>
                )}
            </div>

            {/* Footer */}
            <footer className="border-t border-[var(--color-border)] mt-10 py-6 text-center text-xs text-[var(--color-text-secondary)]">
                Powered by <span className="font-semibold text-brand-600 dark:text-brand-400">ScrapePilot</span> · Web Scraping Studio
            </footer>
        </div>
    )
}
