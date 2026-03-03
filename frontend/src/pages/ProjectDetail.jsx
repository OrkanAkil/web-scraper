import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Play, Clock, Database, TrendingUp, ExternalLink, Settings, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getProject, getProjectRuns, updateProject } from '../api/client'
import { JOB_STATUS_MAP, formatDuration, formatRelativeTime, formatDate } from '../utils/constants'

export default function ProjectDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [project, setProject] = useState(null)
    const [runs, setRuns] = useState({ items: [], total: 0 })
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [statusFilter, setStatusFilter] = useState('')
    const [editing, setEditing] = useState(false)
    const [editName, setEditName] = useState('')
    const [editDesc, setEditDesc] = useState('')

    useEffect(() => { loadProject() }, [id])
    useEffect(() => { loadRuns() }, [id, page, statusFilter])

    async function loadProject() {
        try {
            const res = await getProject(id)
            setProject(res.data)
            setEditName(res.data.name)
            setEditDesc(res.data.description || '')
        } catch (err) {
            toast.error('Project not found')
            navigate('/')
        } finally {
            setLoading(false)
        }
    }

    async function loadRuns() {
        try {
            const res = await getProjectRuns(id, { page, status: statusFilter || undefined })
            setRuns(res.data)
        } catch { } // silently
    }

    async function handleSave() {
        try {
            const res = await updateProject(id, { name: editName, description: editDesc })
            setProject(res.data)
            setEditing(false)
            toast.success('Project updated')
        } catch (err) {
            toast.error('Failed to update project')
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
    }

    if (!project) return null

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate('/')} className="btn-ghost"><ArrowLeft className="w-4 h-4" /></button>
                <div className="flex-1">
                    {editing ? (
                        <div className="flex items-center gap-3">
                            <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input-field text-2xl font-bold" />
                            <button onClick={handleSave} className="btn-primary text-sm">Save</button>
                            <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Cancel</button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{project.name}</h1>
                            <button onClick={() => setEditing(true)} className="btn-ghost text-xs"><Settings className="w-4 h-4" /></button>
                        </div>
                    )}
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">{project.description || 'No description'}</p>
                </div>
                <button onClick={() => navigate('/new')} className="btn-primary">
                    <Play className="w-4 h-4" /> New Scrape
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-secondary)]">Total Runs</p>
                            <p className="text-2xl font-bold">{project.job_count || 0}</p>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                            <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-secondary)]">Total Items</p>
                            <p className="text-2xl font-bold">
                                {runs.items.reduce((sum, r) => sum + (r.total_items || 0), 0)}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--color-text-secondary)]">Last Run</p>
                            <p className="text-lg font-bold">{formatRelativeTime(project.last_run_at)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold flex-1">Run History</h2>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="input-field w-40">
                    <option value="">All Status</option>
                    {Object.entries(JOB_STATUS_MAP).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                    ))}
                </select>
            </div>

            {/* Runs Table */}
            {runs.items.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[var(--color-bg)]">
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">URL</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Items</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Duration</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Created</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {runs.items.map((run) => {
                                const st = JOB_STATUS_MAP[run.status] || JOB_STATUS_MAP.pending
                                return (
                                    <tr key={run.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                                        <td className="px-4 py-3"><span className={st.class}>{st.label}</span></td>
                                        <td className="px-4 py-3 max-w-xs truncate font-mono text-xs">{run.target_url}</td>
                                        <td className="px-4 py-3 font-semibold">{run.total_items}</td>
                                        <td className="px-4 py-3">{formatDuration(run.duration_seconds)}</td>
                                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatRelativeTime(run.created_at)}</td>
                                        <td className="px-4 py-3">
                                            <Link to={`/runs/${run.id}`} className="text-brand-600 dark:text-brand-400 hover:underline font-medium flex items-center gap-1">
                                                View <ExternalLink className="w-3 h-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-10 text-[var(--color-text-secondary)]">
                    No runs found. Start a new scraping job!
                </div>
            )}
        </div>
    )
}
