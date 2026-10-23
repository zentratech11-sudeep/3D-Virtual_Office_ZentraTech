import { expect, test } from "@playwright/test";
import { cvo, enterOffice, placeCharacter, player, state } from "./helpers";

test.describe("touch / narrow viewport", () => {
  test("shows a joystick and touch-sized controls instead of the keyboard legend", async ({ page }) => {
    await enterOffice(page);
    expect((await state(page)).touchControls).toBe(true);
    await expect(page.getByRole("application", { name: /joystick/i })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Controls" })).toHaveCount(0);
    for (const name of ["Zoom in", "Zoom out", "Center on my character"]) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(40);
    }
  });

  test("the joystick walks the character", async ({ page }) => {
    await enterOffice(page);
    await placeCharacter(page, "ground", 4, 22);
    const before = await player(page);
    const box = (await page.getByRole("application", { name: /joystick/i }).boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 50, { steps: 4 });
    await page.waitForTimeout(1500);
    await page.mouse.up();
    const after = await player(page);
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(2);
    expect((await state(page)).mode).toBe("walking");
  });

  test("panels fit the screen and a tap selects objects", async ({ page }) => {
    const vw = page.viewportSize()!.width;
    await enterOffice(page);
    await page.getByRole("button", { name: "Map" }).click();
    const panel = (await page.getByRole("region", { name: "Destinations" }).boundingBox())!;
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(vw + 1);
    await page.getByRole("button", { name: "Close Destinations" }).click();
    await placeCharacter(page, "ground", 4, 10.8);
    const p = await cvo<{ x: number; y: number }>(page, "anchorScreen", "anchor-fountain");
    await page.touchscreen.tap(p.x, p.y);
    const card = page.getByRole("dialog", { name: "Harbour Fountain" });
    await expect(card).toBeVisible();
    const cb = (await card.boundingBox())!;
    expect(cb.x).toBeGreaterThanOrEqual(0);
    expect(cb.x + cb.width).toBeLessThanOrEqual(vw + 1);
  });
});
