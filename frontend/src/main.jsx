import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
            <Toaster
                position="top-right"
                toastOptions={{
                    className: '!bg-[var(--color-surface)] !text-[var(--color-text)] !border !border-[var(--color-border)] !shadow-xl',
                    duration: 4000,
                }}
            />
        </BrowserRouter>
    </React.StrictMode>,
)
