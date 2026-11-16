import { expect, test } from "vitest";
import { EventBus } from "./events";
import { EMPTY_PROFILE, type ClientProfile } from "./formModel";
import { extractFields, supervise } from "./supervisor";

test("phone, plate and name come out of a spoken line", () => {
  expect(extractFields("Меня зовут анна, номер А123ВС77, телефон +7 900 123-45-67")).toEqual({
    name: "Анна",
    plate: "А123ВС77",
    phone: "+7 900 123-45-67",
  });
  expect(extractFields("my name is John, call 8 916 555 12 34")).toEqual({ name: "John", phone: "8 916 555 12 34" });
  expect(extractFields("хочу поменять масло завтра в 10")).toEqual({});
});

function run(start: ClientProfile = EMPTY_PROFILE) {
  const bus = new EventBus();
  let p = start;
  const sent: string[] = [];
  supervise({ bus, profile: () => p, setProfile: (n) => (p = n), send: (t) => sent.push(t) });
  const say = (text: string) => bus.emit({ type: "stt-result", result: { text, words: [] } });
  const endTurn = () => bus.emit({ type: "turn-end", at: 0, metrics: {} as never });
  return { say, endTurn, sent, profile: () => p };
}

test("what the customer says lands in the form without any tool call", () => {
  const s = run({ ...EMPTY_PROFILE, car: "Kia Rio" });
  s.say("меня зовут Анна, телефон 89001234567");
  expect(s.profile()).toMatchObject({ name: "Анна", phone: "89001234567", car: "Kia Rio" });
});

test("a returning customer is announced once, and each nudge is sent once", () => {
  const s = run({ ...EMPTY_PROFILE, name: "Анна" });
  expect(s.sent).toEqual(["Returning customer, already on file: name: Анна. Do not ask again."]);
  s.endTurn();
  s.endTurn();
  expect(s.sent.slice(1)).toEqual(["Form still missing: phone, car, service. Ask for one of them next."]);
  s.say("телефон 89001234567");
  s.endTurn();
  expect(s.sent.at(-1)).toBe("Form still missing: car, service. Ask for one of them next.");
});
