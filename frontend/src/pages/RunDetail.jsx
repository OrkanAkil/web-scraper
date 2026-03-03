import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
    ArrowLeft, RotateCcw, XCircle, Share2, Download, ExternalLink,
    Clock, Database, FileText, Loader2, Copy, Check, ChevronLeft, ChevronRight, Search
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getJob, cancelJob, rerunJob, getResults, getJobLogs, createShareLink, getJobShares, exportResults } from '../api/client'
import { useWebSocket } from '../hooks/useWebSocket'
import { JOB_STATUS_MAP, formatDuration, formatDate, EXPORT_FORMATS } from '../utils/constants'

export default function RunDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [job, setJob] = useState(null)
    const [results, setResults] = useState({ items: [], total: 0, page: 1, total_pages: 1 })
    const [logs, setLogs] = useState([])
    const [shares, setShares] = useState([])
    const [tab, setTab] = useState('logs')
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(1)
    const [showShareModal, setShowShareModal] = useState(false)
    const [shareTtl, setShareTtl] = useState('')
    const [copiedToken, setCopiedToken] = useState(null)
    const logEndRef = useRef(null)

    const isRunning = job?.status === 'pending' || job?.status === 'running'
    const isRunningRef = useRef(false)
    isRunningRef.current = isRunning

    // Stable onMessage callback — does not change on every render
    const onMessageRef = useRef(null)
    onMessageRef.current = () => refreshJob()
    const stableOnMessage = useRef((...args) => onMessageRef.current(...args)).current

    // WebSocket for live logs
    const { logs: wsLogs, connected } = useWebSocket(id, {
        enabled: isRunning,
        onMessage: stableOnMessage,
    })

    useEffect(() => {
        loadAll()
        const interval = setInterval(() => {
            if (isRunningRef.current) refreshJob()
        }, 3000)
        return () => clearInterval(interval)
    }, [id])

    useEffect(() => {
        if (tab === 'results') loadResults()
    }, [tab, page, searchQuery])

    useEffect(() => {
        // Auto-scroll logs
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [wsLogs, logs])

    async function loadAll() {
        try {
            setLoading(true)
            const [jobRes, logsRes, sharesRes] = await Promise.all([
                getJob(id),
                getJobLogs(id),
                getJobShares(id),
            ])
            setJob(jobRes.data)
            setLogs(logsRes.data.items)
            setShares(sharesRes.data.items)
        } catch (err) {
            toast.error('Failed to load job details')
            navigate('/')
        } finally {
            setLoading(false)
        }
    }

    async function refreshJob() {
        try {
            const res = await getJob(id)
            setJob(res.data)
        } catch { } // silently ignore
    }

    async function loadResults() {
        try {
            const res = await getResults(id, { page, page_size: 50, search: searchQuery || undefined })
            setResults(res.data)
        } catch (err) {
            toast.error('Failed to load results')
        }
    }

    async function handleCancel() {
        try {
            await cancelJob(id)
            toast.success('Job cancelled')
            refreshJob()
        } catch (err) {
            toast.error('Failed to cancel job')
        }
    }

    async function handleRerun() {
        try {
            const res = await rerunJob(id)
            toast.success('Job restarted!')
            navigate(`/runs/${res.data.id}`)
        } catch (err) {
            toast.error('Failed to rerun job')
        }
    }

    async function handleCreateShare() {
        try {
            const data = shareTtl ? { ttl_days: parseInt(shareTtl) } : {}
            const res = await createShareLink(id, data)
            setShares(prev => [res.data, ...prev])
            setShowShareModal(false)
            toast.success('Share link created!')
        } catch (err) {
            toast.error('Failed to create share link')
        }
    }

    async function handleExport(format) {
        try {
            const res = await exportResults(id, format)
            const blob = new Blob([res.data])
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `scrapepilot_${id}.${format === 'excel' ? 'xlsx' : format}`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            toast.success(`Exported as ${format.toUpperCase()}`)
        } catch (err) {
            toast.error('Export failed')
        }
    }

    function copyShareLink(token) {
        const link = `${window.location.origin}/share/${token}`
        navigator.clipboard.writeText(link)
        setCopiedToken(token)
        setTimeout(() => setCopiedToken(null), 2000)
        toast.success('Link copied!')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        )
    }

    if (!job) return null

    const status = JOB_STATUS_MAP[job.status] || JOB_STATUS_MAP.pending
    const allLogs = [...logs, ...wsLogs]

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate(-1)} className="btn-ghost">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold">Run Detail</h1>
                        <span className={status.class}>{status.label}</span>
                        {isRunning && connected && (
                            <span className="badge-info flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                Live
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] font-mono mt-1 truncate">{job.target_url}</p>
                </div>
                <div className="flex gap-2">
                    {isRunning && (
                        <button onClick={handleCancel} className="btn-danger">
                            <XCircle className="w-4 h-4" /> Cancel
                        </button>
                    )}
                    <button onClick={handleRerun} className="btn-secondary">
                        <RotateCcw className="w-4 h-4" /> Rerun
                    </button>
                    <button onClick={() => setShowShareModal(true)} className="btn-secondary">
                        <Share2 className="w-4 h-4" /> Share
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Pages Scraped', value: `${job.scraped_pages}/${job.total_pages || '?'}`, icon: FileText },
                    { label: 'Items Found', value: job.total_items, icon: Database },
                    { label: 'Duration', value: formatDuration(job.duration_seconds), icon: Clock },
                    { label: 'Mode', value: job.render_mode === 'static' ? 'Static' : 'Dynamic', icon: ExternalLink },
                ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="card">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center">
                                <Icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                            </div>
                            <div>
                                <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
                                <p className="text-xl font-bold">{value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-[var(--color-border)]">
                {['logs', 'results', 'shares'].map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${tab === t
                                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                            }`}>
                        {t === 'logs' ? 'Live Logs' : t === 'results' ? `Results (${job.total_items})` : `Shares (${shares.length})`}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {tab === 'logs' && (
                <div className="card p-0 max-h-[500px] overflow-y-auto bg-surface-950 dark:bg-surface-950 rounded-2xl">
                    <div className="p-4 space-y-0">
                        {allLogs.length === 0 ? (
                            <p className="text-center text-[var(--color-text-secondary)] py-10">
                                {isRunning ? 'Waiting for logs...' : 'No logs available'}
                            </p>
                        ) : (
                            allLogs.map((log, i) => (
                                <div key={log.id || i} className={`log-line log-${log.level}`}>
                                    <span className="text-surface-500 mr-2">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                    <span className="font-semibold mr-2">[{log.level}]</span>
                                    {log.message}
                                </div>
                            ))
                        )}
                        <div ref={logEndRef} />
                    </div>
                </div>
            )}

            {tab === 'results' && (
                <div>
                    {/* Search & Export */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                            <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                                placeholder="Search results..." className="input-field pl-10" />
                        </div>
                        <div className="flex gap-2">
                            {EXPORT_FORMATS.map((f) => (
                                <button key={f.value} onClick={() => handleExport(f.value)} className="btn-secondary text-xs">
                                    <Download className="w-3.5 h-3.5" /> {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Results Table */}
                    {results.items.length > 0 ? (
                        <>
                            <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-[var(--color-bg)]">
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">#</th>
                                            {results.items[0] && Object.keys(results.items[0].data).map((key) => (
                                                <th key={key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.items.map((item, i) => (
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
                                    Showing {(page - 1) * 50 + 1}-{Math.min(page * 50, results.total)} of {results.total}
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="flex items-center px-3 text-sm">{page} / {results.total_pages}</span>
                                    <button onClick={() => setPage(p => Math.min(results.total_pages, p + 1))} disabled={page >= results.total_pages} className="btn-secondary text-xs">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-10 text-[var(--color-text-secondary)]">
                            {job.status === 'running' ? 'Results will appear as scraping progresses...' : 'No results found'}
                        </div>
                    )}
                </div>
            )}

            {tab === 'shares' && (
                <div>
                    <button onClick={() => setShowShareModal(true)} className="btn-primary mb-4">
                        <Share2 className="w-4 h-4" /> Create Share Link
                    </button>
                    {shares.length > 0 ? (
                        <div className="space-y-3">
                            {shares.map((share) => (
                                <div key={share.id} className="card flex items-center justify-between">
                                    <div>
                                        <p className="font-mono text-sm">{`${window.location.origin}/share/${share.token}`}</p>
                                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                            Created {formatDate(share.created_at)}
                                            {share.expires_at && ` · Expires ${formatDate(share.expires_at)}`}
                                        </p>
                                    </div>
                                    <button onClick={() => copyShareLink(share.token)}
                                        className="btn-secondary text-xs">
                                        {copiedToken === share.token ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                        {copiedToken === share.token ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-[var(--color-text-secondary)]">
                            No share links yet. Create one to share results with others.
                        </div>
                    )}
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-md animate-slide-up">
                        <h2 className="text-xl font-bold mb-4">Create Share Link</h2>
                        <div className="mb-6">
                            <label className="label">Expiration (days, leave empty for no expiration)</label>
                            <input type="number" value={shareTtl} onChange={(e) => setShareTtl(e.target.value)}
                                placeholder="e.g. 30" min={1} max={365} className="input-field" />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowShareModal(false)} className="btn-secondary">Cancel</button>
                            <button onClick={handleCreateShare} className="btn-primary">Create Link</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {job.error_message && (
                <div className="mt-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="font-semibold text-sm text-red-700 dark:text-red-400">Error Details</p>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1 font-mono">{job.error_message}</p>
                </div>
            )}
        </div>
    )
}
