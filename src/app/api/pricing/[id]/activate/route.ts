import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await prisma.$transaction([
    prisma.pricingVersion.updateMany({ data: { isActive: false } }),
    prisma.pricingVersion.update({ where: { id }, data: { isActive: true } }),
  ]);

  return NextResponse.json({ success: true });
}
