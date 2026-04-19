import { Component } from "react";
import { useRouteError } from "react-router-dom";
import { Btn } from "../atoms";

const CHUNK_PATTERNS = [
  "Failed to fetch dynamically imported module",
  "Loading chunk",
];

function isChunkError(error) {
  return CHUNK_PATTERNS.some(p => error?.message?.includes(p));
}

/**
 * For use as React Router's errorElement — receives route/loader/action errors
 * (including lazy import chunk failures) via useRouteError().
 */
export function RouteErrorFallback() {
  const error = useRouteError();
  if (isChunkError(error) && !sessionStorage.getItem("chunk_reload_attempted")) {
    sessionStorage.setItem("chunk_reload_attempted", "1");
    window.location.reload();
    return null;
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)]">
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] p-8 max-w-md w-full text-center">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          The page failed to load. Please try reloading.
        </p>
        <Btn onClick={() => window.location.reload()}>Reload page</Btn>
      </div>
    </div>
  );
}

export default class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, reloading: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    if (isChunkError(error) && !sessionStorage.getItem("chunk_reload_attempted")) {
      sessionStorage.setItem("chunk_reload_attempted", "1");
      this.setState({ reloading: true });
      window.location.reload();
    }
  }

  render() {
    if (this.state.reloading) return null;
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)]">
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] p-8 max-w-md w-full text-center">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            The page failed to load. Please try reloading.
          </p>
          <Btn onClick={() => window.location.reload()}>Reload page</Btn>
        </div>
      </div>
    );
  }
}
