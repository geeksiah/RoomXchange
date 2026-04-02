import { Component, type ReactNode } from "react";

type NativeMapBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  resetKey?: string | number | boolean | null;
  onError?: () => void;
  onReset?: () => void;
};

type NativeMapBoundaryState = {
  hasError: boolean;
};

export class NativeMapBoundary extends Component<NativeMapBoundaryProps, NativeMapBoundaryState> {
  state: NativeMapBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: NativeMapBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
      this.props.onReset?.();
    }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("[maps] Native map render failed.", error, info.componentStack);
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
