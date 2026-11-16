import { expect, test } from "vitest";
import { readBacks, rejects } from "./readBack";

test("each label lands in its field, in either language", () => {
  expect(readBacks("Записываю имя: Анна. Верно?")).toEqual({ name: "Анна" });
  expect(readBacks("Noting your phone: +7 912 345 67 89. Correct?")).toEqual({ phone: "+7 912 345 67 89" });
  expect(readBacks("Записываю номер машины: А123ВС77. Верно?")).toEqual({ plate: "А123ВС77" });
  expect(readBacks("Записываю номер: 89001234567. Верно?")).toEqual({ phone: "89001234567" });
  expect(readBacks("Noting the car: Kia Rio 2018. Correct?")).toEqual({ car: "Kia Rio 2018" });
  expect(readBacks("Записываю услугу: Замена масла. Верно?")).toEqual({ service: "Замена масла" });
  expect(readBacks("Записываю цвет: синий. Верно?")).toEqual({});
  expect(readBacks("Телефон у вас 89001234567?")).toEqual({});
});

test("a spoken date becomes the form's date, and a plate one Cyrillic spelling", () => {
  expect(readBacks("Записываю дату: 17.11.2026 в 10:30. Верно?")).toEqual({ date: "2026-11-17 10:30" });
  expect(readBacks("Noting date: 7.1.2027. Correct?")).toEqual({ date: "2027-01-07" });
  expect(readBacks("Noting plate: a 123 bc 77. Correct?")).toEqual({ plate: "А123ВС77" });
});

test("two read-backs in one reply both come out", () => {
  expect(readBacks("Записываю имя: Анна. Верно? Записываю машину: Kia Rio. Верно?")).toEqual({ name: "Анна", car: "Kia Rio" });
});

test("a no rejects the read-back unless it corrects something else", () => {
  expect(rejects("нет")).toBe(true);
  expect(rejects("No, that isn't right")).toBe(true);
  expect(rejects("да, верно")).toBe(false);
  expect(rejects("да, но телефон не тот")).toBe(false);
});
