import { applyPatch, FIELDS, missingRequired, validate, type ClientProfile } from "./formModel";
import type { EventBus } from "./events";

// \b is ASCII-only in JS even with /u, so Cyrillic plates need explicit edges.
const PLATE = /(?<![\p{L}\p{N}])([АВЕКМНОРСТУХABEKMHOPCTYX]\s?\d{3}\s?[АВЕКМНОРСТУХABEKMHOPCTYX]{2}\s?\d{2,3})(?![\p{L}\p{N}])/iu;
const PHONE = /(\+?\d[\d\s()-]{8,18}\d)/;
const NAME = /(?:меня зовут|my name is)\s+([\p{L}-]{2,})/iu;

/** What the customer just said that belongs in the form, read straight off the transcript. */
export function extractFields(text: string): Partial<ClientProfile> {
  const out: Partial<ClientProfile> = {};
  const plate = PLATE.exec(text)?.[1];
  // The plate is cut out first: its digits would otherwise read as part of a phone number.
  const rest = plate ? text.replace(plate, " ") : text;
  const phone = PHONE.exec(rest)?.[1];
  if (phone && phone.replace(/\D/g, "").length >= 10) out.phone = phone;
  if (plate) out.plate = plate.replace(/\s/g, "").toUpperCase();
  const name = NAME.exec(text)?.[1];
  if (name) out.name = name[0].toUpperCase() + name.slice(1);
  return out;
}

/** What the model still has to ask for, or null when the form is complete and valid. */
export function nudge(p: ClientProfile): string | null {
  const missing = missingRequired(p);
  const invalid = Object.keys(validate(p, "en")).filter((k) => !missing.includes(k as keyof ClientProfile));
  if (!missing.length && !invalid.length) return null;
  return [
    missing.length && `Form still missing: ${missing.join(", ")}. Ask for one of them next.`,
    invalid.length && `These look wrong, confirm them: ${invalid.join(", ")}.`,
  ].filter(Boolean).join(" ");
}

interface Deps {
  bus: EventBus;
  profile: () => ClientProfile;
  setProfile: (p: ClientProfile) => void;
  send: (text: string) => void;
}

/**
 * Fills the form from what the customer says and steers the model with what is left.
 * Works whether or not the model ever calls update_form.
 */
export function supervise({ bus, profile, setProfile, send }: Deps): () => void {
  const known = FIELDS.filter((k) => profile()[k]).map((k) => `${k}: ${profile()[k]}`);
  if (known.length) send(`Returning customer, already on file: ${known.join("; ")}. Do not ask again.`);
  let last: string | null = null;
  return bus.on((e) => {
    if (e.type === "stt-result") {
      const patch = extractFields(e.result.text);
      if (Object.keys(patch).length) setProfile(applyPatch(profile(), patch));
    } else if (e.type === "turn-end") {
      const text = nudge(profile());
      // Once per change: repeating the same nudge every turn only makes the agent nag.
      if (text && text !== last) send(text);
      last = text;
    }
  });
}
