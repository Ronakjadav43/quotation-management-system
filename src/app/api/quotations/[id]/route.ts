import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
      manualItems: true,
      pricingVersion: { select: { versionName: true, title: true } },
      createdBy: { select: { name: true } },
    },
  });

  if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(quotation);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  if (!["DRAFT", "FINAL", "APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const quotation = await prisma.quotation.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(quotation);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.quotation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
