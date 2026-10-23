"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { company } from "@/data/company-content";
import { track } from "@/lib/analytics";
import { useExperience } from "@/lib/store";
import { detectWebGL } from "@/lib/webgl";
import { CompanyContent } from "./CompanyContent";
import { Brand } from "./Logo";

/**
 * Full non-3D experience (PRD FR-01, FR-10): shown when WebGL is unavailable or the
 * scene fails. Every essential piece of content and the contact form remain usable.
 */
export function ErrorFallback() {
  const error = useExperience((s) => s.error);
  const webgl = useExperience((s) => s.webgl);
  const dispatch = useExperience((s) => s.dispatch);
  const openModal = useExperience((s) => s.openModal);
  const setWebgl = useExperience((s) => s.setWebgl);

  useEffect(() => {
    track("fallback_shown", { reason: webgl === "unsupported" ? "webgl" : "scene" });
  }, [webgl]);

  const retry = () => {
    const r = detectWebGL();
    if (r.ok) {
      setWebgl("ok");
      dispatch({ type: "RETRY" });
    } else dispatch({ type: "SCENE_FAILED", reason: r.reason });
  };

  return (
    <div data-ui className="absolute inset-0 z-40 overflow-y-auto bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-navy px-4 py-3 sm:px-8">
        <Brand />
        <button type="button" onClick={() => openModal("contact")} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          Contact us
        </button>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
        <div role="alert" className="mb-8 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 sm:flex-row sm:items-center">
          <TriangleAlert className="shrink-0" aria-hidden />
          <div className="flex-1">
            <h1 className="font-bold">The 3D office isn&apos;t available right now</h1>
            <p className="text-sm">
              {error ?? "Something went wrong while loading the 3D view."} Here is everything about {company.name} in a simple version instead.
            </p>
          </div>
          <button type="button" onClick={retry} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-amber-100">
            <RefreshCw size={15} aria-hidden /> Try 3D again
          </button>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
          <CompanyContent standalone onContact={(topic, recipient) => openModal("contact", { topic, recipient })} onDirectory={() => openModal("directory")} />
        </div>
      </main>
    </div>
  );
}
