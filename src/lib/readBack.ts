import type { ClientProfile } from "./formModel";

type Field = keyof ClientProfile;

// The prompt makes the agent read every value back in this shape; this is what fills the form
// when the model never calls update_form.
const READ_BACK =
  /(?:noting\s+(?:the\s+|your\s+)?|записываю\s+)([^:.?!]+?)\s*:\s*(.+?)\s*[.,]?\s*(?:correct|верно)\s*\?/giu;

// Plate before phone: "номер машины" is a plate, a bare "номер" is the phone.
const LABELS: [RegExp, Field][] = [
  [/^(имя|name)/iu, "name"],
  [/^(госномер|номер машины|номерной|plate)/iu, "plate"],
  [/^(телефон|номер|phone|number)/iu, "phone"],
  [/^(машин|автомобил|авто|car|vehicle)/iu, "car"],
  [/^(услуг|service)/iu, "service"],
  [/^(дат|date)/iu, "date"],
];

// "n't" splits off as "t" under \p{L}+, so "isn't right" still reads as a no.
const NO = new Set(["no", "not", "nope", "wrong", "incorrect", "t", "нет", "не", "неверно", "неправильно"]);
// "да, но телефон другой" corrects something else; the read-back value stays.
const BUT = new Set(["but", "except", "но", "кроме"]);

const L = "АВЕКМНОРСТУХ";
const LATIN = "ABEKMHOPCTYX";

function fieldFor(label: string): Field | undefined {
  const l = label.trim().toLowerCase();
  return LABELS.find(([re]) => re.test(l))?.[1];
}

function normalise(field: Field, raw: string): string {
  if (field === "plate") return raw.replace(/\s/g, "").toUpperCase().replace(/[A-Z]/g, (c) => L[LATIN.indexOf(c)] ?? c);
  if (field === "date") {
    // Spoken as DD.MM.YYYY; the form keeps YYYY-MM-DD with the time after it.
    const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[\s,]+(?:в\s+|at\s+)?(\d{1,2}):(\d{2}))?$/iu.exec(raw);
    if (m) {
      const day = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
      return m[4] ? `${day} ${m[4].padStart(2, "0")}:${m[5]}` : day;
    }
  }
  return raw;
}

/** Every value the agent read back in this reply, by form field. */
export function readBacks(text: string): Partial<ClientProfile> {
  const out: Partial<ClientProfile> = {};
  for (const m of text.matchAll(READ_BACK)) {
    const field = fieldFor(m[1]);
    if (field) out[field] = normalise(field, m[2].trim());
  }
  return out;
}

/** True when the customer's answer rejects what was just read back. */
export function rejects(text: string): boolean {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  return words.some((w) => NO.has(w)) && !words.some((w) => BUT.has(w));
}
