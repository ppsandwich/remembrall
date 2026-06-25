import { test, expect } from "@playwright/test";

test("RichTextEditor direction in actual app", async ({ page }) => {
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // Check if there's a contentEditable already on the page
  const existingEditors = await page.$$eval(
    "[contenteditable='true']",
    (els) =>
      els.map((el) => ({
        tag: el.tagName,
        dir: el.getAttribute("dir"),
        computedDir: getComputedStyle(el).direction,
        ariaLabel: el.getAttribute("aria-label"),
        className: el.className,
      }))
  );
  console.log(
    "Existing contentEditable elements:",
    JSON.stringify(existingEditors, null, 2)
  );

  // Check if the note editor modal is visible (it might be hidden)
  const noteEditorVisible = await page
    .locator('[aria-label="Note editor"]')
    .isVisible()
    .catch(() => false);
  console.log("Note editor visible:", noteEditorVisible);

  // Look at the full page structure
  const bodyHTML = await page.evaluate(() => {
    return document.body.innerHTML.substring(0, 2000);
  });
  console.log("Body HTML (first 2000 chars):", bodyHTML);

  // Check all style sheets for direction rules
  const directionRules = await page.evaluate(() => {
    const rules: string[] = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          const text = rule.cssText;
          if (
            text.includes("direction") &&
            !text.includes("flex-direction")
          ) {
            rules.push(text.substring(0, 200));
          }
        }
      } catch (e) {
        // cross-origin stylesheet
      }
    }
    return rules;
  });
  console.log(
    "CSS rules with 'direction':",
    JSON.stringify(directionRules, null, 2)
  );
});
