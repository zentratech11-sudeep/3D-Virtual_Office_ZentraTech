"use client";

import { Building2, CircleHelp, Mail, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { assertContentConfig } from "@/config/interactions";
import { company } from "@/data/company-content";
import { useDeviceQuality } from "@/hooks/useDeviceQuality";
import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import { installDebugHook } from "@/lib/debug";
import { isExploring } from "@/lib/experience-machine";
import { useExperience } from "@/lib/store";
import { detectWebGL } from "@/lib/webgl";
import { CompanyContent } from "./CompanyContent";
import { ContactForm } from "./ContactForm";
import { ControlsLegend, FirstVisitHint, HelpContent } from "./ControlsHelp";
import { DestinationPanel, FloorPanel } from "./DestinationPanel";
import { ErrorFallback } from "./ErrorFallback";
import { InfoPanel } from "./InfoPanel";
import { IntroOverlay } from "./IntroOverlay";
import { LoadingScreen } from "./LoadingScreen";
import { MiniMap } from "./MiniMap";
import { Modal } from "./Modal";
import { NavStatus } from "./NavStatus";
import { SceneErrorBoundary } from "./SceneErrorBoundary";
import { HoverTooltip, RoomLabels, ScreenLabels } from "./ScreenLabels";
import { SettingsPanel } from "./SettingsPanel";
import { SideNav } from "./SideNav";
import { StaffDirectory } from "./StaffDirectory";
import { TopBar } from "./TopBar";
import { Joystick } from "./TouchControls";

// Browser-only WebGL code is loaded on the client, after the HTML shell (TRD §2).
const SceneCanvas = dynamic(() => import("@/components/experience/SceneCanvas"), { ssr: false });

function Modals() {
  const modal = useExperience((s) => s.modal);
  const close = useExperience((s) => s.closeModal);
  const preset = useExperience((s) => s.contactPreset);
  const section = useExperience((s) => s.companySection);
  const openModal = useExperience((s) => s.openModal);
  const mode = useExperience((s) => s.mode);
  if (!modal) return null;
  if (modal === "contact") {
    return (
      <Modal title={preset.topic === "meeting" ? "Book a meeting" : "Get in touch"} description={`We'd love to hear from you. ${company.name} usually replies within one business day.`} onClose={close} icon={<Mail size={18} aria-hidden />}>
        <ContactForm key={`${preset.topic}-${preset.recipient}`} topic={preset.topic} recipient={preset.recipient} onDone={close} />
      </Modal>
    );
  }
  if (modal === "company") {
    return (
      <Modal title="About us" description={company.tagline} onClose={close} size="lg" icon={<Building2 size={18} aria-hidden />}>
        <CompanyContent initialSection={section} onContact={(topic, recipient) => openModal("contact", { topic, recipient })} onDirectory={() => openModal("directory")} />
      </Modal>
    );
  }
  if (modal === "directory") {
    return (
      <Modal title="Staff directory" description={`Find anyone at ${company.name} — their role, team and where they sit.`} onClose={close} icon={<Users size={18} aria-hidden />}>
        <StaffDirectory canNavigate={mode !== "errorFallback"} />
      </Modal>
    );
  }
  return (
    <Modal title="Help & controls" onClose={close} icon={<CircleHelp size={18} aria-hidden />}>
      <HelpContent />
    </Modal>
  );
}

function Hud() {
  const navPanel = useExperience((s) => s.navPanel);
  const touch = useExperience((s) => s.touchControls);
  return (
    <>
      <ScreenLabels />
      <RoomLabels />
      <TopBar />
      <SideNav />
      {navPanel === "floors" && <FloorPanel />}
      {navPanel === "map" && <DestinationPanel />}
      {navPanel === "settings" && <SettingsPanel />}
      <NavStatus />
      <InfoPanel />
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 sm:bottom-4 sm:left-4">{touch ? <Joystick /> : <ControlsLegend />}</div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-20 sm:bottom-4 sm:right-4">
        <MiniMap compact={touch} />
      </div>
      <FirstVisitHint />
      <HoverTooltip />
    </>
  );
}

export function ExperienceShell() {
  useDeviceQuality();
  useKeyboardControls();
  const mode = useExperience((s) => s.mode);
  const modal = useExperience((s) => s.modal);
  const webgl = useExperience((s) => s.webgl);
  const dispatch = useExperience((s) => s.dispatch);
  const announcement = useExperience((s) => s.announcement);

  useEffect(() => {
    installDebugHook();
    assertContentConfig();
    const st = useExperience.getState();
    st.setLoadProgress(0.15, "Loading the office");
    const result = detectWebGL();
    if (result.ok) st.setWebgl("ok");
    else {
      st.setWebgl("unsupported");
      st.dispatch({ type: "SCENE_FAILED", reason: result.reason });
    }
  }, []);

  const exploring = isExploring(mode) || (mode === "panelOpen" && !!modal);
  return (
    <div className="fixed inset-0 overflow-hidden bg-navy">
      <div className="absolute inset-0" id="scene-root">
        {webgl === "ok" && mode !== "errorFallback" && (
          <SceneErrorBoundary onError={(m) => dispatch({ type: "SCENE_FAILED", reason: `The 3D scene couldn't load (${m}).` })}>
            <SceneCanvas />
          </SceneErrorBoundary>
        )}
      </div>
      {exploring && <Hud />}
      {mode === "intro" && <IntroOverlay />}
      {mode === "loading" && <LoadingScreen />}
      {mode === "errorFallback" && <ErrorFallback />}
      <Modals />
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
