import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary catches React render errors and displays them so we can debug black screen issues.
 */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#050a0a',
            color: '#ffffff',
            padding: 24,
            fontFamily: 'sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <h1 style={{ color: '#f87171', marginBottom: 16 }}>Algo falló</h1>
          <pre
            style={{
              color: 'rgba(255,255,255,0.9)',
              background: 'rgba(0,0,0,0.3)',
              padding: 16,
              borderRadius: 8,
              overflow: 'auto',
              maxWidth: '100%',
              fontSize: 12,
            }}
          >
            {this.state.error.message}
          </pre>
          <pre
            style={{
              color: 'rgba(255,255,255,0.6)',
              marginTop: 12,
              fontSize: 11,
              whiteSpace: 'pre-wrap',
              maxWidth: '100%',
            }}
          >
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
