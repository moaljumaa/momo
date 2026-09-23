// Format validation for handoff field answers collected by the widget. Deliberately loose —
// this rejects obviously-wrong input (a name typed into an email field) without being a strict
// parser, since visitors type these by hand in a chat box.
export type HandoffFieldType = "TEXT" | "EMAIL" | "PHONE" | "DATE" | "NUMBER";

const VALIDATORS: Record<HandoffFieldType, (value: string) => boolean> = {
  TEXT: (v) => v.trim().length > 0,
  EMAIL: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  PHONE: (v) => /^\+?[0-9\s\-().]{6,20}$/.test(v.trim()),
  DATE: (v) => !Number.isNaN(Date.parse(v.trim())),
  NUMBER: (v) => v.trim() !== "" && !Number.isNaN(Number(v.trim())),
};

const HINTS: Record<HandoffFieldType, string> = {
  TEXT: "",
  EMAIL: "an email like name@example.com",
  PHONE: "a phone number, e.g. +49 30 1234567",
  DATE: "a date, e.g. 2026-09-23 or September 23",
  NUMBER: "a number",
};

export function validateHandoffField(type: HandoffFieldType, value: string): boolean {
  return VALIDATORS[type](value);
}

export function handoffFieldHint(type: HandoffFieldType): string {
  return HINTS[type];
}
