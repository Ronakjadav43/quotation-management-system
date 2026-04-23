import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { generateQuoteNumber } from "@/lib/utils";
import { z } from "zod";

const quotationSchema = z.object({
  customerId: z.string().min(1),
  pricingVersionId: z.string().min(1),
  items: z.array(
    z.object({
      sectionKey: z.string(),
      sectionName: z.string(),
      itemLabel: z.string(),
      calculationType: z.string(),
      inputData: z.record(z.string(), z.unknown()),
      baseAmount: z.number(),
      lateFee: z.number(),
      total: z.number(),
    })
  ),
  manualItems: z.array(
    z.object({ label: z.string(), amount: z.number() })
  ).optional().default([]),
  subtotal: z.number(),
  extraCharges: z.number().optional(),
  discount: z.number().optional(),
  grandTotal: z.number(),
  notes: z.string().optional(),
  validUntil: z.string().optional(),
  status: z.enum(["DRAFT", "FINAL"]).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { quoteNo: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        customer: { select: { name: true, mobile: true, city: true } },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.quotation.count({ where }),
  ]);

  return NextResponse.json({ quotations, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = quotationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { items, manualItems, ...rest } = parsed.data;
  const quoteNo = generateQuoteNumber();

  const quotation = await prisma.quotation.create({
    data: {
      ...rest,
      quoteNo,
      extraCharges: rest.extraCharges ?? 0,
      discount: rest.discount ?? 0,
      status: rest.status ?? "DRAFT",
      createdById: (session.user as { id: string }).id,
      items: { create: items.map((item) => ({ ...item, inputData: item.inputData as object })) },
      manualItems: { create: manualItems },
    },
    include: {
      customer: true,
      items: true,
      manualItems: true,
    },
  });

  return NextResponse.json(quotation, { status: 201 });
}
