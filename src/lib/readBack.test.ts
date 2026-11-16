import { expect, test } from "vitest";
import { accepts, readBacks, rejects } from "./readBack";

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

const NOW = new Date(2026, 10, 16, 12);

test("a date said in words lands as a date, the next one ahead and in shop hours", () => {
  expect(readBacks("Записываю дату: двадцать третьего октября в пять часов. Верно?", NOW)).toEqual({ date: "2027-10-23 17:00" });
  expect(readBacks("Записываю дату: 20 ноября в 10:30. Верно?", NOW)).toEqual({ date: "2026-11-20 10:30" });
  expect(readBacks("Записываю дату: завтра в 11. Верно?", NOW)).toEqual({ date: "2026-11-17 11:00" });
  expect(readBacks("Noting date: December 3 at 9:00. Correct?", NOW)).toEqual({ date: "2026-12-03 09:00" });
  expect(readBacks("Записываю дату: пятнадцатого декабря. Верно?", NOW)).toEqual({ date: "2026-12-15" });
});

test("read-backs chained under one question each keep their own value", () => {
  expect(readBacks("Записываю услугу: замена масла. Записываю телефон: +7 912 345 67 89. Записываю машину: BMW X5. Верно?", NOW)).toEqual({
    service: "Замена масла",
    phone: "+7 912 345 67 89",
    car: "BMW X5",
  });
});

test("a service is stored under its price-list name, and one not on the list is not stored", () => {
  expect(readBacks("Записываю услугу: масло. Верно?")).toEqual({ service: "Замена масла" });
  expect(readBacks("Noting service: brake pads. Correct?")).toEqual({ service: "Brake pad replacement" });
  expect(readBacks("Записываю услугу: покраска крыла. Верно?")).toEqual({});
});

test("a yes is a yes only without a no in it", () => {
  for (const t of ["да", "Да, верно", "yes, that's right", "ага"]) expect(accepts(t), t).toBe(true);
  for (const t of ["нет", "да нет, не так", "no", "я не знаю", ""]) expect(accepts(t), t).toBe(false);
});

test("a date read back that is already gone is not filled", () => {
  const now = new Date(2026, 10, 16, 12);
  expect(readBacks("Записываю дату: 10.11.2026 в 10:00. Верно?", now)).toEqual({});
  expect(readBacks("Записываю дату: 20.11.2026. Верно?", now)).toEqual({ date: "2026-11-20" });
});
