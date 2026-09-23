import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@momo/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as {
    label?: string;
    required?: boolean;
    order?: number;
    type?: "TEXT" | "EMAIL" | "PHONE" | "DATE" | "NUMBER";
  };
  const data: Record<string, unknown> = {};
  if ("label" in body) data.label = body.label;
  if ("required" in body) data.required = body.required;
  if ("order" in body) data.order = body.order;
  if ("type" in body) data.type = body.type;

  const field = await prisma.handoffField.update({ where: { id }, data });
  return NextResponse.json({ field });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.handoffField.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
