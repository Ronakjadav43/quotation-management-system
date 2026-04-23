"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Phone, MapPin, FileText, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  city?: string;
  village?: string;
  createdAt: string;
  _count: { quotations: number };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      setCustomers(data.customers ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  return (
    <div>
      <Header title="Customers" description={`${total} total customers`}>
        <Link href="/customers/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </Link>
      </Header>

      <div className="p-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name, mobile, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : customers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No customers found.</p>
              <Link href="/customers/new">
                <Button className="mt-4">
                  <Plus className="h-4 w-4" />
                  Add First Customer
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customers.map((c) => (
              <Link key={c.id} href={`/customers/${c.id}`}>
                <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(c.createdAt)}</p>
                      </div>
                      <Badge variant={c._count.quotations > 0 ? "default" : "secondary"}>
                        <FileText className="h-3 w-3 mr-1" />
                        {c._count.quotations}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {c.mobile}
                      </div>
                      {(c.city || c.village) && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {[c.village, c.city].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
