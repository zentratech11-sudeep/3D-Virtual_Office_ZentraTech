import { expect, test } from "@playwright/test";
import { enterOffice } from "./helpers";

test.describe("contact and meeting enquiries", () => {
  test("validates fields and focuses the first problem", async ({ page }) => {
    await enterOffice(page);
    await page.getByRole("button", { name: "Contact us" }).click();
    const dialog = page.getByRole("dialog", { name: "Get in touch" });
    await dialog.getByRole("button", { name: "Send message" }).click();
    await expect(dialog.getByText("Please enter your name.")).toBeVisible();
    await expect(dialog.getByText("Please enter a valid email address.")).toBeVisible();
    await expect(dialog.getByText(/at least 10 characters/)).toBeVisible();
    await expect(dialog.getByText(/confirm you agree/)).toBeVisible();
    await expect(dialog.getByLabel(/^Name/)).toBeFocused();
    await expect(dialog.getByLabel(/^Name/)).toHaveAttribute("aria-invalid", "true");
  });

  test("without a configured endpoint it hands off to email and never claims success", async ({ page }) => {
    await enterOffice(page);
    await page.getByRole("button", { name: "Contact us" }).click();
    const dialog = page.getByRole("dialog", { name: "Get in touch" });
    await dialog.getByLabel(/^Name/).fill("Ada Lovelace");
    await dialog.getByLabel(/^Email/).fill("ada@example.com");
    await dialog.getByLabel(/^Message/).fill("We'd like to talk about a new mobile app.");
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Send message" }).click();
    await expect(dialog.getByText("Your message hasn't been sent yet.")).toBeVisible();
    await expect(dialog.getByText("Message sent")).toHaveCount(0);
    const link = dialog.getByRole("link", { name: /Open email app/ });
    await expect(link).toHaveAttribute("href", /^mailto:hello@yourcompany\.example\?subject=/);
  });

  test("conference room card opens a meeting request without claiming live availability", async ({ page }) => {
    await enterOffice(page);
    await page.evaluate(() => (window as never as { __CVO__: { navigate: (d: string) => void } }).__CVO__.navigate("room-conference"));
    await page.getByRole("button", { name: "Skip" }).click();
    const card = page.getByRole("dialog", { name: "Conference Room" });
    await expect(card).toContainText("12 people");
    await expect(card).toContainText("doesn't show live availability");
    await card.getByRole("button", { name: "Request a booking" }).click();
    const dialog = page.getByRole("dialog", { name: "Book a meeting" });
    await expect(dialog.getByLabel("Topic")).toHaveValue("meeting");
    await expect(dialog.getByRole("button", { name: "Request meeting" })).toBeVisible();
  });

  test("the CEO profile offers an appointment request", async ({ page }) => {
    await enterOffice(page);
    await page.evaluate(() => (window as never as { __CVO__: { show: (id: string) => void } }).__CVO__.show("person-ceo"));
    await page.getByRole("dialog", { name: "Daniel Reyes" }).getByRole("button", { name: "Request an appointment" }).click();
    const dialog = page.getByRole("dialog", { name: "Book a meeting" });
    await expect(dialog.getByLabel("Topic")).toHaveValue("meeting");
    await expect(dialog).toContainText("Daniel Reyes");
  });

  test("the optional API route validates and reports when delivery isn't configured", async ({ request }) => {
    const valid = { name: "Ada Lovelace", email: "ada@example.com", message: "Hello there, testing.", consent: true, topic: "general" };
    const invalid = await request.post("/api/contact", { data: { ...valid, email: "nope" } });
    expect(invalid.status()).toBe(400);
    expect((await invalid.json()).ok).toBe(false);
    const unconfigured = await request.post("/api/contact", { data: valid });
    expect(unconfigured.status()).toBe(503);
    expect(await unconfigured.json()).toMatchObject({ ok: false });
    const wrongType = await request.post("/api/contact", { data: "x", headers: { "content-type": "text/plain" } });
    expect(wrongType.status()).toBe(415);
  });
});
