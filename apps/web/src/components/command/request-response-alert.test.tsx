import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RequestResponseAlert, requestResponseText } from "./request-response-alert";

describe("request response alert", () => {
  it("stays hidden at zero", () => {
    expect(requestResponseText(0)).toBeNull();
    expect(renderToStaticMarkup(<RequestResponseAlert count={0} />)).toBe("");
  });

  it("uses correct singular and plural language", () => {
    expect(requestResponseText(1)).toBe("1 request needs a response");
    expect(requestResponseText(2)).toBe("2 requests need a response");
  });

  it("targets the existing action-required response queue", () => {
    const html = renderToStaticMarkup(<RequestResponseAlert count={2} />);
    expect(html).toContain('href="#action-required"');
    expect(html).toContain("2 requests need a response");
  });
});
