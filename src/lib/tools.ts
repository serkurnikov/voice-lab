import { searchServices, SERVICES } from "./catalog";
import { applyPatch, FIELDS, missingRequired, type ClientProfile } from "./formModel";
import type { ClientFunction } from "./pipeline/session";

export interface ToolDeps {
  profile: () => ClientProfile;
  setProfile: (p: ClientProfile) => void;
}

const HOURS = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"];
const str = { type: "string" };

/** The agent's tools, one list for both engines. Bookings live for the page's lifetime. */
export function makeTools({ profile, setProfile }: ToolDeps): ClientFunction[] {
  const booked = new Set<string>();
  const json = (v: unknown) => JSON.stringify(v);

  return [
    {
      name: "search_services",
      description: "Find car services, prices in rubles and duration by what the customer asks for.",
      parameters: { type: "object", properties: { query: str }, required: ["query"] },
      run: ({ query }) =>
        json(searchServices(String(query ?? "")).map(({ id, ru, en, price, minutes }) => ({ id, ru, en, price, minutes }))),
    },
    {
      name: "find_slots",
      description: "Free start times on a date (YYYY-MM-DD).",
      parameters: { type: "object", properties: { date: str }, required: ["date"] },
      run: ({ date }) => json(HOURS.filter((h) => !booked.has(`${date} ${h}`))),
    },
    {
      name: "book_appointment",
      description: "Book a confirmed service at a free time. Needs name, phone and car in the form.",
      parameters: {
        type: "object",
        properties: { service_id: str, date: str, time: str },
        required: ["service_id", "date", "time"],
      },
      run: ({ service_id, date, time }) => {
        const service = SERVICES.find((s) => s.id === service_id);
        const slot = `${date} ${time}`;
        const missing = missingRequired({ ...profile(), service: service?.ru ?? "" });
        if (!service) return json({ error: "unknown service_id" });
        if (missing.length) return json({ error: "form incomplete", missing });
        if (!HOURS.includes(String(time)) || booked.has(slot)) return json({ error: "slot not free" });
        booked.add(slot);
        setProfile(applyPatch(profile(), { service: service.ru, date: slot }));
        return json({ ok: true, service: service.ru, at: slot });
      },
    },
    {
      name: "update_form",
      description: "Fill or correct fields of the customer form as soon as the customer mentions them.",
      parameters: { type: "object", properties: Object.fromEntries(FIELDS.map((k) => [k, str])) },
      run: (patch) => {
        setProfile(applyPatch(profile(), patch));
        return json({ ok: true, missing: missingRequired(profile()) });
      },
    },
  ];
}
