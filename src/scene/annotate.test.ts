import { expect, test } from "vitest";
import { annotate, type Mark } from "./annotate";

const OIL = ["Замена масла", "Oil change", "2500", "30"];
const marked = (text: string, facts: string[], mark: Mark) =>
  annotate(text, facts)
    .filter((s) => s.mark === mark)
    .map((s) => s.text);

test("a catalog price and name are facts however the price is written", () => {
  for (const price of ["2500", "2 500", "2 500 ₽", "2 500 рублей"]) {
    expect(marked(`Замену масла сделаем за ${price}.`, OIL, "fact")).toEqual(["Замену масла", price]);
  }
  expect(marked("An oil change takes 30 minutes.", OIL, "fact")).toEqual(["oil change", "30 minutes"]);
});

test("an invented price and an invented time are assumptions", () => {
  const facts = [...OIL, "2026-11-17", "10:30", "12:00"];
  expect(marked("Это будет 3 000 ₽, подъезжайте в 11:15.", facts, "assumption")).toEqual(["3 000 ₽", "11:15"]);
  expect(marked("Свободно в 10:30 17 ноября.", facts, "fact")).toEqual(["10:30", "17"]);
});

test("hedge words are assumptions in both languages", () => {
  expect(marked("Предположительно, это колодки.", OIL, "assumption")).toEqual(["Предположительно"]);
  expect(marked("I assume it is the pads, probably.", OIL, "assumption")).toEqual(["I assume", "probably"]);
  // A word that merely contains a hedge is not one.
  expect(marked("Это невозможно.", OIL, "assumption")).toEqual([]);
});

test("a phone read back in pieces is not flagged", () => {
  expect(marked("Ваш номер 900 123 45 67, верно?", ["+7 900 123-45-67"], "assumption")).toEqual([]);
});

test("the segments rebuild the reply exactly", () => {
  const text = "Примерно 2 500 ₽ за Замену масла, в 9:00.";
  expect(annotate(text, [...OIL, "09:00"]).map((s) => s.text).join("")).toBe(text);
});

test("traps that must never read as fact", () => {
  const PHONE = ["+7 912 500 67 89"];
  const PRICES = ["Замена масла, Oil change: 2500 ₽, 30 min"];
  for (const [text, facts, wrong] of [
    ["Это стоит 500 рублей.", PHONE, "500 рублей"],
    ["Масло поменяем за 30 ₽.", PRICES, "30 ₽"],
    ["Займёт 2500 минут.", PRICES, "2500 минут"],
    ["Это будет не 2500 ₽.", PRICES, "2500 ₽"],
    ["It is not 30 minutes.", PRICES, "30 minutes"],
  ] as const) expect(marked(text, [...facts], "fact"), text).not.toContain(wrong);
  expect(marked("Ваш номер 912 500 67 89.", PHONE, "fact")).toEqual(["912 500", "67", "89"]);
  expect(marked("Займёт 30 минут, 2500 ₽.", PRICES, "fact")).toEqual(["30 минут", "2500 ₽"]);
});

test("a number the facts give in another unit does not back a price or a duration", () => {
  const WARRANTY = ["Warranty on work: 6 months or 10 000 km"];
  expect(marked("Займёт 6 минут и стоит 6 рублей.", WARRANTY, "assumption")).toEqual(["6 минут", "6 рублей"]);
  expect(marked("Гарантия 6 месяцев или 10 000 км.", WARRANTY, "fact")).toEqual(["6", "10 000"]);
});
