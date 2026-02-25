import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-4">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We're sorry, but an unexpected error has occurred. Please try refreshing the page.
            </p>
            {this.state.error && (
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto max-h-64 mb-4 text-sm font-mono text-red-800">
                <p className="font-bold">{this.state.error.toString()}</p>
                <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400"
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
