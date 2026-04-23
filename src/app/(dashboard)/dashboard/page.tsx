import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Users, FileText, CheckCircle, Clock, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";

async function getDashboardStats() {
  const [
    totalCustomers,
    totalQuotations,
    draftQuotations,
    finalQuotations,
    approvedQuotations,
    recentQuotations,
    totalRevenue,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.quotation.count(),
    prisma.quotation.count({ where: { status: "DRAFT" } }),
    prisma.quotation.count({ where: { status: "FINAL" } }),
    prisma.quotation.count({ where: { status: "APPROVED" } }),
    prisma.quotation.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: { select: { name: true } } },
    }),
    prisma.quotation.aggregate({
      where: { status: { in: ["FINAL", "APPROVED"] } },
      _sum: { grandTotal: true },
    }),
  ]);

  return {
    totalCustomers,
    totalQuotations,
    draftQuotations,
    finalQuotations,
    approvedQuotations,
    recentQuotations,
    totalRevenue: totalRevenue._sum.grandTotal ?? 0,
  };
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  FINAL: { label: "Final", variant: "default" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();

  const statCards = [
    { title: "Total Customers", value: stats.totalCustomers, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Total Quotations", value: stats.totalQuotations, icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Approved", value: stats.approvedQuotations, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    { title: "Pending (Draft)", value: stats.draftQuotations, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
    { title: "Finalized", value: stats.finalQuotations, icon: AlertCircle, color: "text-indigo-600", bg: "bg-indigo-50" },
    { title: "Revenue (Finalized)", value: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", isAmount: true },
  ];

  return (
    <div>
      <Header
        title="Dashboard"
        description={`Welcome back, ${session?.user?.name}`}
      />

      <div className="p-6 space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <Card key={card.title}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Quotations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recentQuotations.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No quotations yet.{" "}
                <Link href="/quotations/new" className="text-blue-600 hover:underline">
                  Create your first quotation
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {stats.recentQuotations.map((q: { id: string; quoteNo: string; status: string; grandTotal: number; createdAt: Date; customer: { name: string } }) => {
                  const s = statusConfig[q.status];
                  return (
                    <Link
                      key={q.id}
                      href={`/quotations/${q.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{q.quoteNo}</p>
                        <p className="text-xs text-gray-500">{q.customer.name} · {formatDate(q.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(q.grandTotal)}
                        </span>
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
