import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PilotEndedNotice } from "./pilot-ended";

describe("expired pilot dashboard state", () => {
  it("explains that reads and data remain available", () => {
    const html = renderToStaticMarkup(PilotEndedNotice());
    expect(html).toContain("Pilot ended");
    expect(html).toContain("read-only");
    expect(html).toContain("business history are safe");
  });
});
