import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EventBus } from "../lib/events";
import { Transcript } from "./Transcript";

afterEach(cleanup);

test("download saves the conversation on screen as a text file", async () => {
  const blobs: Blob[] = [];
  URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), "blob:x"));
  URL.revokeObjectURL = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const bus = new EventBus();
  render(<Transcript bus={bus} />);

  act(() => {
    bus.emit({ type: "stt-result", result: { text: "меня зовут Анна", words: [] } });
    bus.emit({ type: "agent-reply", text: "Здравствуйте, Анна.", at: 0 });
  });
  fireEvent.click(screen.getByRole("button", { name: /download/i }));

  expect(click).toHaveBeenCalled();
  expect(await readText(blobs[0])).toBe("you: меня зовут Анна\nagent: Здравствуйте, Анна.\n");
});

// jsdom's Blob has no .text(); FileReader is the jsdom-native way in.
const readText = (b: Blob) =>
  new Promise<string>((done) => {
    const r = new FileReader();
    r.onload = () => done(r.result as string);
    r.readAsText(b);
  });
