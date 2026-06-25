import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertOctagon, RotateCcw, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught rendering failure]:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          className="flex-center animate-fade-in"
          style={{
            flexDirection: 'column',
            padding: '40px 20px',
            minHeight: '60dvh',
            width: '100%',
            maxWidth: '680px',
            margin: '0 auto',
          }}
        >
          <div className="card-elevated" style={{ width: '100%', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div 
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--red-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--red)',
                  flexShrink: 0,
                }}
              >
                <AlertOctagon size={24} />
              </div>
              <div>
                <h2 className="font-display" style={{ fontSize: 20, color: 'var(--text-primary)' }}>
                  Rendering Failure Caught
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  FitOS isolated a crash in this view to preserve the shell state.
                </p>
              </div>
            </div>

            <div 
              style={{
                background: 'var(--bg-base)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                padding: 16,
                marginBottom: 24,
                width: '100%',
              }}
            >
              <div 
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--red)',
                  marginBottom: 8,
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unknown rendering error'}
              </div>
              {this.state.error?.stack && (
                <pre 
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    margin: 0,
                    paddingTop: 8,
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <button 
                onClick={this.handleReset}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <RotateCcw size={16} />
                Retry Rendering
              </button>
              <button 
                onClick={this.handleReload}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <RefreshCw size={16} />
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
