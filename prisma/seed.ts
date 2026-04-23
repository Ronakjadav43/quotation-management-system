import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import defaultPricing from "../src/data/pricing/charges-v1.json";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@example.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@example.com" },
    update: {},
    create: {
      name: "Staff User",
      email: "staff@example.com",
      passwordHash: await bcrypt.hash("staff123", 10),
      role: "STAFF",
    },
  });

  const pricingVersion = await prisma.pricingVersion.upsert({
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

  const customer = await prisma.customer.upsert({
    where: { id: "sample-customer-1" },
    update: {},
    create: {
      id: "sample-customer-1",
      name: "Ramesh Patel",
      mobile: "9876543210",
      email: "ramesh@example.com",
      village: "Kherva",
      city: "Mehsana",
      address: "Near Bus Stand, Kherva",
    },
  });

  const existingQuote = await prisma.quotation.findFirst({
    where: { customerId: customer.id },
  });

  if (!existingQuote) {
    await prisma.quotation.create({
      data: {
        quoteNo: "QT-2601-1001",
        customerId: customer.id,
        pricingVersionId: pricingVersion.id,
        status: "FINAL",
        subtotal: 8550,
        extraCharges: 500,
        discount: 0,
        grandTotal: 9050,
        notes: "Sample quotation for demonstration",
        createdById: admin.id,
        items: {
          create: [
            {
              sectionKey: "registration_verification",
              sectionName: "રજીસ્ટ્રેશન અને ટેસ્ટ રિપોર્ટ",
              itemLabel: "રહેણાંક - સિંગલ ફેઝ",
              calculationType: "fixed",
              inputData: { chargeKey: "residential_single_phase", isLate: true },
              baseAmount: 50,
              lateFee: 20,
              total: 70,
            },
            {
              sectionKey: "fixed_service_line",
              sectionName: "ફિક્સડ સર્વિસ લાઇન ચાર્જિસ",
              itemLabel: "5.01 - 10 kW",
              calculationType: "fixed",
              inputData: { loadKw: 7 },
              baseAmount: 8500,
              lateFee: 0,
              total: 8500,
            },
          ],
        },
        manualItems: {
          create: [{ label: "Site Visit Charge", amount: 500 }],
        },
      },
    });
  }

  console.log("✅ Seed complete!");
  console.log("   Admin: admin@example.com / admin123");
  console.log("   Staff: staff@example.com / staff123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
