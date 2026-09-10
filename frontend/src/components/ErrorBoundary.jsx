import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { logError } from "../lib/logger";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logError("ErrorBoundary", error, { componentStack: errorInfo?.componentStack });
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100"
          data-testid="error-boundary-fallback"
        >
          <div className="max-w-md w-full bg-slate-900/90 border border-red-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur text-center">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-400 mb-6">
              An unexpected error occurred. LifeOS captured the error log and preserved your data.
            </p>
            <button
              onClick={this.handleReset}
              className="btn btn-primary w-full justify-center flex items-center gap-2"
              data-testid="error-boundary-reload-button"
            >
              <RotateCcw size={16} /> Return to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
