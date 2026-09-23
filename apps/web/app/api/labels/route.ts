import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@momo/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const PALETTE = ["#7C9DB8", "#D2BC80", "#C99A8A", "#D9542F", "#5F84A0"];

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const labels = await prisma.label.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ labels });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = (await req.json()) as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const count = await prisma.label.count();
  const label = await prisma.label.upsert({
    where: { name: name.trim() },
    update: {},
    create: { name: name.trim(), color: PALETTE[count % PALETTE.length] },
  });
  return NextResponse.json({ label });
}
