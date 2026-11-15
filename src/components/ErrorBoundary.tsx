import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error?: Error;
}

/**
 * Render-time safety net.
 *
 * Catches unexpected render errors so a single failing section cannot blank
 * the document or ship a white screen. The fallback is visitor-safe: no
 * stack trace, message or component name is ever rendered in production. In
 * development the error is echoed to the console and shown inline so it is
 * never swallowed silently.
 *
 * "Try again" resets the boundary and remounts the subtree; "Back to home"
 * guarantees a way out. Existing routes and navigation stay intact because
 * the boundary sits inside the router.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[error-boundary]", error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: undefined });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-4 px-6 py-16 text-center"
      >
        <h2 tabIndex={-1} className="font-heading text-2xl font-semibold text-navy">
          Something went wrong
        </h2>
        <p className="text-sm leading-relaxed text-ink/65">
          This section failed to display. Your other content is unaffected — try again, or head
          back to the home page.
        </p>
        {import.meta.env.DEV && (
          <pre className="w-full overflow-x-auto rounded-md border border-surface-pale3 bg-surface-pale p-3 text-left text-[11px] text-ink/70">
            {String(error)}
          </pre>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="accent" size="md" onClick={this.reset}>
            Try again
          </Button>
          <Button asChild variant="outline" size="md">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }
}
