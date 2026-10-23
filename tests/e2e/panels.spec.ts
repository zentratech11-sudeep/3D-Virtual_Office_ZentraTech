import { expect, test } from "@playwright/test";
import { company } from "../../src/data/company";
import { clickAnchor, enterOffice, placeCharacter, player, state } from "./helpers";

test.describe("panels and input isolation", () => {
  test("info card closes with the close button and with Escape", async ({ page }) => {
    await enterOffice(page);
    await placeCharacter(page, "ground", 4, 10.8);
    await clickAnchor(page, "anchor-fountain");
    await expect(page.locator("#info-title")).toBeVisible();
    await page.getByRole("button", { name: "Close information panel" }).click();
    await expect(page.locator("#info-title")).toHaveCount(0);
    expect((await state(page)).selectedContentId).toBeNull();

    await clickAnchor(page, "anchor-fountain");
    await expect(page.locator("#info-title")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#info-title")).toHaveCount(0);
  });

  test("clicks on the interface never reach the 3D scene", async ({ page }) => {
    await enterOffice(page);
    await placeCharacter(page, "ground", 4, 10.8);
    await clickAnchor(page, "anchor-fountain");
    const card = page.getByRole("dialog", { name: "Harbour Fountain" });
    await expect(card).toBeVisible();
    const before = await player(page);
    const box = (await card.boundingBox())!;
    // Click empty space on the card, the legend and the mini-map frame.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height - 12);
    await page.getByRole("complementary", { name: "Controls" }).click({ position: { x: 20, y: 20 } });
    await page.waitForTimeout(800);
    const after = await player(page);
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.05);
    expect((await state(page)).nav.state).toBe("idle");
  });

  test("typing in the contact form does not move the character", async ({ page }) => {
    await enterOffice(page);
    await placeCharacter(page, "ground", 4, 20);
    const before = await player(page);
    await page.getByRole("button", { name: "Contact us" }).click();
    const name = page.getByLabel(/^Name/);
    await expect(name).toBeFocused();
    await name.pressSequentially("wasd wasd", { delay: 30 });
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(600);
    await page.keyboard.up("ArrowUp");
    expect((await state(page)).mode).toBe("panelOpen");
    const after = await player(page);
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.01);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Get in touch" })).toHaveCount(0);
    // Focus returns to the button that opened the dialog.
    await expect(page.getByRole("button", { name: "Contact us" })).toBeFocused();
  });

  test("help and company information are available as plain HTML", async ({ page }) => {
    await enterOffice(page);
    await page.getByRole("button", { name: "Help and controls" }).click();
    await expect(page.getByRole("dialog", { name: "Help & controls" })).toContainText("W A S D");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "About us" }).click();
    const about = page.getByRole("dialog", { name: "About us" });
    for (const h of [`About ${company.name}`, "Services", "Selected work", "Meet the team", "Contact & visits"]) {
      await expect(about.getByRole("heading", { name: h })).toBeVisible();
    }
  });

  test("graphics quality can be switched", async ({ page }) => {
    await enterOffice(page);
    await page.getByRole("button", { name: "Graphics settings" }).click();
    await page.getByRole("radio", { name: /Low/ }).check();
    await expect.poll(async () => page.evaluate(() => (window as never as { __CVO__: { state: () => { qualityTier: string } } }).__CVO__.state().qualityTier)).toBe("low");
  });
});
