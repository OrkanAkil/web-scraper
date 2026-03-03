import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Plus, Clock, Settings, Sun, Moon, Zap } from 'lucide-react'

export default function Layout({ theme, toggleTheme }) {
    const location = useLocation()

    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/new', icon: Plus, label: 'New Scrape' },
        { to: '/schedules', icon: Clock, label: 'Schedules' },
        { to: '/settings', icon: Settings, label: 'Settings' },
    ]

    return (
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col fixed h-full z-30">
                {/* Logo */}
                <div className="p-6 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold bg-gradient-to-r from-brand-500 to-brand-400 bg-clip-text text-transparent">
                                ScrapePilot
                            </h1>
                            <p className="text-[10px] text-[var(--color-text-secondary)] font-medium tracking-wider uppercase">
                                Web Scraping Studio
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                    ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 shadow-sm'
                                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
                                }`
                            }
                        >
                            <Icon className="w-4.5 h-4.5" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--color-border)]">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-all duration-200"
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <div className="mt-3 px-4 py-2 text-xs text-[var(--color-text-secondary)]">
                        <p className="font-medium">⚖️ Legal Disclaimer</p>
                        <p className="mt-1 leading-relaxed opacity-75">
                            Respect robots.txt and terms of service. Use responsibly.
                        </p>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 ml-64">
                <div className="max-w-7xl mx-auto p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
