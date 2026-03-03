import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, Play, Clock, TrendingUp, Trash2, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { getProjects, createProject, deleteProject } from '../api/client'
import { formatRelativeTime } from '../utils/constants'

export default function Dashboard() {
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState('')
    const [newDesc, setNewDesc] = useState('')
    const [search, setSearch] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        loadProjects()
    }, [search])

    async function loadProjects() {
        try {
            setLoading(true)
            const res = await getProjects({ search: search || undefined })
            setProjects(res.data.items)
        } catch (err) {
            toast.error('Failed to load projects')
        } finally {
            setLoading(false)
        }
    }

    async function handleCreate(e) {
        e.preventDefault()
        if (!newName.trim()) return
        try {
            const res = await createProject({ name: newName.trim(), description: newDesc.trim() })
            setProjects((prev) => [res.data, ...prev])
            setShowCreate(false)
            setNewName('')
            setNewDesc('')
            toast.success('Project created!')
        } catch (err) {
            toast.error('Failed to create project')
        }
    }

    async function handleDelete(id, e) {
        e.stopPropagation()
        if (!confirm('Are you sure you want to delete this project and all its data?')) return
        try {
            await deleteProject(id)
            setProjects((prev) => prev.filter((p) => p.id !== id))
            toast.success('Project deleted')
        } catch (err) {
            toast.error('Failed to delete project')
        }
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-[var(--color-text-secondary)] mt-1">Manage your scraping projects</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate('/new')} className="btn-primary">
                        <Play className="w-4 h-4" />
                        Quick Scrape
                    </button>
                    <button onClick={() => setShowCreate(true)} className="btn-secondary">
                        <Plus className="w-4 h-4" />
                        New Project
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                <input
                    type="text"
                    placeholder="Search projects..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field pl-10"
                />
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="card w-full max-w-md animate-slide-up">
                        <h2 className="text-xl font-bold mb-4">Create Project</h2>
                        <form onSubmit={handleCreate}>
                            <div className="mb-4">
                                <label className="label">Project Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. E-Commerce Price Tracker"
                                    className="input-field"
                                    autoFocus
                                />
                            </div>
                            <div className="mb-6">
                                <label className="label">Description (optional)</label>
                                <textarea
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder="Brief description of this project"
                                    className="input-field"
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={!newName.trim()}>
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Project Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="card animate-pulse">
                            <div className="h-5 bg-[var(--color-border)] rounded w-2/3 mb-3" />
                            <div className="h-4 bg-[var(--color-border)] rounded w-full mb-2" />
                            <div className="h-4 bg-[var(--color-border)] rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : projects.length === 0 ? (
                <div className="text-center py-20">
                    <FolderOpen className="w-16 h-16 mx-auto text-[var(--color-text-secondary)] opacity-40 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                    <p className="text-[var(--color-text-secondary)] mb-6">
                        Create your first project to start scraping the web
                    </p>
                    <button onClick={() => setShowCreate(true)} className="btn-primary">
                        <Plus className="w-4 h-4" />
                        Create First Project
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => navigate(`/projects/${project.id}`)}
                            className="card-hover group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/30 dark:to-brand-800/30 flex items-center justify-center">
                                    <FolderOpen className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                </div>
                                <button
                                    onClick={(e) => handleDelete(project.id, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <h3 className="font-semibold text-lg mb-1 line-clamp-1">{project.name}</h3>
                            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-4">
                                {project.description || 'No description'}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                                <span className="flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    {project.job_count || 0} runs
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatRelativeTime(project.last_run_at) || 'Never'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
