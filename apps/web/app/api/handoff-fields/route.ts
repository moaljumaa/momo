import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@momo/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fields = await prisma.handoffField.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ fields });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key, label, type } = (await req.json()) as {
    key?: string;
    label?: string;
    type?: "TEXT" | "EMAIL" | "PHONE" | "DATE" | "NUMBER";
  };
  if (!key?.trim() || !label?.trim()) {
    return NextResponse.json({ error: "key and label are required" }, { status: 400 });
  }

  const count = await prisma.handoffField.count();
  const field = await prisma.handoffField.create({
    data: { key: key.trim().toLowerCase().replace(/\s+/g, "_"), label: label.trim(), type: type ?? "TEXT", order: count },
  });
  return NextResponse.json({ field });
}
