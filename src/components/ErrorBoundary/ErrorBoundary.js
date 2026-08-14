import React from 'react';

/** Catches render errors in the tree below it and shows a friendly fallback instead of a blank page. */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('InternPath UI error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '80px 24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.6rem', marginBottom: 10 }}>Something went wrong</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Please refresh the page. If the problem continues, contact support.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      );
    }
    return this.props.children;
  }
}
