"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Printer, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface QuotationDetail {
  id: string;
  quoteNo: string;
  status: string;
  subtotal: number;
  extraCharges: number;
  discount: number;
  grandTotal: number;
  notes?: string;
  createdAt: string;
  customer: { name: string; mobile: string; email?: string; address?: string; city?: string; village?: string; };
  pricingVersion: { versionName: string; title: string };
  createdBy: { name: string };
  items: Array<{ id: string; sectionName: string; itemLabel: string; baseAmount: number; lateFee: number; total: number; calculationType: string; inputData: Record<string, unknown>; }>;
  manualItems: Array<{ id: string; label: string; amount: number }>;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  FINAL: { label: "Final", variant: "default" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/quotations/${id}`)
      .then((r) => r.json())
      .then((data) => { setQuotation(data); setLoading(false); })
      .catch(() => router.push("/quotations"));
  }, [id, router]);

  async function handleStatusChange(newStatus: string) {
    if (!quotation) return;
    setUpdating(true);
    const res = await fetch(`/api/quotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setQuotation((prev) => prev ? { ...prev, status: updated.status } : prev);
    }
    setUpdating(false);
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div>
        <Header title="Quotation"><Link href="/quotations"><Button variant="outline"><ArrowLeft className="h-4 w-4" />Back</Button></Link></Header>
        <div className="p-6 text-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" /></div>
      </div>
    );
  }

  if (!quotation) return null;

  const s = statusConfig[quotation.status] ?? statusConfig.DRAFT;

  return (
    <div>
      <Header title={quotation.quoteNo} description={`${quotation.customer.name} · ${formatDate(quotation.createdAt)}`}>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4" />Print / PDF
          </Button>
          {quotation.status === "FINAL" && (
            <Button variant="success" onClick={() => handleStatusChange("APPROVED")} disabled={updating}>
              <CheckCircle className="h-4 w-4" />Approve
            </Button>
          )}
          {quotation.status !== "REJECTED" && quotation.status !== "APPROVED" && (
            <Button variant="destructive" onClick={() => handleStatusChange("REJECTED")} disabled={updating}>
              <XCircle className="h-4 w-4" />Reject
            </Button>
          )}
          <Link href="/quotations"><Button variant="outline"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
        </div>
      </Header>

      <div className="p-6 space-y-4 max-w-4xl print:p-4 print:max-w-none" ref={printRef}>
        {/* Print header */}
        <div className="hidden print:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">QUOTATION</h1>
            <p className="text-sm text-gray-600">Electrical Services</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{quotation.quoteNo}</p>
            <p className="text-sm text-gray-600">{formatDate(quotation.createdAt)}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">Customer Details</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-semibold text-gray-900">{quotation.customer.name}</p>
              <p className="text-gray-600">{quotation.customer.mobile}</p>
              {quotation.customer.email && <p className="text-gray-600">{quotation.customer.email}</p>}
              {(quotation.customer.village || quotation.customer.city) && (
                <p className="text-gray-600">{[quotation.customer.village, quotation.customer.city].filter(Boolean).join(", ")}</p>
              )}
              {quotation.customer.address && <p className="text-gray-600">{quotation.customer.address}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Quotation Info</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <Badge variant={s.variant}>{s.label}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pricing Version</span>
                <span>{quotation.pricingVersion.versionName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created By</span>
                <span>{quotation.createdBy.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span>{formatDate(quotation.createdAt)}</span>
              </div>
              <div className="print:hidden">
                <Select value={quotation.status} onValueChange={handleStatusChange} disabled={updating}>
                  <SelectTrigger className="h-8 text-xs mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="FINAL">Final</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">Charge Breakdown</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Section</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Base</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Late Fee</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotation.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.sectionName}</td>
                    <td className="px-4 py-3 text-gray-800">{item.itemLabel}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(item.baseAmount)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{item.lateFee > 0 ? formatCurrency(item.lateFee) : "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
                {quotation.manualItems.map((item) => (
                  <tr key={item.id} className="bg-gray-50/50">
                    <td className="px-4 py-3 text-xs text-gray-400">Extra Charge</td>
                    <td className="px-4 py-3 text-gray-700">{item.label}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-3 text-right">—</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-xs text-gray-500">Subtotal</td>
                  <td className="px-4 py-2 text-right text-sm">{formatCurrency(quotation.subtotal)}</td>
                </tr>
                {quotation.extraCharges > 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-1 text-right text-xs text-gray-500">Extra Charges</td>
                    <td className="px-4 py-1 text-right text-sm">{formatCurrency(quotation.extraCharges)}</td>
                  </tr>
                )}
                {quotation.discount > 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-1 text-right text-xs text-green-600">Discount</td>
                    <td className="px-4 py-1 text-right text-sm text-green-600">- {formatCurrency(quotation.discount)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-900">Grand Total</td>
                  <td className="px-4 py-3 text-right font-bold text-lg text-gray-900">{formatCurrency(quotation.grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {quotation.notes && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{quotation.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:flex { display: flex !important; }
          .print\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          aside { display: none !important; }
          main { margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}
