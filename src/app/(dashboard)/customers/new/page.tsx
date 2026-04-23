"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form.entries());

    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const customer = await res.json();
      router.push(`/customers/${customer.id}`);
    } else {
      const err = await res.json();
      setError(err.error?.formErrors?.[0] ?? "Failed to create customer");
      setLoading(false);
    }
  }

  return (
    <div>
      <Header title="Add Customer">
        <Link href="/customers">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      </Header>

      <div className="p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" name="name" placeholder="Customer full name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mobile">Mobile Number *</Label>
                  <Input id="mobile" name="mobile" placeholder="10-digit mobile" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="email@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gstNo">GST Number</Label>
                  <Input id="gstNo" name="gstNo" placeholder="GST number (optional)" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="village">Village</Label>
                  <Input id="village" name="village" placeholder="Village name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City / Taluka</Label>
                  <Input id="city" name="city" placeholder="City or taluka" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" name="address" placeholder="Full address" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" placeholder="Any notes about this customer" rows={2} />
              </div>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Saving..." : "Save Customer"}
                </Button>
                <Link href="/customers">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
