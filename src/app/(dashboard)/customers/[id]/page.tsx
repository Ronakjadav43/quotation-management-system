"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, Mail, MapPin, FileText, Plus, Edit2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  village?: string;
  city?: string;
  gstNo?: string;
  notes?: string;
  createdAt: string;
  quotations: Array<{
    id: string;
    quoteNo: string;
    status: string;
    grandTotal: number;
    createdAt: string;
    pricingVersion: { versionName: string };
  }>;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  FINAL: { label: "Final", variant: "default" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then((data) => { setCustomer(data); setLoading(false); })
      .catch(() => { router.push("/customers"); });
  }, [id, router]);

  if (loading) {
    return (
      <div>
        <Header title="Customer Details">
          <Link href="/customers"><Button variant="outline"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
        </Header>
        <div className="p-6 text-center text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div>
      <Header title={customer.name} description={`Customer since ${formatDate(customer.createdAt)}`}>
        <div className="flex gap-2">
          <Link href={`/quotations/new?customerId=${customer.id}`}>
            <Button><Plus className="h-4 w-4" />New Quotation</Button>
          </Link>
          <Link href="/customers"><Button variant="outline"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
        </div>
      </Header>

      <div className="p-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Edit2 className="h-4 w-4" />Contact Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{customer.mobile}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{customer.email}</span>
                </div>
              )}
              {(customer.village || customer.city || customer.address) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    {customer.address && <p>{customer.address}</p>}
                    {[customer.village, customer.city].filter(Boolean).join(", ")}
                  </div>
                </div>
              )}
              {customer.gstNo && (
                <div>
                  <span className="text-xs text-gray-400">GST: </span>
                  <span>{customer.gstNo}</span>
                </div>
              )}
              {customer.notes && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-gray-600">{customer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{customer.quotations.length}</p>
                  <p className="text-xs text-gray-500">Total Quotations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Quotation History</CardTitle></CardHeader>
            <CardContent className="p-0">
              {customer.quotations.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-500 mb-3">No quotations yet</p>
                  <Link href={`/quotations/new?customerId=${customer.id}`}>
                    <Button size="sm"><Plus className="h-4 w-4" />Create Quotation</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {customer.quotations.map((q) => {
                    const s = statusConfig[q.status] ?? statusConfig.DRAFT;
                    return (
                      <Link key={q.id} href={`/quotations/${q.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{q.quoteNo}</p>
                          <p className="text-xs text-gray-500">{formatDate(q.createdAt)} · {q.pricingVersion.versionName}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">{formatCurrency(q.grandTotal)}</span>
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
    </div>
  );
}
