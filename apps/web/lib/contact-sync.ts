import { prisma, type HandoffField } from "@momo/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Email is the Contact's primary key (Contact.email is @unique), so it must come from a
// field the admin explicitly typed EMAIL — never guessed by regex-matching arbitrary answer
// text, which could misfire on a phone/text field that happens to look email-shaped and
// silently merge two different visitors into one Contact.
function emailFrom(fields: HandoffField[], collectedFields: Record<string, string>) {
  const emailField = fields.find((f) => f.type === "EMAIL");
  if (!emailField) return undefined;
  const value = collectedFields[emailField.key]?.trim();
  if (!value || !EMAIL_RE.test(value)) return undefined;
  return value;
}

// Name has no dedicated HandoffFieldType, so fall back to matching the field's own label —
// still tied to a real configured field, not a guess over raw answer text.
function nameFrom(fields: HandoffField[], collectedFields: Record<string, string>) {
  const nameField = fields.find((f) => /name/i.test(f.label));
  if (!nameField) return undefined;
  return collectedFields[nameField.key]?.trim() || undefined;
}

// Called every time a handoff field answer lands, not just once collection finishes — the
// visitor's Contact record should exist (and stay current) the moment their email is known,
// not only once every required field has been collected.
export async function syncContactFromFields(fields: HandoffField[], collectedFields: Record<string, string>) {
  const email = emailFrom(fields, collectedFields);
  if (!email) return undefined;
  const name = nameFrom(fields, collectedFields);

  // Anyone can type any email into the widget, so an existing contact's name is never overwritten
  // here, only filled in when it was empty.
  const existing = await prisma.contact.findUnique({ where: { email } });
  if (existing) {
    if (!existing.name && name) await prisma.contact.update({ where: { email }, data: { name } });
    return existing.id;
  }
  const contact = await prisma.contact.create({ data: { email, name: name || null } });
  return contact.id;
}
