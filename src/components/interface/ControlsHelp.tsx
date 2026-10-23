"use client";

import { Hand, MousePointerClick, X } from "lucide-react";
import { useState } from "react";
import { useExperience } from "@/lib/store";

/** Bottom-left controls legend (design panel 7). Desktop only; dismissible for the session. */
export function ControlsLegend() {
  const [open, setOpen] = useState(true);
  const touch = useExperience((s) => s.touchControls);
  if (!open || touch) return null;
  return (
    <aside data-ui aria-label="Controls" className="hud pointer-events-auto relative hidden rounded-2xl px-4 py-3 text-[13px] md:block">
      <button type="button" onClick={() => setOpen(false)} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full text-blue-100/70 hover:bg-white/10 hover:text-white" aria-label="Hide controls legend">
        <X size={14} aria-hidden />
      </button>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 pr-5">
        <dt className="flex gap-1">
          {["W", "A", "S", "D"].map((k) => (
            <kbd key={k} className="keycap">
              {k}
            </kbd>
          ))}
        </dt>
        <dd>Move (Shift to run)</dd>
        <dt>
          <kbd className="keycap px-2">Drag</kbd>
        </dt>
        <dd>Look around</dd>
        <dt>
          <kbd className="keycap px-2">Scroll</kbd>
        </dt>
        <dd>Zoom</dd>
        <dt>
          <kbd className="keycap px-2">Click</kbd>
        </dt>
        <dd>Walk to a spot · open info</dd>
      </dl>
    </aside>
  );
}

/** Full controls reference for the Help dialog. */
export function HelpContent() {
  const rows: Array<[string, string]> = [
    ["W A S D / Arrow keys", "Walk (relative to the camera)"],
    ["Shift", "Run"],
    ["Left-drag", "Rotate the camera"],
    ["Right-drag", "Pan (in overview)"],
    ["Mouse wheel / + −", "Zoom in and out"],
    ["Q / E", "Rotate the view 45°"],
    ["Click the floor", "Walk to that spot"],
    ["Click a person, room or object", "Open its information card"],
    ["Esc", "Close the open card or dialog"],
  ];
  return (
    <div className="flex flex-col gap-5 text-sm text-slate-600">
      <section>
        <h3 className="mb-2 font-bold text-navy">Keyboard & mouse</h3>
        <table className="w-full text-left">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-slate-100 last:border-0">
                <th scope="row" className="py-2 pr-4 font-semibold text-slate-800">
                  {k}
                </th>
                <td className="py-2">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h3 className="mb-2 flex items-center gap-2 font-bold text-navy">
          <Hand size={16} aria-hidden /> Touch screens
        </h3>
        <ul className="list-inside list-disc space-y-1">
          <li>Use the joystick (bottom left) to walk.</li>
          <li>Drag with one finger to look around, pinch to zoom.</li>
          <li>Tap the floor to walk there, tap people and rooms for details.</li>
          <li>The + / − and rotate buttons next to the map also control the camera.</li>
        </ul>
      </section>
      <section>
        <h3 className="mb-2 flex items-center gap-2 font-bold text-navy">
          <MousePointerClick size={16} aria-hidden /> Getting around
        </h3>
        <p>
          Use <strong>Map</strong> to jump to any destination, <strong>Floors</strong> to look inside each building, and <strong>Overview</strong> to see the whole campus. Everything in the office is also
          available as plain text under <strong>About us</strong>.
        </p>
      </section>
    </div>
  );
}

/** First-visit tip (PRD FR-07). */
export function FirstVisitHint() {
  const visible = useExperience((s) => s.hintVisible);
  const dismiss = useExperience((s) => s.dismissHint);
  const touch = useExperience((s) => s.touchControls);
  if (!visible) return null;
  return (
    <div data-ui role="status" className="animate-fade-up pointer-events-auto absolute left-[68px] right-3 top-[72px] z-20 sm:bottom-8 sm:left-1/2 sm:right-auto sm:top-auto sm:w-[520px] sm:-translate-x-1/2">
      <div className="hud flex items-center gap-4 rounded-2xl px-4 py-3 text-sm">
        <p className="flex-1 leading-snug">
          {touch ? (
            <>
              <strong>Tip:</strong> use the joystick to walk, drag to look around, and tap people, rooms and objects to learn more.
            </>
          ) : (
            <>
              <strong>Tip:</strong> walk with <kbd className="keycap">W</kbd> <kbd className="keycap">A</kbd> <kbd className="keycap">S</kbd> <kbd className="keycap">D</kbd>, drag to look around, scroll to zoom — and click people, rooms
              and objects to learn more.
            </>
          )}
        </p>
        <button type="button" onClick={dismiss} className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-navy hover:bg-blue-50">
          Got it
        </button>
      </div>
    </div>
  );
}
