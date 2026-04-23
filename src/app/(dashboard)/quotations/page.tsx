"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Quotation {
  id: string;
  quoteNo: string;
  status: string;
  grandTotal: number;
  createdAt: string;
  customer: { name: string; mobile: string; city?: string };
  createdBy: { name: string };
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  FINAL: { label: "Final", variant: "default" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (status !== "ALL") params.set("status", status);
      const res = await fetch(`/api/quotations?${params}`);
      const data = await res.json();
      setQuotations(data.quotations ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status]);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

  return (
    <div>
      <Header title="Quotations" description={`${total} total quotations`}>
        <Link href="/quotations/new">
          <Button><Plus className="h-4 w-4" />New Quotation</Button>
        </Link>
      </Header>

      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by quote number or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="FINAL">Final</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : quotations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No quotations found.</p>
              <Link href="/quotations/new"><Button className="mt-4"><Plus className="h-4 w-4" />Create Quotation</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-gray-100">
              {quotations.map((q) => {
                const s = statusConfig[q.status] ?? statusConfig.DRAFT;
                return (
                  <Link key={q.id} href={`/quotations/${q.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{q.quoteNo}</p>
                        <p className="text-xs text-gray-500">{formatDate(q.createdAt)} · by {q.createdBy.name}</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-sm font-medium text-gray-800">{q.customer.name}</p>
                        <p className="text-xs text-gray-400">{q.customer.mobile}{q.customer.city ? ` · ${q.customer.city}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(q.grandTotal)}</span>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
