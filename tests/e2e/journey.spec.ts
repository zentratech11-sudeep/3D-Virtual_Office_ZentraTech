import { expect, test } from "@playwright/test";
import { company } from "../../src/data/company";
import { cvo, enterOffice, faceNorth, holdKey, placeCharacter, player, state, waitForArrival } from "./helpers";

test.describe("core journey", () => {
  test("loads with a branded entry state and enters the overview", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto("/?debug=1");
    await expect(page.getByRole("button", { name: /explore the office/i })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole("heading", { name: new RegExp(company.name) })).toBeVisible();
    await page.getByRole("button", { name: /explore the office/i }).click();
    await expect.poll(async () => (await state(page)).mode).toMatch(/overview|cameraTransition/);
    await expect(page.getByRole("navigation", { name: "Explore" })).toBeVisible();
    await expect(page.getByRole("img", { name: /mini-map/i })).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("WASD moves the character and walls stop it", async ({ page }) => {
    await enterOffice(page);
    // Just outside the HQ south facade, west of the door.
    await placeCharacter(page, "ground", -8, 7.4, Math.PI);
    await faceNorth(page);
    const before = await player(page);
    await holdKey(page, "KeyW", 2200);
    const after = await player(page);
    expect((await state(page)).mode).toBe("walking");
    expect(before.z - after.z).toBeGreaterThan(1.2); // moved north…
    expect(after.z).toBeGreaterThan(5.3); // …but not through the glass facade (z = 5)
    expect(Math.abs(after.x - before.x)).toBeLessThan(0.5);
    await holdKey(page, "KeyD", 900);
    expect((await player(page)).x).toBeGreaterThan(after.x + 1);
  });

  test("arrow keys move and the quay railing bounds the world", async ({ page }) => {
    await enterOffice(page);
    await placeCharacter(page, "ground", -20, 39, 0);
    await faceNorth(page);
    await holdKey(page, "ArrowDown", 2500);
    const p = await player(page);
    expect(p.z).toBeGreaterThan(40);
    expect(p.z).toBeLessThanOrEqual(43.41);
  });

  test("destination menu walks to Reception and opens its card", async ({ page }) => {
    await enterOffice(page);
    await page.getByRole("button", { name: "Map", exact: true }).click();
    await page.getByRole("region", { name: "Destinations" }).getByRole("button", { name: /^Reception/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Walking to" })).toBeVisible();
    await waitForArrival(page);
    const p = await player(page);
    expect(Math.hypot(p.x - 0, p.z + 0.9)).toBeLessThan(0.8);
    await expect(page.locator("#info-title")).toHaveText("Reception");
    expect((await state(page)).location.zoneLabel).toBe("Reception");
  });

  test("routes across floors through the elevator", async ({ page }) => {
    await enterOffice(page);
    await placeCharacter(page, "ground", 4, 12, Math.PI);
    await cvo(page, "navigate", "room-conference");
    await waitForArrival(page, 90_000);
    const p = await player(page);
    expect(p.level).toBe("hq-1");
    expect(Math.hypot(p.x - 4.5, p.z + 3.7)).toBeLessThan(0.8);
    const s = await state(page);
    expect(s.cutLevels.hq).toBe(1); // roof hidden so Level 1 is visible
    expect(s.selectedContentId).toBe("room-conference");
    await expect(page.locator("#info-title")).toHaveText("Conference Room");
  });

  test("clicking the floor walks there (click-to-move)", async ({ page }) => {
    await enterOffice(page);
    await placeCharacter(page, "ground", 4, 12, Math.PI);
    const target = await cvo<{ x: number; y: number }>(page, "floorScreen", "ground", 11, 12);
    await page.mouse.click(target.x, target.y);
    await waitForArrival(page);
    const p = await player(page);
    expect(Math.hypot(p.x - 11, p.z - 12)).toBeLessThan(0.6);
  });

  test("camera zoom, rotate and overview reset", async ({ page }) => {
    await enterOffice(page);
    await placeCharacter(page, "ground", 4, 20, Math.PI);
    const d0 = (await cvo<{ distance: number }>(page, "cam")).distance;
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.waitForTimeout(1200);
    const d1 = (await cvo<{ distance: number }>(page, "cam")).distance;
    expect(d1).toBeLessThan(d0 * 0.9);
    const a0 = (await cvo<{ azimuth: number }>(page, "cam")).azimuth;
    await page.getByRole("button", { name: "Rotate view left" }).click();
    await page.waitForTimeout(1200);
    expect(Math.abs((await cvo<{ azimuth: number }>(page, "cam")).azimuth - a0)).toBeGreaterThan(0.5);
    await page.getByRole("button", { name: "Overview" }).click();
    await expect.poll(async () => (await state(page)).mode, { timeout: 10_000 }).toBe("overview");
    const cam = await cvo<{ distance: number; polar: number }>(page, "cam");
    expect(cam.distance).toBeGreaterThan(120);
    expect(cam.polar).toBeLessThan((64 * Math.PI) / 180 + 0.01); // never below the horizon clamp
  });

  test("Floors menu cuts the building open on the chosen floor", async ({ page }) => {
    await enterOffice(page);
    await page.getByRole("button", { name: "Floors", exact: true }).click();
    await page.getByRole("button", { name: "View Headquarters Level 1" }).click();
    await expect.poll(async () => (await state(page)).cutLevels.hq).toBe(1);
    await page.waitForTimeout(1500);
    const cam = await cvo<{ targetY: number; targetX: number; targetZ: number }>(page, "cam");
    expect(Math.abs(cam.targetY - 4.7)).toBeLessThan(0.6);
    expect(Math.hypot(cam.targetX, cam.targetZ + 6)).toBeLessThan(2);
  });

  test("honours reduced motion with instant camera moves", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await enterOffice(page);
    await placeCharacter(page, "ground", 4, 20, Math.PI);
    expect((await cvo<{ distance: number }>(page, "cam")).distance).toBeLessThan(60);
    await page.getByRole("button", { name: "Overview" }).click();
    await page.waitForTimeout(150);
    expect((await cvo<{ distance: number }>(page, "cam")).distance).toBeGreaterThan(140);
  });

  test("Return to entrance resets the character", async ({ page }) => {
    await enterOffice(page);
    await placeCharacter(page, "ground", -30, 20);
    await page.getByRole("button", { name: "Map", exact: true }).click();
    await page.getByRole("button", { name: "Entrance", exact: true }).click();
    await page.waitForTimeout(500);
    const p = await player(page);
    expect(Math.hypot(p.x - 4, p.z - 34.5)).toBeLessThan(0.3);
  });
});
