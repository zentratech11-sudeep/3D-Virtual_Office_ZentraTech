import { expect, test } from "@playwright/test";
import { clickAnchor, cvo, enterOffice, placeAtAnchor, placeCharacter, player, resolveAnchor, state } from "./helpers";

type Level = "ground" | "hq-1" | "hq-roof" | "mkt-1" | "sales-1";

// At least five distinct objects/areas must open the correct information (PRD §7.6).
// `ref` is an anchor ID or `entity:<id>` (first anchor opening that entity). Without `at`,
// the character stands at the anchor's walk-up point, as "Take me there" would leave it.
const TARGETS: Array<{ ref: string; title: string; at?: [Level, number, number] }> = [
  { ref: "anchor-fountain", title: "Harbour Fountain", at: ["ground", 4, 10.8] },
  { ref: "entity:plant", title: "Plant" },
  { ref: "anchor-project-atlas", title: "Atlas Mobile Banking" },
  { ref: "entity:services", title: "What we do" },
  { ref: "anchor-person-receptionist", title: "Emma Williams" },
  { ref: "anchor-person-sarah", title: "Sarah Johnson" },
  { ref: "anchor-person-ceo", title: "Daniel Reyes" },
  { ref: "anchor-seat-engineering-1", title: "Lena Fischer" },
  { ref: "entity:room-conference", title: "Conference Room" },
  { ref: "anchor-person-david", title: "David Okafor" },
  { ref: "anchor-person-maya", title: "Maya Chen" },
  { ref: "anchor-pool", title: "Wellness Pool", at: ["ground", -36.8, -35.5] },
];

test.describe("selectable objects", () => {
  for (const t of TARGETS) {
    test(`clicking ${t.ref} opens "${t.title}"`, async ({ page }) => {
      await enterOffice(page);
      const anchor = await resolveAnchor(page, t.ref);
      if (t.at) await placeCharacter(page, ...t.at);
      else await placeAtAnchor(page, anchor);
      await clickAnchor(page, anchor);
      await expect(page.locator("#info-title")).toHaveText(t.title);
      const s = await state(page);
      expect(s.mode).toBe("objectSelected");
      expect(s.selectedAnchorId).toBe(anchor);
    });
  }

  test("a person card offers a working Contact action", async ({ page }) => {
    await enterOffice(page);
    await placeAtAnchor(page, "anchor-person-sarah");
    await clickAnchor(page, "anchor-person-sarah");
    await page.getByRole("dialog", { name: "Sarah Johnson" }).getByRole("button", { name: "Contact Sarah" }).click();
    const modal = page.getByRole("dialog", { name: "Get in touch" });
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Message for Sarah Johnson");
  });

  test("the elevator card lets the visitor ride to the rooftop", async ({ page }) => {
    await enterOffice(page);
    await placeCharacter(page, "ground", 0, -10.4, Math.PI);
    await clickAnchor(page, "anchor-elevator-ground");
    await expect(page.locator("#info-title")).toHaveText("Elevator");
    await page.getByRole("button", { name: /^Rooftop/ }).click();
    await expect.poll(async () => (await player(page)).level, { timeout: 30_000 }).toBe("hq-roof");
  });

  test("hovering an object shows its name", async ({ page }) => {
    await enterOffice(page);
    await placeCharacter(page, "ground", 4, 10.8);
    const p = await cvo<{ x: number; y: number }>(page, "anchorScreen", "anchor-fountain");
    await page.mouse.move(p.x - 20, p.y);
    await page.mouse.move(p.x, p.y);
    await expect.poll(async () => (await state(page)).selectedAnchorId).toBeNull();
    await expect(page.getByText("Click for details")).toBeVisible();
  });
});
