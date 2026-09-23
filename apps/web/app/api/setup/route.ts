import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@momo/db";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";

// Creates the one and only admin, once. After that this endpoint is closed for good: every
// other account is created by the admin from the Team page. The advisory lock makes two
// simultaneous first requests safe (the second sees the first's user and is refused).
export async function GET() {
  return NextResponse.json({ open: (await prisma.user.count()) === 0 });
}

export async function POST(req: NextRequest) {
  const { name, email, password } = (await req.json()) as { name?: string; email?: string; password?: string };
  if (!name?.trim() || !email?.trim() || !password || password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "name, email and an 8+ char password are required" }, { status: 400 });
  }

  const hash = await hashPassword(password);
  const created = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7301)`;
    if ((await tx.user.count()) > 0) return null;
    const id = randomUUID();
    await tx.user.create({ data: { id, name: name.trim(), email: email.trim().toLowerCase(), role: "ADMIN" } });
    await tx.account.create({ data: { id: randomUUID(), userId: id, providerId: "credential", accountId: id, password: hash } });
    return id;
  });

  if (!created) return NextResponse.json({ error: "Setup is already complete" }, { status: 403 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
