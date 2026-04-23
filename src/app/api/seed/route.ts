import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const defaultPricing = require("@/data/pricing/charges-v1.json");

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");

  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminHash = await bcrypt.hash("admin123", 10);
    const staffHash = await bcrypt.hash("staff123", 10);

    await prisma.user.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: {
        name: "Admin User",
        email: "admin@example.com",
        passwordHash: adminHash,
        role: "ADMIN",
      },
    });

    await prisma.user.upsert({
      where: { email: "staff@example.com" },
      update: {},
      create: {
        name: "Staff User",
        email: "staff@example.com",
        passwordHash: staffHash,
        role: "STAFF",
      },
    });

    await prisma.pricingVersion.upsert({
      where: { id: "default-v1" },
      update: {},
      create: {
        id: "default-v1",
        versionName: "v2026-01",
        title: defaultPricing.title,
        jsonData: defaultPricing,
        isActive: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Database seeded successfully",
      credentials: {
        admin: "admin@example.com / admin123",
        staff: "staff@example.com / staff123",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
