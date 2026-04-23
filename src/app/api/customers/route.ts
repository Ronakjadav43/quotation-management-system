import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile: z.string().min(10, "Valid mobile number required"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  village: z.string().optional(),
  city: z.string().optional(),
  gstNo: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { mobile: { contains: search } },
          { city: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { _count: { select: { quotations: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ customers, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await prisma.customer.create({ data: parsed.data });
  return NextResponse.json(customer, { status: 201 });
}
