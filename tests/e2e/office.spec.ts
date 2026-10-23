import { expect, test } from "@playwright/test";
import { cvo, enterOffice, faceNorth, holdKey, placeCharacter, player, state, waitForArrival } from "./helpers";

test.describe("corporate office", () => {
  test("staff directory: search, open a profile, then walk to their desk", async ({ page }) => {
    await enterOffice(page);
    await page.getByRole("button", { name: "Directory", exact: true }).click();
    const dir = page.getByRole("dialog", { name: "Staff directory" });
    const search = dir.getByRole("searchbox");
    await expect(search).toBeFocused();
    await search.fill("design lead");
    const rows = dir.getByRole("list", { name: "Staff" }).getByRole("listitem");
    await expect(rows.first()).toContainText("Maya Chen");
    await expect(rows.first()).toContainText("UI/UX Design Studio");

    // Department filter narrows the list.
    await search.fill("");
    await dir.getByRole("button", { name: "Engineering", exact: true }).click();
    await expect(rows.first()).toContainText("Arjun Mehta");
    await dir.getByRole("button", { name: "All teams" }).click();
    await search.fill("maya");

    await dir.getByRole("button", { name: /^Maya Chen, Design Lead/ }).click();
    await expect(dir).toHaveCount(0);
    await expect(page.locator("#info-title")).toHaveText("Maya Chen");
    const s = await state(page);
    expect(s.selectedContentId).toBe("person-maya");
    expect(s.cutLevels.marketing).toBe(1); // pavilion opened up to her floor

    await page.getByRole("dialog", { name: "Maya Chen" }).getByRole("button", { name: "Take me there" }).click();
    await expect.poll(async () => (await state(page)).nav.state).toBe("moving");
    await waitForArrival(page, 90_000);
    const p = await player(page);
    const maya = await cvo<{ p: [number, number, number] }>(page, "anchor", "anchor-person-maya");
    expect(p.level).toBe("mkt-1");
    expect(Math.hypot(p.x - maya.p[0], p.z - maya.p[2])).toBeLessThan(2.5);
  });

  test("team cabin card lists the lead and members; Back returns to the room", async ({ page }) => {
    await enterOffice(page);
    await cvo(page, "show", "room-engineering");
    const card = page.getByRole("dialog", { name: "Engineering Cabin" });
    await expect(card).toContainText("Team lead");
    await expect(card).toContainText("Arjun Mehta");
    await expect(card).toContainText("Active projects");
    await card.getByRole("button", { name: /Lena Fischer/ }).click();
    await expect(page.locator("#info-title")).toHaveText("Lena Fischer");
    await page.getByRole("button", { name: "Back to previous card" }).click();
    await expect(page.locator("#info-title")).toHaveText("Engineering Cabin");
    await expect(page.getByRole("button", { name: "Back to previous card" })).toHaveCount(0);
  });

  test("reception card introduces the company and opens the directory", async ({ page }) => {
    await enterOffice(page);
    await cvo(page, "show", "room-reception");
    const card = page.getByRole("dialog", { name: "Reception" });
    await expect(card).toContainText("Your host");
    await expect(card).toContainText("Emma Williams");
    await expect(card).toContainText("Visitor guidance");
    await card.getByRole("button", { name: "Staff directory" }).click();
    await expect(page.getByRole("dialog", { name: "Staff directory" })).toBeVisible();
  });

  test("walking into the CEO cabin opens the CEO profile", async ({ page }) => {
    await enterOffice(page);
    await placeCharacter(page, "hq-1", 7.8, -5.6, Math.PI);
    await faceNorth(page);
    await holdKey(page, "KeyW", 900);
    await expect.poll(async () => (await state(page)).selectedContentId, { timeout: 10_000 }).toBe("person-ceo");
    await expect(page.getByRole("dialog", { name: "Daniel Reyes" })).toContainText("Vision & leadership message");
    expect((await state(page)).location.zoneLabel).toBe("CEO Cabin");
  });

  test("destination menu groups rooms by building and floor", async ({ page }) => {
    await enterOffice(page);
    await page.getByRole("button", { name: "Map", exact: true }).click();
    const menu = page.getByRole("region", { name: "Destinations" });
    for (const h of ["Campus", "Headquarters · Ground floor", "Headquarters · Level 1", "Marketing pavilion · Upper floor"]) {
      await expect(menu.getByRole("heading", { name: h })).toBeVisible();
    }
    await menu.getByRole("button", { name: /^Engineering Cabin/ }).click();
    await expect.poll(async () => (await state(page)).nav.state).toBe("moving");
  });

  test("room labels select rooms when zoomed in", async ({ page }) => {
    await enterOffice(page);
    await placeCharacter(page, "hq-1", 0.9, -8.2);
    const label = page.getByRole("button", { name: "CEO Cabin", exact: true });
    await expect(label).toBeVisible();
    await label.click();
    await expect(page.locator("#info-title")).toHaveText("CEO Cabin");
    await expect(label).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("directory without 3D", () => {
  test("profiles expand inline in the 2D version", async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (String(type).startsWith("webgl")) return null;
        return (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof original;
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Open staff directory" }).click();
    const dir = page.getByRole("dialog", { name: "Staff directory" });
    await dir.getByRole("searchbox").fill("priya");
    const row = dir.getByRole("button", { name: /^Priya Raman/ });
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    await expect(dir.getByRole("button", { name: "Contact Priya" })).toBeVisible();
    await expect(dir.getByRole("button", { name: /Take me to/ })).toHaveCount(0);
  });
});
