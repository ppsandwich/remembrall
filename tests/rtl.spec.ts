import { test, expect } from "@playwright/test";
import path from "path";

test("contentEditable text direction", async ({ page }) => {
  const filePath = path.resolve(__dirname, "rtl-test.html");
  await page.goto(`file://${filePath}`);

  // Click "Check Computed Directions" to get baseline
  await page.click("#checkBtn");
  const results = await page.textContent("#results");
  console.log("=== Computed CSS direction values ===");
  console.log(results);

  // Type text into each editor and check caret/cursor behavior
  const editors = [
    { id: "#editor1", label: "No direction set" },
    { id: "#editor2", label: 'dir="ltr" attribute' },
    { id: "#editor3", label: "CSS direction: ltr" },
    { id: "#editor4", label: "CSS direction: ltr + unicode-bidi: isolate-override" },
    { id: "#editor5", label: "All combined" },
  ];

  for (const { id, label } of editors) {
    await page.click(id);
    await page.keyboard.type("Hello World");
    const text = await page.textContent(id);
    console.log(`${label}: text content = "${text}"`);
  }

  // Type into textarea for comparison
  await page.click("textarea");
  await page.keyboard.type("Hello World");
  const taText = await page.inputValue("textarea");
  console.log(`textarea: text content = "${taText}"`);

  // Check computed directions after typing
  await page.click("#checkBtn");
  const afterResults = await page.textContent("#results");
  console.log("\n=== After typing ===");
  console.log(afterResults);

  // Check that all editors have direction: ltr
  for (const { id, label } of editors) {
    const direction = await page.$eval(id, (el) => getComputedStyle(el).direction);
    expect(direction).toBe("ltr");
  }
});
