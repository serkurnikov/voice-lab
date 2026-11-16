import { describe, expect, it } from "vitest";
import { DEEPGRAM_PROMPT, SYSTEM_PROMPT, TOOL_NAMES } from "./persona";

describe("persona", () => {
  it("is a car-service desk that names every client tool", () => {
    expect(SYSTEM_PROMPT).toMatch(/car service/i);
    for (const name of TOOL_NAMES) expect(SYSTEM_PROMPT).toContain(name);
  });

  it("books only after the customer confirms and the phone is read back", () => {
    expect(SYSTEM_PROMPT).toMatch(/book_appointment only after the customer has confirmed/);
    expect(SYSTEM_PROMPT).toMatch(/read back/);
  });

  it("speaks Russian or English on ElevenLabs, English only on the backup", () => {
    expect(SYSTEM_PROMPT).toMatch(/Russian or English/);
    expect(DEEPGRAM_PROMPT).toMatch(/Always reply in English/);
    expect(DEEPGRAM_PROMPT).not.toMatch(/Russian/);
  });
});
