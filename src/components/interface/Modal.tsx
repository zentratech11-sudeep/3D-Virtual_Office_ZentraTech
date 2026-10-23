"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "lg";
  icon?: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal dialog: focus moves in and is trapped, Escape closes (handled globally),
 * focus returns to the previously focused element, and pointer events never reach the canvas.
 */
export function Modal({ title, description, onClose, children, size = "md", icon }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>("[data-autofocus]") ?? el?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !el) return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-navy/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        data-capture-keys
        className={`animate-fade-up relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white text-slate-800 shadow-2xl sm:rounded-2xl ${size === "lg" ? "sm:max-w-4xl" : "sm:max-w-lg"}`}
      >
        <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          {icon && <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy text-white">{icon}</div>}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-bold text-navy">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="-mr-1 grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Close dialog">
            <X size={20} aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
