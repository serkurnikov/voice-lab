/**
 * Splits an agent reply into what a tool backed and what the agent supplied itself.
 *
 * A heuristic, not a proof: it shows the interviewer where the agent stayed on data and
 * where it guessed. Numbers count as backed when a fact has the same digits with a compatible
 * unit, and never when negated ("не 2500"); names
 * when they match a tool's text up to a Russian ending.
 */
export type Mark = "fact" | "assumption";
export interface Segment {
  text: string;
  mark?: Mark;
}

// Thousands may be split by a space, nbsp or narrow nbsp: "2 500", as TTS-friendly LLMs write prices.
const NUMBER = /\d{1,2}:\d{2}|\d{4}-\d{2}-\d{2}|\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+/g;
const UNIT = String.raw`(?:\s?(?:₽|руб\p{L}*|rubles?|roubles?|минут\p{L}*|мин\.?|minutes?|min))?`;
const EDGE_L = String.raw`(?<![\p{L}\p{N}])`;
const EDGE_R = String.raw`(?![\p{L}\p{N}])`;
const HEDGE = new RegExp(
  `${EDGE_L}(?:предположительно|наверное|наверно|примерно|скорее всего|вероятно|возможно|i assume|i'd assume|probably|likely|approximately|roughly|maybe)${EDGE_R}`,
  "giu",
);

const MONEY = /^\s?(?:₽|руб|rub|roub)/iu;
const TIME = /^\s?(?:мин|min)/iu;
type Kind = "money" | "time" | "other" | "any";
// A fact that says "2500 ₽" backs a price, not "2500 минут", and "6 months" backs neither a
// price nor minutes; a bare tool number backs any of them.
const kindAfter = (s: string): Kind =>
  MONEY.test(s) ? "money" : TIME.test(s) ? "time" : /^\s?\p{L}/u.test(s) ? "other" : "any";
const NEGATED = /(?<![\p{L}])(?:не|not)\s+$/iu;
const digits = (s: string) => s.replace(/\D/g, "");
// "09:00" is said as "9:00".
const numKey = (s: string) => (s.includes(":") ? s.replace(/^0/, "") : digits(s));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

// Each word keeps its first letters and lets the ending vary: "Замена масла" matches "замену масла".
function namePattern(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => (w.length < 4 || !/^\p{L}+$/u.test(w) ? escape(w) : escape(w.slice(0, Math.max(3, w.length - 2))) + String.raw`\p{L}{0,3}`))
    .join(String.raw`\s+`);
}

interface Span {
  start: number;
  end: number;
  mark: Mark;
}

export function annotate(text: string, facts: Iterable<string>): Segment[] {
  const numbers = new Map<string, Set<Kind>>();
  const add = (key: string, kind: Kind) => numbers.set(key, (numbers.get(key) ?? new Set()).add(kind));
  // Long digit runs (phones) are read back in pieces, so any piece of them counts.
  const runs: string[] = [];
  const names: string[] = [];
  for (const f of facts) {
    for (const m of f.matchAll(NUMBER)) {
      add(numKey(m[0]), kindAfter(f.slice(m.index + m[0].length)));
      // A date is spoken as "17 ноября", not as the ISO string a tool returns.
      if (m[0].includes("-")) for (const part of m[0].split("-")) add(String(Number(part)), "any");
    }
    const d = digits(f);
    if (d.length >= 7) runs.push(d);
    // A shop fact is a sentence; its comma-separated pieces ("АвтоЛаб", "ул. Моторная") are what gets quoted.
    for (const piece of f.split(/[,;]|:(?!\d)/)) if (/\p{L}{3}/u.test(piece)) names.push(namePattern(piece));
  }

  const spans: Span[] = [];
  if (names.length) {
    // Longest first, so "Замена тормозных колодок" wins over a shorter name inside it.
    names.sort((a, b) => b.length - a.length);
    const re = new RegExp(`${EDGE_L}(?:${names.join("|")})${EDGE_R}`, "giu");
    for (const m of text.matchAll(re)) spans.push({ start: m.index, end: m.index + m[0].length, mark: "fact" });
  }
  const num = new RegExp(`${EDGE_L}(?:${NUMBER.source})${UNIT}${EDGE_R}`, "gu");
  for (const m of text.matchAll(num)) {
    const core = m[0].match(NUMBER)![0];
    const unit = m[0].slice(core.length);
    const kinds = numbers.get(numKey(core));
    const kind = kindAfter(unit);
    // A phone's pieces back a bare number only: "500 рублей" is not part of a phone.
    const backed =
      !NEGATED.test(text.slice(Math.max(0, m.index - 6), m.index)) &&
      (!!kinds && (kind === "any" || kinds.has("any") || kinds.has(kind)) || (!unit && runs.some((r) => r.includes(digits(core)))));
    spans.push({ start: m.index, end: m.index + m[0].length, mark: backed ? "fact" : "assumption" });
  }
  for (const m of text.matchAll(HEDGE)) spans.push({ start: m.index, end: m.index + m[0].length, mark: "assumption" });

  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Segment[] = [];
  let at = 0;
  for (const s of spans) {
    if (s.start < at) continue;
    if (s.start > at) out.push({ text: text.slice(at, s.start) });
    out.push({ text: text.slice(s.start, s.end), mark: s.mark });
    at = s.end;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}
