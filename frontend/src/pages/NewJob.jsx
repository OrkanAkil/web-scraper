import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Globe, Code, Settings2, Eye, ChevronRight, ChevronLeft, Check,
    Plus, Trash2, Zap, Shield, AlertTriangle, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getProjects, createProject, startScrape, previewScrape, checkRobots } from '../api/client'
import { RENDER_MODES, PAGINATION_TYPES, DEMO_TARGETS } from '../utils/constants'

const STEPS = [
    { id: 1, label: 'Target', icon: Globe, desc: 'Enter URL & mode' },
    { id: 2, label: 'Selectors', icon: Code, desc: 'Define CSS selectors' },
    { id: 3, label: 'Pagination', icon: ChevronRight, desc: 'Page navigation' },
    { id: 4, label: 'Options', icon: Settings2, desc: 'Rate limit & auth' },
    { id: 5, label: 'Preview', icon: Eye, desc: 'Review & launch' },
]

export default function NewJob() {
    const [step, setStep] = useState(1)
    const navigate = useNavigate()

    // Form state
    const [projects, setProjects] = useState([])
    const [projectId, setProjectId] = useState('')
    const [newProjectName, setNewProjectName] = useState('')
    const [url, setUrl] = useState('')
    const [renderMode, setRenderMode] = useState('static')
    const [selectors, setSelectors] = useState([{ name: '', selector: '' }])
    const [paginationEnabled, setPaginationEnabled] = useState(false)
    const [paginationType, setPaginationType] = useState('next_button')
    const [nextSelector, setNextSelector] = useState('')
    const [maxPages, setMaxPages] = useState(10)
    const [rateLimitMs, setRateLimitMs] = useState(1000)
    const [maxRetries, setMaxRetries] = useState(3)
    const [timeoutSeconds, setTimeoutSeconds] = useState(30)
    const [userAgent, setUserAgent] = useState('')
    const [respectRobots, setRespectRobots] = useState(true)
    const [waitForSelector, setWaitForSelector] = useState('')
    const [customHeaders, setCustomHeaders] = useState('')
    const [customCookies, setCustomCookies] = useState('')

    // Preview state
    const [previewData, setPreviewData] = useState(null)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [robotsResult, setRobotsResult] = useState(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        loadProjects()
    }, [])

    async function loadProjects() {
        try {
            const res = await getProjects()
            setProjects(res.data.items)
            if (res.data.items.length > 0) {
                setProjectId(res.data.items[0].id)
            }
        } catch (err) {
            // silently fail
        }
    }

    function applyTemplate(template) {
        setUrl(template.url)
        setRenderMode(template.render_mode)
        setSelectors(
            Object.entries(template.selectors).map(([name, selector]) => ({ name, selector }))
        )
        if (template.pagination) {
            setPaginationEnabled(template.pagination.enabled)
            setPaginationType(template.pagination.type)
            setNextSelector(template.pagination.next_selector || '')
            setMaxPages(template.pagination.max_pages || 10)
        }
        toast.success(`Template "${template.name}" applied!`)
    }

    function addSelector() {
        setSelectors([...selectors, { name: '', selector: '' }])
    }

    function removeSelector(index) {
        setSelectors(selectors.filter((_, i) => i !== index))
    }

    function updateSelector(index, field, value) {
        const updated = [...selectors]
        updated[index][field] = value
        setSelectors(updated)
    }

    function getSelectorsMap() {
        const map = {}
        selectors.filter(s => s.name && s.selector).forEach(s => {
            map[s.name] = s.selector
        })
        return map
    }

    function parseHeaders() {
        if (!customHeaders.trim()) return {}
        try {
            return JSON.parse(customHeaders)
        } catch {
            const headers = {}
            customHeaders.split('\n').forEach(line => {
                const [key, ...valueParts] = line.split(':')
                if (key && valueParts.length) {
                    headers[key.trim()] = valueParts.join(':').trim()
                }
            })
            return headers
        }
    }

    function parseCookies() {
        if (!customCookies.trim()) return {}
        try {
            return JSON.parse(customCookies)
        } catch {
            const cookies = {}
            customCookies.split(';').forEach(pair => {
                const [key, value] = pair.split('=')
                if (key && value) {
                    cookies[key.trim()] = value.trim()
                }
            })
            return cookies
        }
    }

    async function handlePreview() {
        setPreviewLoading(true)
        try {
            const [previewRes, robotsRes] = await Promise.all([
                previewScrape({
                    target_url: url,
                    selectors: getSelectorsMap(),
                    render_mode: renderMode,
                    headers: parseHeaders(),
                    cookies: parseCookies(),
                }),
                checkRobots({ url }),
            ])
            setPreviewData(previewRes.data)
            setRobotsResult(robotsRes.data)
        } catch (err) {
            toast.error('Preview failed: ' + (err.response?.data?.detail || err.message))
        } finally {
            setPreviewLoading(false)
        }
    }

    async function handleSubmit() {
        setSubmitting(true)
        try {
            let pid = projectId

            // Create project if needed
            if (!pid && newProjectName.trim()) {
                const res = await createProject({ name: newProjectName.trim() })
                pid = res.data.id
            }

            if (!pid) {
                toast.error('Please select or create a project')
                setSubmitting(false)
                return
            }

            const jobData = {
                project_id: pid,
                target_url: url,
                selectors: getSelectorsMap(),
                render_mode: renderMode,
                pagination_config: paginationEnabled ? {
                    enabled: true,
                    type: paginationType,
                    next_selector: nextSelector,
                    max_pages: maxPages,
                } : { enabled: false },
                headers: parseHeaders(),
                cookies: parseCookies(),
                options: {
                    rate_limit_ms: rateLimitMs,
                    max_retries: maxRetries,
                    timeout_seconds: timeoutSeconds,
                    user_agent: userAgent || undefined,
                    respect_robots_txt: respectRobots,
                    wait_for_selector: waitForSelector || undefined,
                },
            }

            const res = await startScrape(jobData)
            toast.success('Scraping job started!')
            navigate(`/runs/${res.data.id}`)
        } catch (err) {
            toast.error('Failed to start job: ' + (err.response?.data?.detail || err.message))
        } finally {
            setSubmitting(false)
        }
    }

    function canProceed() {
        switch (step) {
            case 1: return url.trim() && (projectId || newProjectName.trim())
            case 2: return selectors.some(s => s.name && s.selector)
            case 3: return true
            case 4: return true
            case 5: return true
            default: return false
        }
    }

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">New Scraping Job</h1>
            <p className="text-[var(--color-text-secondary)] mb-8">Configure and launch a web scraping task</p>

            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-10">
                {STEPS.map((s, idx) => (
                    <div key={s.id} className="flex items-center">
                        <button
                            onClick={() => step > s.id && setStep(s.id)}
                            className="flex flex-col items-center"
                        >
                            <div className={step === s.id ? 'wizard-step-active' : step > s.id ? 'wizard-step-completed' : 'wizard-step-pending'}>
                                {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                            </div>
                            <span className={`text-xs mt-2 font-medium ${step === s.id ? 'text-brand-600 dark:text-brand-400' : 'text-[var(--color-text-secondary)]'}`}>
                                {s.label}
                            </span>
                        </button>
                        {idx < STEPS.length - 1 && (
                            <div className={`w-16 h-0.5 mx-2 mt-[-18px] ${step > s.id ? 'bg-emerald-500' : 'bg-[var(--color-border)]'}`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div className="card mb-6">
                {/* Step 1: Target URL */}
                {step === 1 && (
                    <div className="animate-fade-in space-y-6">
                        <div>
                            <h2 className="text-xl font-bold mb-1">Target Configuration</h2>
                            <p className="text-sm text-[var(--color-text-secondary)]">Enter the URL to scrape and select rendering mode</p>
                        </div>

                        {/* Demo Templates */}
                        <div>
                            <label className="label">Quick Start Templates</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {DEMO_TARGETS.map((t, i) => (
                                    <button key={i} onClick={() => applyTemplate(t)}
                                        className="text-left p-3 rounded-xl border border-[var(--color-border)] hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-all">
                                        <p className="font-medium text-sm">{t.name}</p>
                                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{t.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Project Selection */}
                        <div>
                            <label className="label">Project</label>
                            {projects.length > 0 ? (
                                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input-field">
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                    <option value="">+ Create New Project</option>
                                </select>
                            ) : null}
                            {(!projectId || projects.length === 0) && (
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="Enter new project name"
                                    className="input-field mt-2"
                                />
                            )}
                        </div>

                        {/* URL */}
                        <div>
                            <label className="label">Target URL</label>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com/products"
                                className="input-field"
                            />
                        </div>

                        {/* Render Mode */}
                        <div>
                            <label className="label">Rendering Mode</label>
                            <div className="grid grid-cols-2 gap-3">
                                {RENDER_MODES.map((mode) => (
                                    <button key={mode.value}
                                        onClick={() => setRenderMode(mode.value)}
                                        className={`p-4 rounded-xl border text-left transition-all ${renderMode === mode.value
                                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 ring-2 ring-brand-500/20'
                                                : 'border-[var(--color-border)] hover:border-brand-300'
                                            }`}>
                                        <p className="font-semibold text-sm">{mode.label}</p>
                                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{mode.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Selectors */}
                {step === 2 && (
                    <div className="animate-fade-in space-y-6">
                        <div>
                            <h2 className="text-xl font-bold mb-1">CSS Selectors</h2>
                            <p className="text-sm text-[var(--color-text-secondary)]">Define field names and their CSS selectors</p>
                        </div>
                        <div className="space-y-3">
                            {selectors.map((sel, i) => (
                                <div key={i} className="flex gap-3 items-start">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={sel.name}
                                            onChange={(e) => updateSelector(i, 'name', e.target.value)}
                                            placeholder="Field name (e.g. title)"
                                            className="input-field"
                                        />
                                    </div>
                                    <div className="flex-[2]">
                                        <input
                                            type="text"
                                            value={sel.selector}
                                            onChange={(e) => updateSelector(i, 'selector', e.target.value)}
                                            placeholder="CSS selector (e.g. h2.product-title)"
                                            className="input-field font-mono text-sm"
                                        />
                                    </div>
                                    {selectors.length > 1 && (
                                        <button onClick={() => removeSelector(i)} className="btn-ghost text-red-500 mt-1">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button onClick={addSelector} className="btn-secondary">
                            <Plus className="w-4 h-4" />
                            Add Field
                        </button>
                    </div>
                )}

                {/* Step 3: Pagination */}
                {step === 3 && (
                    <div className="animate-fade-in space-y-6">
                        <div>
                            <h2 className="text-xl font-bold mb-1">Pagination</h2>
                            <p className="text-sm text-[var(--color-text-secondary)]">Configure how to navigate multiple pages</p>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={paginationEnabled}
                                onChange={(e) => setPaginationEnabled(e.target.checked)}
                                className="w-5 h-5 rounded border-[var(--color-border)] text-brand-600 focus:ring-brand-500"
                            />
                            <span className="font-medium">Enable Pagination</span>
                        </label>

                        {paginationEnabled && (
                            <>
                                <div>
                                    <label className="label">Pagination Type</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {PAGINATION_TYPES.map((type) => (
                                            <button key={type.value}
                                                onClick={() => setPaginationType(type.value)}
                                                className={`p-3 rounded-xl border text-left transition-all ${paginationType === type.value
                                                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 ring-2 ring-brand-500/20'
                                                        : 'border-[var(--color-border)] hover:border-brand-300'
                                                    }`}>
                                                <p className="font-semibold text-sm">{type.label}</p>
                                                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{type.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {paginationType !== 'infinite_scroll' && (
                                    <div>
                                        <label className="label">Next Page Selector</label>
                                        <input
                                            type="text"
                                            value={nextSelector}
                                            onChange={(e) => setNextSelector(e.target.value)}
                                            placeholder=".pagination .next a"
                                            className="input-field font-mono text-sm"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="label">Max Pages</label>
                                    <input
                                        type="number"
                                        value={maxPages}
                                        onChange={(e) => setMaxPages(parseInt(e.target.value) || 10)}
                                        min={1}
                                        max={1000}
                                        className="input-field w-32"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Step 4: Options */}
                {step === 4 && (
                    <div className="animate-fade-in space-y-6">
                        <div>
                            <h2 className="text-xl font-bold mb-1">Scraping Options</h2>
                            <p className="text-sm text-[var(--color-text-secondary)]">Configure rate limiting, timeouts, and authentication</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Rate Limit (ms between requests)</label>
                                <input type="number" value={rateLimitMs} onChange={(e) => setRateLimitMs(parseInt(e.target.value) || 1000)}
                                    min={200} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Max Retries</label>
                                <input type="number" value={maxRetries} onChange={(e) => setMaxRetries(parseInt(e.target.value) || 3)}
                                    min={0} max={10} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Timeout (seconds)</label>
                                <input type="number" value={timeoutSeconds} onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 30)}
                                    min={5} max={120} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Custom User-Agent (optional)</label>
                                <input type="text" value={userAgent} onChange={(e) => setUserAgent(e.target.value)}
                                    placeholder="Default: ScrapePilot/1.0" className="input-field" />
                            </div>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={respectRobots} onChange={(e) => setRespectRobots(e.target.checked)}
                                className="w-5 h-5 rounded border-[var(--color-border)] text-brand-600 focus:ring-brand-500" />
                            <div>
                                <span className="font-medium">Respect robots.txt</span>
                                <p className="text-xs text-[var(--color-text-secondary)]">Check and warn if scraping is disallowed</p>
                            </div>
                        </label>

                        {renderMode === 'dynamic' && (
                            <div>
                                <label className="label">Wait for Selector (optional)</label>
                                <input type="text" value={waitForSelector} onChange={(e) => setWaitForSelector(e.target.value)}
                                    placeholder=".product-list" className="input-field font-mono text-sm" />
                                <p className="text-xs text-[var(--color-text-secondary)] mt-1">Wait for this element before scraping (for JS-heavy pages)</p>
                            </div>
                        )}

                        <div>
                            <label className="label">Custom Headers (optional, JSON or key:value per line)</label>
                            <textarea value={customHeaders} onChange={(e) => setCustomHeaders(e.target.value)}
                                placeholder='{"Authorization": "Bearer token"}' className="input-field font-mono text-sm" rows={3} />
                        </div>

                        <div>
                            <label className="label">Custom Cookies (optional, JSON or key=value;key=value)</label>
                            <textarea value={customCookies} onChange={(e) => setCustomCookies(e.target.value)}
                                placeholder='{"session_id": "abc123"}' className="input-field font-mono text-sm" rows={3} />
                        </div>
                    </div>
                )}

                {/* Step 5: Preview & Launch */}
                {step === 5 && (
                    <div className="animate-fade-in space-y-6">
                        <div>
                            <h2 className="text-xl font-bold mb-1">Preview & Launch</h2>
                            <p className="text-sm text-[var(--color-text-secondary)]">Review your config and preview results before launching</p>
                        </div>

                        {/* Config Summary */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-[var(--color-bg)]">
                                <p className="text-xs text-[var(--color-text-secondary)] mb-1">Target URL</p>
                                <p className="font-mono text-sm break-all">{url}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--color-bg)]">
                                <p className="text-xs text-[var(--color-text-secondary)] mb-1">Mode</p>
                                <p className="font-semibold text-sm">{renderMode === 'static' ? 'Static (HTML)' : 'Dynamic (JS)'}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--color-bg)]">
                                <p className="text-xs text-[var(--color-text-secondary)] mb-1">Fields</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {selectors.filter(s => s.name).map((s, i) => (
                                        <span key={i} className="badge-info">{s.name}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--color-bg)]">
                                <p className="text-xs text-[var(--color-text-secondary)] mb-1">Pagination</p>
                                <p className="font-semibold text-sm">
                                    {paginationEnabled ? `${paginationType} (max ${maxPages} pages)` : 'Disabled'}
                                </p>
                            </div>
                        </div>

                        {/* Preview Button */}
                        <button onClick={handlePreview} disabled={previewLoading} className="btn-secondary w-full">
                            {previewLoading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Running Preview...</>
                            ) : (
                                <><Eye className="w-4 h-4" /> Preview First Page</>
                            )}
                        </button>

                        {/* Robots Result */}
                        {robotsResult && (
                            <div className={`p-4 rounded-xl flex items-start gap-3 ${robotsResult.allowed ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'}`}>
                                {robotsResult.allowed ? (
                                    <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                                ) : (
                                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <p className="font-medium text-sm">{robotsResult.allowed ? 'robots.txt: Allowed' : 'robots.txt: Warning'}</p>
                                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{robotsResult.details}</p>
                                </div>
                            </div>
                        )}

                        {/* Preview Results */}
                        {previewData && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="font-semibold text-sm">
                                        Preview Results ({previewData.total_found} items found)
                                        {previewData.page_title && <span className="text-[var(--color-text-secondary)] font-normal ml-2">— {previewData.page_title}</span>}
                                    </p>
                                </div>
                                {previewData.success && previewData.data.length > 0 ? (
                                    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-[var(--color-bg)]">
                                                    {Object.keys(previewData.data[0]).map((key) => (
                                                        <th key={key} className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                                                            {key}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.data.slice(0, 10).map((row, i) => (
                                                    <tr key={i} className="border-t border-[var(--color-border)]">
                                                        {Object.values(row).map((val, j) => (
                                                            <td key={j} className="px-4 py-2.5 max-w-xs truncate">{String(val || '')}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                                        {previewData.error || 'No items found. Check your selectors.'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
                <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="btn-secondary">
                    <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex gap-3">
                    {step < 5 ? (
                        <button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="btn-primary">
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
                            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</> : <><Zap className="w-4 h-4" /> Launch Scraping</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
