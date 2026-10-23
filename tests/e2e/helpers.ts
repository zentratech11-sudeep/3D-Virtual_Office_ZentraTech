import { type Page, expect } from "@playwright/test";

type Level = "ground" | "hq-1" | "hq-roof" | "mkt-1" | "sales-1";

/** Calls a function on the `?debug=1` inspection hook. */
export function cvo<T = unknown>(page: Page, fn: string, ...args: unknown[]): Promise<T> {
  return page.evaluate(([f, a]) => (window as never as Record<string, Record<string, (...x: unknown[]) => unknown>>).__CVO__[f as string](...(a as unknown[])), [fn, args]) as Promise<T>;
}

export interface CvoState {
  mode: string;
  modal: string | null;
  selectedContentId: string | null;
  selectedAnchorId: string | null;
  nav: { state: string; label?: string };
  location: { level: Level; zoneLabel: string };
  cutLevels: Record<string, number>;
  touchControls: boolean;
}
export interface CvoPlayer {
  level: Level;
  x: number;
  z: number;
  ry: number;
}

export const state = (page: Page) => cvo<CvoState>(page, "state");
export const player = (page: Page) => cvo<CvoPlayer>(page, "player");

/** Opens the site, waits for the intro, enters the office and dismisses the first-visit tip. */
export async function enterOffice(page: Page, query = "") {
  await page.goto(`/?debug=1${query}`);
  await page.waitForFunction(() => (window as never as { __CVO__?: { state: () => { mode: string } } }).__CVO__?.state().mode === "intro", null, { timeout: 90_000 });
  await page.getByRole("button", { name: /explore the office/i }).click();
  await expect.poll(async () => (await state(page)).mode).not.toBe("intro");
  const tip = page.getByRole("button", { name: "Got it" });
  if (await tip.isVisible().catch(() => false)) await tip.click();
}

/** Puts the character somewhere and lets the camera settle on it. */
export async function placeCharacter(page: Page, level: Level, x: number, z: number, ry = 0) {
  await cvo(page, "teleport", level, x, z, ry);
  await cvo(page, "camera", { kind: "follow" });
  await page.waitForTimeout(1800);
}

/** Resolves an anchor ID, or the first anchor that opens `entity:<contentId>`. */
export async function resolveAnchor(page: Page, ref: string): Promise<string> {
  if (!ref.startsWith("entity:")) return ref;
  const ids = await cvo<string[]>(page, "anchorsOf", ref.slice("entity:".length));
  expect(ids.length, `an anchor should open ${ref}`).toBeGreaterThan(0);
  return ids[0]!;
}

/** Stands the character at an anchor's walk-up point (where "Take me there" ends). */
export async function placeAtAnchor(page: Page, anchorId: string) {
  const a = await cvo<{ level: Level; approach: [number, number] } | null>(page, "anchor", anchorId);
  expect(a, `${anchorId} should exist`).not.toBeNull();
  await placeCharacter(page, a!.level, a!.approach[0], a!.approach[1]);
}

/** Rotates the camera so W walks north (−z). */
export async function faceNorth(page: Page) {
  const cam = await cvo<{ azimuth: number }>(page, "cam");
  await cvo(page, "camera", { kind: "rotate", deltaDeg: (-cam.azimuth * 180) / Math.PI });
  await page.waitForTimeout(1500);
}

export async function holdKey(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

export async function waitForArrival(page: Page, timeout = 60_000) {
  await expect.poll(async () => (await state(page)).nav.state, { timeout }).not.toBe("moving");
}

/** Clicks the on-screen position of an interactive 3D anchor (real raycast through the canvas). */
export async function clickAnchor(page: Page, anchorId: string) {
  const p = await cvo<{ x: number; y: number; visible: boolean } | null>(page, "anchorScreen", anchorId);
  expect(p?.visible, `${anchorId} should be on screen`).toBe(true);
  await page.mouse.click(p!.x, p!.y);
}
