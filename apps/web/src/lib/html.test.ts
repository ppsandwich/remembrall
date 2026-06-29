import { describe, it, expect } from "vitest";
import {
  isHtml,
  plainTextToHtml,
  htmlToPlainText,
  derivePreviewFromHtml,
} from "./html.js";

describe("isHtml", () => {
  it("returns true for HTML strings", () => {
    expect(isHtml("<p>Hello</p>")).toBe(true);
    expect(isHtml("<div>test</div>")).toBe(true);
    expect(isHtml("<br>")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(isHtml("Hello world")).toBe(false);
    expect(isHtml("No tags here")).toBe(false);
    expect(isHtml("")).toBe(false);
  });

  it("returns false for angle brackets that are not tags", () => {
    expect(isHtml("a < b > c")).toBe(false);
  });
});

describe("plainTextToHtml", () => {
  it("wraps text in <p> tags", () => {
    expect(plainTextToHtml("Hello")).toBe("<p>Hello</p>");
  });

  it("converts single newlines to <br>", () => {
    expect(plainTextToHtml("Line 1\nLine 2")).toBe(
      "<p>Line 1<br>Line 2</p>"
    );
  });

  it("converts double newlines to separate paragraphs", () => {
    expect(plainTextToHtml("First\n\nSecond")).toBe(
      "<p>First</p><p>Second</p>"
    );
  });

  it("handles triple newlines as paragraph breaks", () => {
    expect(plainTextToHtml("A\n\n\nB")).toBe("<p>A</p><p>B</p>");
  });

  it("returns empty string for whitespace only", () => {
    expect(plainTextToHtml("   ")).toBe("");
    expect(plainTextToHtml("\n\n")).toBe("");
  });

  it("preserves multiple lines within a paragraph", () => {
    expect(plainTextToHtml("A\nB\nC")).toBe("<p>A<br>B<br>C</p>");
  });
});

describe("htmlToPlainText", () => {
  it("returns plain text unchanged", () => {
    expect(htmlToPlainText("Hello world")).toBe("Hello world");
  });

  it("strips HTML tags", () => {
    expect(htmlToPlainText("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("converts <br> to newlines", () => {
    expect(htmlToPlainText("Line 1<br>Line 2")).toBe("Line 1\nLine 2");
  });

  it("converts <p> to double newlines", () => {
    expect(htmlToPlainText("<p>First</p><p>Second</p>")).toBe(
      "First\n\nSecond"
    );
  });

  it("converts <li> to bullet points", () => {
    expect(htmlToPlainText("<ul><li>Item 1</li><li>Item 2</li></ul>")).toBe(
      "• Item 1\n• Item 2"
    );
  });

  it("converts <div> to newlines", () => {
    expect(htmlToPlainText("<div>A</div><div>B</div>")).toBe("A\nB");
  });

  it("decodes HTML entities", () => {
    expect(htmlToPlainText("<p>&amp; &lt; &gt; &quot;</p>")).toBe(
      '& < > "'
    );
  });

  it("decodes &nbsp;", () => {
    expect(htmlToPlainText("<p>hello&nbsp;world</p>")).toBe(
      "hello world"
    );
  });

  it("collapses multiple newlines", () => {
    expect(htmlToPlainText("<p>A</p><p>B</p><p>C</p>")).toBe(
      "A\n\nB\n\nC"
    );
  });

  it("returns empty string for empty HTML", () => {
    expect(htmlToPlainText("")).toBe("");
  });
});

describe("derivePreviewFromHtml", () => {
  it("returns 'Empty note' for empty string", () => {
    expect(derivePreviewFromHtml("")).toBe("Empty note");
  });

  it("returns 'Empty note' for whitespace only", () => {
    expect(derivePreviewFromHtml("   \n  ")).toBe("Empty note");
  });

  it("returns plain text as-is", () => {
    expect(derivePreviewFromHtml("Hello world")).toBe("Hello world");
  });

  it("strips HTML tags", () => {
    expect(derivePreviewFromHtml("<p>Hello <b>world</b></p>")).toBe(
      "Hello world"
    );
  });

  it("converts <br> to newlines", () => {
    expect(derivePreviewFromHtml("Line 1<br>Line 2")).toBe(
      "Line 1\nLine 2"
    );
  });

  it("converts <li> to bullet points", () => {
    expect(
      derivePreviewFromHtml("<ul><li>Item 1</li><li>Item 2</li></ul>")
    ).toBe("• Item 1\n• Item 2");
  });

  it("truncates at 280 characters", () => {
    const long = "<p>" + "a".repeat(300) + "</p>";
    const result = derivePreviewFromHtml(long);
    expect(result).toHaveLength(281); // 280 + ellipsis
    expect(result).toMatch(/…$/);
  });

  it("limits to 7 lines", () => {
    const body = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`).join(
      "<br>"
    );
    const result = derivePreviewFromHtml(body);
    expect(result.split("\n")).toHaveLength(7);
  });

  it("decodes HTML entities", () => {
    expect(derivePreviewFromHtml("<p>&amp; &lt; &gt;</p>")).toBe("& < >");
  });
});
