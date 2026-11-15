import { test, expect, type Page } from "@playwright/test";

/**
 * Browser tests for the real contact form.
 *
 * `/api/contact` does not exist on the local `vite preview` server, so every
 * test intercepts the request with `page.route` and replays deterministic
 * fixtures. No real email is sent and no credentials are needed.
 */

interface MockSpec {
  status: number;
  body?: unknown;
  delayMs?: number;
}

async function mockContact(
  page: Page,
  responses: MockSpec[],
): Promise<Array<{ method: string; postData: string | null }>> {
  const requests: Array<{ method: string; postData: string | null }> = [];
  let call = 0;
  await page.route("**/api/contact", async (route) => {
    requests.push({ method: route.request().method(), postData: route.request().postData() });
    const spec = responses[Math.min(call, responses.length - 1)];
    call += 1;
    if (spec.delayMs) await page.waitForTimeout(spec.delayMs);
    await route.fulfill({
      status: spec.status,
      contentType: "application/json",
      body: JSON.stringify(spec.body ?? { ok: true }),
    });
  });
  return requests;
}

async function openContactForm(page: Page): Promise<void> {
  await page.goto("/contact", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main#main")).toBeVisible();
  // Fresh profile: the consent banner is up; answer "necessary only".
  await page
    .locator('.cm button[data-role="necessary"]')
    .click({ timeout: 3000 })
    .catch(() => {});
}

async function fillValidForm(page: Page): Promise<void> {
  await page.locator("#name").fill("Ada Lovelace");
  await page.locator("#email").fill("ada@example.com");
  await page.locator("#project-type").click();
  await page.locator('[role="option"]').filter({ hasText: "AI Voice Agent" }).first().click();
  await page.locator("#message").fill("I would like to discuss a voice agent for our support team.");
}

test.describe("contact form — real submission flow", () => {
  test("shows an honest loading state and succeeds on 200", async ({ page }) => {
    await openContactForm(page);
    const requests = await mockContact(page, [{ status: 200, delayMs: 400 }]);
    await fillValidForm(page);

    await page.locator('button[type="submit"]').click();

    // While in flight: honest loading state, submit disabled.
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    await expect(page.locator('button[type="submit"]')).toContainText("Sending…");
    await expect(page.locator('[role="status"].sr-only')).toBeVisible();

    // On 200: success panel, wording confirming submission to the email service.
    await expect(page.locator('[role="status"] h3')).toHaveText("Message submitted");
    await expect(page.locator('[role="status"]')).toContainText(
      "submitted to the email service",
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("POST");
    const payload = JSON.parse(requests[0].postData ?? "{}");
    expect(payload).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      projectType: "AI Voice Agent",
      message: "I would like to discuss a voice agent for our support team.",
      company: "",
    });

    // No simulated-success wording anywhere.
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.toLowerCase()).not.toContain("demo");
    expect(bodyText.toLowerCase()).not.toContain("simulat");
  });

  test("shows field errors from a 400 validation response", async ({ page }) => {
    await openContactForm(page);
    const requests = await mockContact(page, [
      {
        status: 400,
        body: {
          ok: false,
          error: {
            code: "validation",
            fields: { message: "Message must be at least 10 characters." },
          },
        },
      },
    ]);
    await fillValidForm(page);
    await page.locator('button[type="submit"]').click();

    const alert = page.locator('[role="alert"]').filter({ hasText: "10 characters" });
    await expect(alert).toBeVisible();
    // Button re-enabled so the visitor can correct and retry.
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
    expect(requests).toHaveLength(1);
  });

  test("shows rate-limit messaging on 429", async ({ page }) => {
    await openContactForm(page);
    await mockContact(page, [
      { status: 429, body: { ok: false, error: { code: "rate_limited", retryAfterSeconds: 120 } } },
    ]);
    await fillValidForm(page);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[role="alert"]')).toContainText("Too many attempts");
    await expect(page.locator('[role="alert"]')).toContainText("2 minutes");
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test("retries exactly once on 5xx and succeeds", async ({ page }) => {
    await openContactForm(page);
    const requests = await mockContact(page, [{ status: 500 }, { status: 200 }]);
    await fillValidForm(page);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[role="status"] h3')).toHaveText("Message submitted");
    expect(requests).toHaveLength(2);
  });

  test("shows an honest failure panel after two 5xx responses", async ({ page }) => {
    await openContactForm(page);
    const requests = await mockContact(page, [{ status: 500 }, { status: 500 }, { status: 200 }]);
    await fillValidForm(page);
    await page.locator('button[type="submit"]').click();

    // PR-B ErrorState pattern: role=alert, no focus theft, retry control.
    const panel = page.locator('[role="alert"]').filter({ hasText: "couldn't send your message" });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("was not sent");

    // Retry from the panel works.
    await panel.locator('button:has-text("Try again")').click();
    await expect(page.locator('[role="status"] h3')).toHaveText("Message submitted");
    expect(requests).toHaveLength(3);
  });

  test("client-side validation fires before any request", async ({ page }) => {
    await openContactForm(page);
    const requests = await mockContact(page, [{ status: 200 }]);
    await page.locator("#name").fill("Ada");
    await page.locator("#message").fill("short");
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[role="alert"]').filter({ hasText: "at least 10 characters" })).toBeVisible();
    expect(requests).toHaveLength(0);
  });

  test("honeypot is invisible, off-screen and outside the keyboard order", async ({ page }) => {
    await openContactForm(page);
    await mockContact(page, [{ status: 200 }]);

    const honeypot = page.locator("#company");
    // Not exposed to assistive technology.
    await expect(page.locator('[aria-hidden="true"] #company')).toHaveCount(1);
    // Unreachable by keyboard.
    await expect(honeypot).toHaveAttribute("tabindex", "-1");
    await expect(honeypot).toHaveAttribute("autocomplete", "off");
    // Off-screen.
    const box = await honeypot.boundingBox();
    expect(box === null || box.x < 0 || box.y < 0).toBe(true);

    // Tabbing through the form never lands on it.
    await page.locator("#name").focus();
    for (let i = 0; i < 10; i += 1) await page.keyboard.press("Tab");
    const activeId = await page.evaluate(() => document.activeElement?.id ?? "");
    expect(activeId).not.toBe("company");
  });

  test("client length limits match the server limits", async ({ page }) => {
    await openContactForm(page);
    await mockContact(page, [{ status: 200 }]);
    await expect(page.locator("#name")).toHaveAttribute("maxlength", "100");
    await expect(page.locator("#email")).toHaveAttribute("maxlength", "254");
    await expect(page.locator("#message")).toHaveAttribute("maxlength", "2000");
  });
});
