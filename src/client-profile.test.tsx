import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "./App";
import { EMPTY_PROFILE, type ClientProfile } from "./lib/formModel";

// jsdom has no IndexedDB, so the store is faked; what matters is what the page reads and writes.
let stored: ClientProfile = EMPTY_PROFILE;
vi.mock("./lib/tokenStore", () => ({
  loadToken: () => Promise.resolve(""),
  saveToken: () => Promise.resolve(),
  loadProfile: () => Promise.resolve(stored),
  saveProfile: (p: ClientProfile) => {
    stored = p;
    return Promise.resolve();
  },
}));

beforeEach(() => {
  stored = { ...EMPTY_PROFILE, name: "Анна", car: "Kia Rio" };
});

afterEach(cleanup);

test("after a reload the form comes back filled from the store", async () => {
  render(<App />);

  await waitFor(() => expect((screen.getByLabelText(/Имя/) as HTMLInputElement).value).toBe("Анна"));
  expect((screen.getByLabelText(/Автомобиль/) as HTMLInputElement).value).toBe("Kia Rio");
});

test("every edit is written to the store, so the next reload sees it", async () => {
  render(<App />);
  await waitFor(() => expect((screen.getByLabelText(/Имя/) as HTMLInputElement).value).toBe("Анна"));

  fireEvent.change(screen.getByLabelText(/Телефон/), { target: { value: "+7 900 123-45-67" } });

  expect(stored).toEqual({ ...EMPTY_PROFILE, name: "Анна", car: "Kia Rio", phone: "+7 900 123-45-67" });
});
