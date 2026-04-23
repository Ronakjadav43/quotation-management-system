import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const versions = await prisma.pricingVersion.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, versionName: true, title: true, isActive: true, createdAt: true },
  });

  return NextResponse.json(versions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { versionName, title, jsonData } = body;

  if (!versionName || !jsonData) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const version = await prisma.pricingVersion.create({
    data: {
      versionName,
      title: title || versionName,
      jsonData,
      isActive: false,
    },
  });

  return NextResponse.json(version, { status: 201 });
}
