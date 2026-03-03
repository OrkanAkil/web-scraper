import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Projects
export const getProjects = (params) => api.get('/api/projects', { params })
export const getProject = (id) => api.get(`/api/projects/${id}`)
export const createProject = (data) => api.post('/api/projects', data)
export const updateProject = (id, data) => api.put(`/api/projects/${id}`, data)
export const deleteProject = (id) => api.delete(`/api/projects/${id}`)

// Scraping
export const startScrape = (data) => api.post('/api/scrape', data)
export const getJob = (id) => api.get(`/api/jobs/${id}`)
export const cancelJob = (id) => api.post(`/api/jobs/${id}/cancel`)
export const rerunJob = (id) => api.post(`/api/jobs/${id}/rerun`)
export const previewScrape = (data) => api.post('/api/preview', data)
export const checkRobots = (data) => api.post('/api/check-robots', data)

// Results
export const getResults = (jobId, params) => api.get(`/api/jobs/${jobId}/results`, { params })
export const exportResults = (jobId, format) =>
    api.get(`/api/jobs/${jobId}/export`, { params: { format }, responseType: 'blob' })

// History & Logs
export const getProjectRuns = (projectId, params) => api.get(`/api/projects/${projectId}/runs`, { params })
export const getJobLogs = (jobId) => api.get(`/api/runs/${jobId}/logs`)

// Share
export const createShareLink = (jobId, data) => api.post(`/api/jobs/${jobId}/share`, data)
export const getSharedData = (token, params) => api.get(`/api/share/${token}`, { params })
export const getJobShares = (jobId) => api.get(`/api/jobs/${jobId}/shares`)
export const deleteShareLink = (id) => api.delete(`/api/share/${id}`)

// Schedules
export const getSchedules = (params) => api.get('/api/schedules', { params })
export const createSchedule = (data) => api.post('/api/schedules', data)
export const updateSchedule = (id, data) => api.put(`/api/schedules/${id}`, data)
export const deleteSchedule = (id) => api.delete(`/api/schedules/${id}`)

// Health
export const healthCheck = () => api.get('/api/health')

export default api
