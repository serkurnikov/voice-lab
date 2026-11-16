import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ClientForm } from "./ClientForm";
import { EMPTY_PROFILE } from "./lib/formModel";

afterEach(cleanup);

describe("ClientForm", () => {
  test("shows the value under labels in the requested language", () => {
    render(<ClientForm value={{ ...EMPTY_PROFILE, name: "Иван" }} lang="ru" onChange={() => {}} />);
    expect((screen.getByLabelText(/Имя/) as HTMLInputElement).value).toBe("Иван");
    expect(screen.getByLabelText(/Телефон/)).toBeTruthy();
  });

  test("typing reports the whole next profile", () => {
    const onChange = vi.fn();
    render(<ClientForm value={{ ...EMPTY_PROFILE, name: "Ann" }} lang="en" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Car/), { target: { value: "Kia" } });
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_PROFILE, name: "Ann", car: "Kia" });
  });

  test("an invalid phone shows the localized error; untouched empty fields stay quiet", () => {
    const { rerender } = render(<ClientForm value={EMPTY_PROFILE} lang="ru" onChange={() => {}} />);
    expect(screen.queryByRole("alert")).toBeNull();
    rerender(<ClientForm value={{ ...EMPTY_PROFILE, phone: "123" }} lang="ru" onChange={() => {}} />);
    expect(screen.getByRole("alert").textContent).toMatch(/от 10 до 15/);
    rerender(<ClientForm value={{ ...EMPTY_PROFILE, phone: "123" }} lang="en" onChange={() => {}} />);
    expect(screen.getByRole("alert").textContent).toMatch(/10 to 15/);
  });

  test("a required field is flagged once the user leaves it empty", () => {
    render(<ClientForm value={EMPTY_PROFILE} lang="en" onChange={() => {}} />);
    fireEvent.blur(screen.getByLabelText(/Name/));
    expect(screen.getByRole("alert").textContent).toBe("Required");
  });
});
