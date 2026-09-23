import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@momo/db";
import { auth } from "@/lib/auth";
import { hashPassword } from "better-auth/crypto";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";

// Colleagues (human agents) for this single-tenant instance. There is no public sign-up
// (see lib/auth.ts and /api/setup), so the ADMIN adds teammates here instead — this
// writes User + Account rows the same way better-auth's own email/password sign-up does
// (see better-auth's api/routes/sign-up.ts: providerId "credential", accountId = user id).
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, password, role } = (await req.json()) as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  };
  if (role !== "HUMAN_AGENT") {
    return NextResponse.json({ error: "role must be HUMAN_AGENT (an instance has exactly one admin)" }, { status: 400 });
  }
  if (!name?.trim() || !email?.trim() || !password || password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "name, email and an 8+ char password are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });

  const userId = randomUUID();
  const hash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { id: userId, name: name.trim(), email: email.trim().toLowerCase(), role },
    });
    await tx.account.create({
      data: { id: randomUUID(), userId, providerId: "credential", accountId: userId, password: hash },
    });
    return created;
  });

  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}
