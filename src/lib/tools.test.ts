import { expect, test } from "vitest";
import { EMPTY_PROFILE, type ClientProfile } from "./formModel";
import { makeTools } from "./tools";
import { TOOL_NAMES } from "./persona";

function harness(start: Partial<ClientProfile> = {}) {
  let p: ClientProfile = { ...EMPTY_PROFILE, ...start };
  const tools = makeTools({ profile: () => p, setProfile: (n) => (p = n) });
  const call = async (name: string, args: Record<string, unknown>) =>
    JSON.parse(await tools.find((t) => t.name === name)!.run(args));
  return { call, profile: () => p, tools };
}

test("every tool the prompt names exists", () => {
  expect(harness().tools.map((t) => t.name).sort()).toEqual([...TOOL_NAMES].sort());
});

test("update_form fills the form and says what is still missing", async () => {
  const h = harness();
  const out = await h.call("update_form", { name: " Анна ", car: "Kia Rio", evil: "x" });

  expect(h.profile()).toMatchObject({ name: "Анна", car: "Kia Rio" });
  expect(out.missing).toEqual(["phone", "service"]);
});

test("search_services answers from the catalog", async () => {
  expect((await harness().call("search_services", { query: "замена масла" }))[0].id).toBe("oil");
});

test("a booking needs a complete form, and takes the slot", async () => {
  const h = harness({ name: "Анна", car: "Kia Rio" });
  const at = { service_id: "oil", date: "2026-11-17", time: "10:30" };

  expect(await h.call("book_appointment", at)).toMatchObject({ error: "form incomplete", missing: ["phone"] });

  await h.call("update_form", { phone: "+7 900 123-45-67" });
  expect(await h.call("book_appointment", at)).toMatchObject({ ok: true });
  expect(h.profile()).toMatchObject({ service: "Замена масла", date: "2026-11-17 10:30" });
  expect(await h.call("find_slots", { date: "2026-11-17" })).not.toContain("10:30");
  expect(await h.call("book_appointment", at)).toMatchObject({ error: "slot not free" });
});
