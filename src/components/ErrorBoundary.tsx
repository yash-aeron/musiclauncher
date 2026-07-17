import React from "react";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 text-white">
          <div className="text-xl font-bold">Something went wrong.</div>
          <pre className="max-w-xl overflow-auto rounded-lg bg-black/40 p-4 text-xs text-red-400">
            {(this.state.error as Error).message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="btn-accent rounded-full px-5 py-2 text-sm font-semibold text-black"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
