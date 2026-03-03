import { useState, useEffect, useRef, useCallback } from 'react'

export function useWebSocket(jobId, options = {}) {
    const [logs, setLogs] = useState([])
    const [connected, setConnected] = useState(false)
    const wsRef = useRef(null)
    const reconnectRef = useRef(null)
    const { enabled = true, onMessage } = options

    const connect = useCallback(() => {
        if (!jobId || !enabled) return

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = window.location.host
        const wsUrl = `${protocol}//${host}/ws/logs/${jobId}`

        try {
            const ws = new WebSocket(wsUrl)
            wsRef.current = ws

            ws.onopen = () => {
                setConnected(true)
                if (reconnectRef.current) {
                    clearTimeout(reconnectRef.current)
                    reconnectRef.current = null
                }
            }

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    setLogs((prev) => [...prev, data])
                    if (onMessage) onMessage(data)
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e)
                }
            }

            ws.onclose = () => {
                setConnected(false)
                // Auto-reconnect after 3 seconds
                if (enabled) {
                    reconnectRef.current = setTimeout(connect, 3000)
                }
            }

            ws.onerror = () => {
                ws.close()
            }
        } catch (e) {
            console.error('WebSocket connection failed:', e)
        }
    }, [jobId, enabled, onMessage])

    useEffect(() => {
        connect()
        return () => {
            if (wsRef.current) {
                wsRef.current.close()
            }
            if (reconnectRef.current) {
                clearTimeout(reconnectRef.current)
            }
        }
    }, [connect])

    const clearLogs = useCallback(() => {
        setLogs([])
    }, [])

    return { logs, connected, clearLogs }
}
