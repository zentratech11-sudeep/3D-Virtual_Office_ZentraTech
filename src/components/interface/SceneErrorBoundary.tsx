"use client";

import { Component, type ReactNode } from "react";

interface Props {
  onError: (message: string) => void;
  children: ReactNode;
}

/** Catches failures inside the 3D scene so the HTML fallback can take over (PRD FR-01). */
export class SceneErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[virtual-office] 3D scene failed:", error);
    this.props.onError(message);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
