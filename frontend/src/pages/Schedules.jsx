import { useState, useEffect } from 'react'
import { Plus, Clock, Play, Pause, Trash2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, getProjects } from '../api/client'
import { formatDate } from '../utils/constants'

const CRON_PRESETS = [
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every 6 hours', value: '0 */6 * * *' },
    { label: 'Every 12 hours', value: '0 */12 * * *' },
    { label: 'Daily (midnight)', value: '0 0 * * *' },
    { label: 'Weekly (Monday)', value: '0 0 * * 1' },
]

export default function Schedules() {
    const [schedules, setSchedules] = useState([])
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)

    const [form, setForm] = useState({
        project_id: '', name: '', cron_expression: '0 0 * * *',
        target_url: '', selectors: '{"title": "h1"}',
        render_mode: 'static',
    })

    useEffect(() => { loadAll() }, [])

    async function loadAll() {
        try {
            setLoading(true)
            const [schedRes, projRes] = await Promise.all([getSchedules(), getProjects()])
            setSchedules(schedRes.data.items)
            setProjects(projRes.data.items)
            if (projRes.data.items.length > 0 && !form.project_id) {
                setForm(f => ({ ...f, project_id: projRes.data.items[0].id }))
            }
        } catch (err) {
            toast.error('Failed to load schedules')
        } finally {
            setLoading(false)
        }
    }

    async function handleCreate(e) {
        e.preventDefault()
        try {
            let selectors
            try { selectors = JSON.parse(form.selectors) } catch { toast.error('Invalid selectors JSON'); return }

            await createSchedule({
                ...form,
                selectors,
            })
            setShowCreate(false)
            loadAll()
            toast.success('Schedule created!')
        } catch (err) {
            toast.error('Failed: ' + (err.response?.data?.detail || err.message))
        }
    }

    async function toggleActive(schedule) {
        try {
            await updateSchedule(schedule.id, { is_active: !schedule.is_active })
            setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, is_active: !s.is_active } : s))
            toast.success(schedule.is_active ? 'Schedule paused' : 'Schedule activated')
        } catch (err) {
            toast.error('Failed to update schedule')
        }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this schedule?')) return
        try {
            await deleteSchedule(id)
            setSchedules(prev => prev.filter(s => s.id !== id))
            toast.success('Schedule deleted')
        } catch (err) {
            toast.error('Failed to delete schedule')
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
    }

    return (
        <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Schedules</h1>
                    <p className="text-[var(--color-text-secondary)] mt-1">Automate scraping jobs with cron schedules</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="btn-primary">
                    <Plus className="w-4 h-4" /> New Schedule
                </button>
            </div>

            {/* Schedule List */}
            {schedules.length > 0 ? (
                <div className="space-y-3">
                    {schedules.map((schedule) => (
                        <div key={schedule.id} className="card flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-3 h-3 rounded-full ${schedule.is_active ? 'bg-emerald-500' : 'bg-surface-400'}`} />
                                <div>
                                    <p className="font-semibold">{schedule.name}</p>
                                    <p className="text-sm text-[var(--color-text-secondary)] font-mono">{schedule.cron_expression}</p>
                                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                                        Target: {schedule.target_url}
                                        {schedule.next_run_at && ` · Next: ${formatDate(schedule.next_run_at)}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => toggleActive(schedule)} className="btn-ghost">
                                    {schedule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </button>
                                <button onClick={() => handleDelete(schedule.id)} className="btn-ghost text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20">
                    <Clock className="w-16 h-16 mx-auto text-[var(--color-text-secondary)] opacity-40 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No schedules yet</h3>
                    <p className="text-[var(--color-text-secondary)] mb-6">Create a schedule to automate your scraping jobs</p>
                    <button onClick={() => setShowCreate(true)} className="btn-primary">
                        <Plus className="w-4 h-4" /> Create Schedule
                    </button>
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">Create Schedule</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="label">Name</label>
                                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Daily News Scrape" className="input-field" required />
                            </div>
                            <div>
                                <label className="label">Project</label>
                                <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className="input-field">
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">Cron Expression</label>
                                <input type="text" value={form.cron_expression} onChange={(e) => setForm({ ...form, cron_expression: e.target.value })}
                                    className="input-field font-mono" required />
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {CRON_PRESETS.map(p => (
                                        <button key={p.value} type="button" onClick={() => setForm({ ...form, cron_expression: p.value })}
                                            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${form.cron_expression === p.value ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-600' : 'border-[var(--color-border)] hover:border-brand-300'}`}>
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="label">Target URL</label>
                                <input type="url" value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })}
                                    placeholder="https://example.com" className="input-field" required />
                            </div>
                            <div>
                                <label className="label">Selectors (JSON)</label>
                                <textarea value={form.selectors} onChange={(e) => setForm({ ...form, selectors: e.target.value })}
                                    className="input-field font-mono text-sm" rows={3} required />
                            </div>
                            <div>
                                <label className="label">Render Mode</label>
                                <select value={form.render_mode} onChange={(e) => setForm({ ...form, render_mode: e.target.value })} className="input-field">
                                    <option value="static">Static (HTML)</option>
                                    <option value="dynamic">Dynamic (JS)</option>
                                </select>
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">Create Schedule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
