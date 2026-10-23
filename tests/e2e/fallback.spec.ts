import { expect, test } from "@playwright/test";
import { enterOffice, state } from "./helpers";

test.describe("fallbacks", () => {
  test("shows the full 2D experience when WebGL is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (String(type).startsWith("webgl")) return null;
        return (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof original;
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "The 3D office isn't available right now" })).toBeVisible();
    await expect(page.getByText(/doesn't support WebGL/)).toBeVisible();
    for (const h of ["Services", "Selected work", "Meet the team"]) await expect(page.getByRole("heading", { name: h })).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.getByRole("button", { name: "Contact us" }).click();
    await expect(page.getByRole("dialog", { name: "Get in touch" })).toBeVisible();
  });

  test("recovers to the fallback if the graphics context is lost", async ({ page }) => {
    await enterOffice(page);
    await page.evaluate(() => {
      const canvas = document.querySelector("canvas")!;
      const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext;
      gl.getExtension("WEBGL_lose_context")!.loseContext();
    });
    await expect.poll(async () => (await state(page)).mode).toBe("errorFallback");
    await expect(page.getByRole("heading", { name: "The 3D office isn't available right now" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try 3D again" })).toBeVisible();
  });

  test("the 2D version is reachable from the intro", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.getByRole("button", { name: "View 2D version" }).click({ timeout: 90_000 });
    await expect(page.getByRole("dialog", { name: "About us" })).toBeVisible();
  });
});
