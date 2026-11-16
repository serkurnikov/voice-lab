import { expect, test } from "vitest";
import { searchServices } from "./catalog";

const ids = (q: string) => searchServices(q).map((s) => s.id);

test("finds a service by name in either language", () => {
  expect(ids("замена масла")[0]).toBe("oil");
  expect(ids("oil change")[0]).toBe("oil");
});

test("Russian word endings and ё do not get in the way", () => {
  expect(ids("поменять маслом")[0]).toBe("oil");
  expect(ids("тормозные колодочки")[0]).toBe("brakes");
  expect(ids("КОЛЁСА")[0]).toBe("tires");
});

test("a symptom finds the service that fixes it", () => {
  expect(ids("горит чек")[0]).toBe("diag");
  expect(ids("brakes squeak")[0]).toBe("brakes");
});

test("an unknown request finds nothing rather than a guess", () => {
  expect(ids("покраска бампера")).toEqual([]);
});

test("a search is well under a millisecond, so it never shows in a turn", () => {
  const t = performance.now();
  for (let i = 0; i < 1000; i++) searchServices("замена тормозных колодок и масла");
  expect((performance.now() - t) / 1000).toBeLessThan(1);
});
