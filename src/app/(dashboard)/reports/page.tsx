import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

async function getReportData() {
  const [byStatus, monthlyStats, topCustomers] = await Promise.all([
    prisma.quotation.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { grandTotal: true },
    }),
    prisma.$queryRaw<Array<{ month: string; count: bigint; total: number }>>`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM') as month,
        COUNT(*) as count,
        SUM("grandTotal") as total
      FROM "Quotation"
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `,
    prisma.customer.findMany({
      take: 10,
      include: {
        _count: { select: { quotations: true } },
        quotations: {
          where: { status: { in: ["FINAL", "APPROVED"] } },
          select: { grandTotal: true },
        },
      },
      orderBy: { quotations: { _count: "desc" } },
    }),
  ]);

  return { byStatus, monthlyStats, topCustomers };
}

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  FINAL: "Final",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export default async function ReportsPage() {
  await auth();
  const { byStatus, topCustomers } = await getReportData();

  const totalRevenue = byStatus
    .filter((s: { status: string }) => ["FINAL", "APPROVED"].includes(s.status))
    .reduce((sum: number, s: { _sum: { grandTotal: number | null } }) => sum + (s._sum.grandTotal ?? 0), 0);

  return (
    <div>
      <Header title="Reports" description="Quotation analytics and summary" />

      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {byStatus.map((s: { status: string; _count: { _all: number }; _sum: { grandTotal: number | null } }) => (
            <Card key={s.status}>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500">{statusLabels[s.status] ?? s.status}</p>
                <p className="text-3xl font-bold mt-1">{s._count._all}</p>
                <p className="text-xs text-gray-400 mt-1">{formatCurrency(s._sum.grandTotal ?? 0)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Total Finalized Revenue</CardTitle></CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
              <p className="text-sm text-gray-500 mt-1">Across Final + Approved quotations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Top Customers by Quotations</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {topCustomers.slice(0, 5).map((c) => {
                  const revenue = c.quotations.reduce((s: number, q: { grandTotal: number }) => s + q.grandTotal, 0);
                  return (
                    <div key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.mobile}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{c._count.quotations} quotes</p>
                        <p className="text-xs text-gray-500">{formatCurrency(revenue)}</p>
                      </div>
                    </div>
                  );
                })}
                {topCustomers.length === 0 && (
                  <p className="p-5 text-center text-sm text-gray-400">No data yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
