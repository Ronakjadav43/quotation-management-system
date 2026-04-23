import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const version = await prisma.pricingVersion.findUnique({ where: { id } });
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(version);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const version = await prisma.pricingVersion.findUnique({ where: { id } });
  if (version?.isActive) {
    return NextResponse.json({ error: "Cannot delete the active pricing version" }, { status: 400 });
  }
  await prisma.pricingVersion.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
