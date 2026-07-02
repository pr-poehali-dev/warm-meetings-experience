import { Component, ErrorInfo, ReactNode } from "react";
import { reportError } from "@/lib/errorReporter";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError({
      message: error.message || "React render error",
      stack: error.stack,
      level: "fatal",
      context: { componentStack: info.componentStack?.slice(0, 2000) },
    });
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-background text-foreground">
          <h1 className="text-2xl font-semibold">Что-то пошло не так</h1>
          <p className="text-muted-foreground max-w-md">
            Мы уже получили уведомление об ошибке и разбираемся. Попробуйте
            обновить страницу.
          </p>
          <button
            onClick={this.handleReload}
            className="mt-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Обновить страницу
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
