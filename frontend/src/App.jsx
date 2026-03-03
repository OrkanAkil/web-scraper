import { Routes, Route } from 'react-router-dom'
import { useTheme } from './hooks/useTheme'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import NewJob from './pages/NewJob'
import ProjectDetail from './pages/ProjectDetail'
import RunDetail from './pages/RunDetail'
import ShareView from './pages/ShareView'
import Schedules from './pages/Schedules'
import Settings from './pages/Settings'

export default function App() {
    const themeProps = useTheme()

    return (
        <Routes>
            <Route path="/share/:token" element={<ShareView />} />
            <Route element={<Layout {...themeProps} />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/new" element={<NewJob />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/runs/:id" element={<RunDetail />} />
                <Route path="/schedules" element={<Schedules />} />
                <Route path="/settings" element={<Settings />} />
            </Route>
        </Routes>
    )
}
