"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Calculator, Loader2, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { calculateQuotation } from "@/lib/pricing/calculator";
import type { PricingJSON, QuotationItemInput, ManualItemInput, CalculationResult } from "@/types";
import Link from "next/link";

interface Customer { id: string; name: string; mobile: string; city?: string; }
interface PricingVersion { id: string; versionName: string; title: string; isActive: boolean; }

function QuotationBuilderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId") ?? "";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pricingVersions, setPricingVersions] = useState<PricingVersion[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId);
  const [selectedPricingId, setSelectedPricingId] = useState("");
  const [activePricing, setActivePricing] = useState<PricingJSON | null>(null);
  const [sectionInputs, setSectionInputs] = useState<Record<string, QuotationItemInput>>({});
  const [enabledSections, setEnabledSections] = useState<Set<string>>(new Set());
  const [manualItems, setManualItems] = useState<ManualItemInput[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "draft" | "final">("idle");

  useEffect(() => {
    Promise.all([
      fetch("/api/customers?limit=100").then((r) => r.json()),
      fetch("/api/pricing").then((r) => r.json()),
    ]).then(([custData, pvData]) => {
      setCustomers(custData.customers ?? []);
      const active = pvData.find((p: PricingVersion) => p.isActive);
      setPricingVersions(pvData);
      if (active) setSelectedPricingId(active.id);
    });
  }, []);

  useEffect(() => {
    if (!selectedPricingId) return;
    fetch(`/api/pricing/${selectedPricingId}`)
      .then((r) => r.json())
      .then((d) => setActivePricing(d.jsonData as PricingJSON));
  }, [selectedPricingId]);

  const recalculate = useCallback(() => {
    if (!activePricing) return;
    const inputs = Array.from(enabledSections)
      .map((sk) => sectionInputs[sk])
      .filter(Boolean) as QuotationItemInput[];
    const result = calculateQuotation(inputs, activePricing, manualItems, discount);
    setCalcResult(result);
  }, [activePricing, enabledSections, sectionInputs, manualItems, discount]);

  useEffect(() => { recalculate(); }, [recalculate]);

  function toggleSection(key: string) {
    setEnabledSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); }
      else {
        next.add(key);
        setSectionInputs((si) => ({ ...si, [key]: { sectionKey: key } }));
      }
      return next;
    });
  }

  function updateSectionInput(sectionKey: string, field: string, value: unknown) {
    setSectionInputs((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], sectionKey, [field]: value },
    }));
  }

  function addManualItem() {
    setManualItems((prev) => [...prev, { label: "", amount: 0 }]);
  }

  function updateManualItem(idx: number, field: "label" | "amount", value: string | number) {
    setManualItems((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  }

  function removeManualItem(idx: number) {
    setManualItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave(status: "DRAFT" | "FINAL") {
    if (!selectedCustomerId || !selectedPricingId || !calcResult) return;
    setSaving(true);
    setSaveStatus(status === "DRAFT" ? "draft" : "final");

    const res = await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: selectedCustomerId,
        pricingVersionId: selectedPricingId,
        items: calcResult.items,
        manualItems: manualItems.filter((m) => m.label && m.amount > 0),
        subtotal: calcResult.subtotal,
        extraCharges: calcResult.extraCharges,
        discount: calcResult.discount,
        grandTotal: calcResult.grandTotal,
        notes,
        status,
      }),
    });

    if (res.ok) {
      const q = await res.json();
      router.push(`/quotations/${q.id}`);
    } else {
      setSaving(false);
      setSaveStatus("idle");
      alert("Failed to save quotation");
    }
  }

  const canSave = selectedCustomerId && selectedPricingId && enabledSections.size > 0 && calcResult;

  return (
    <div>
      <Header title="New Quotation" description="Build a quotation from pricing rules">
        <Link href="/quotations"><Button variant="outline"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
      </Header>

      <div className="p-6 grid gap-6 xl:grid-cols-5">
        {/* Left panel - form */}
        <div className="xl:col-span-3 space-y-4">
          {/* Customer + Pricing selection */}
          <Card>
            <CardHeader><CardTitle className="text-sm">1. Select Customer & Pricing</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer *</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {c.mobile}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Link href="/customers/new" className="text-xs text-blue-600 hover:underline">+ Add new customer</Link>
              </div>
              <div className="space-y-1.5">
                <Label>Pricing Version *</Label>
                <Select value={selectedPricingId} onValueChange={setSelectedPricingId}>
                  <SelectTrigger><SelectValue placeholder="Select version..." /></SelectTrigger>
                  <SelectContent>
                    {pricingVersions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.versionName} {p.isActive ? "✓" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Charge sections */}
          {activePricing && (
            <Card>
              <CardHeader><CardTitle className="text-sm">2. Select Charge Sections</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {activePricing.sections.map((section) => {
                  const isEnabled = enabledSections.has(section.key);
                  const input = sectionInputs[section.key] ?? {};

                  return (
                    <div key={section.key} className={`rounded-lg border-2 p-4 transition-all ${isEnabled ? "border-blue-300 bg-blue-50" : "border-gray-200"}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <button
                          onClick={() => toggleSection(section.key)}
                          className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${isEnabled ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}
                        >
                          {isEnabled && <CheckCircle className="h-3 w-3 text-white" />}
                        </button>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{section.section_name}</p>
                          {section.description && <p className="text-xs text-gray-500">{section.description}</p>}
                        </div>
                      </div>

                      {isEnabled && (
                        <div className="ml-8 space-y-3">
                          {(section.input_type === "type_select" || section.input_type === "load_kw_type_select") && (
                            <div className="space-y-1.5">
                              <Label className="text-xs">Select Type</Label>
                              <Select
                                value={input.chargeKey ?? ""}
                                onValueChange={(v) => updateSectionInput(section.key, "chargeKey", v)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Choose..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {section.charges.map((c) => (
                                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {(section.input_type === "load_kw" || section.input_type === "load_kw_type_select") && (
                            <div className="space-y-1.5">
                              <Label className="text-xs">Load (kW)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="e.g. 5"
                                value={input.loadKw ?? ""}
                                onChange={(e) => updateSectionInput(section.key, "loadKw", parseFloat(e.target.value) || 0)}
                                className="h-8 text-sm"
                              />
                            </div>
                          )}

                          {section.charges.some((c) => c.late_fee) && (
                            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={input.isLate ?? false}
                                onChange={(e) => updateSectionInput(section.key, "isLate", e.target.checked)}
                                className="rounded"
                              />
                              Apply Late Fee
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Manual items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">3. Extra Charges (Optional)</CardTitle>
                <Button size="sm" variant="outline" onClick={addManualItem}>
                  <Plus className="h-3 w-3" />Add Item
                </Button>
              </div>
            </CardHeader>
            {manualItems.length > 0 && (
              <CardContent className="space-y-2">
                {manualItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder="Item description"
                      value={item.label}
                      onChange={(e) => updateManualItem(idx, "label", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={item.amount || ""}
                      onChange={(e) => updateManualItem(idx, "amount", parseFloat(e.target.value) || 0)}
                      className="w-28"
                    />
                    <Button size="icon" variant="ghost" onClick={() => removeManualItem(idx)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Discount + Notes */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="space-y-1.5">
                <Label>Discount (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={discount || ""}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes / Remarks</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes or terms..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel - live preview */}
        <div className="xl:col-span-2">
          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  Live Calculation Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!calcResult || calcResult.items.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Select charge sections to see the breakdown
                  </p>
                ) : (
                  <div className="space-y-3">
                    {calcResult.items.map((item, i) => (
                      <div key={i} className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs font-medium text-gray-500">{item.sectionName}</p>
                        <p className="text-sm text-gray-800 mt-0.5">{item.itemLabel}</p>
                        <div className="mt-2 space-y-1 text-xs text-gray-600">
                          {item.baseAmount > 0 && (
                            <div className="flex justify-between">
                              <span>Base Amount</span>
                              <span>{formatCurrency(item.baseAmount)}</span>
                            </div>
                          )}
                          {item.lateFee > 0 && (
                            <div className="flex justify-between text-orange-600">
                              <span>Late Fee</span>
                              <span>{formatCurrency(item.lateFee)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1 mt-1">
                            <span>Subtotal</span>
                            <span>{formatCurrency(item.total)}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {manualItems.filter((m) => m.label && m.amount > 0).map((m, i) => (
                      <div key={`m-${i}`} className="flex justify-between text-sm px-1">
                        <span className="text-gray-600">{m.label}</span>
                        <span>{formatCurrency(m.amount)}</span>
                      </div>
                    ))}

                    <div className="border-t border-gray-200 pt-3 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span>{formatCurrency(calcResult.subtotal)}</span>
                      </div>
                      {calcResult.extraCharges > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Extra Charges</span>
                          <span>{formatCurrency(calcResult.extraCharges)}</span>
                        </div>
                      )}
                      {calcResult.discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount</span>
                          <span>- {formatCurrency(calcResult.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-300 pt-2 mt-2">
                        <span>Grand Total</span>
                        <span>{formatCurrency(calcResult.grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={() => handleSave("FINAL")}
                disabled={!canSave || saving}
              >
                {saving && saveStatus === "final" && <Loader2 className="h-4 w-4 animate-spin" />}
                Finalize Quotation
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSave("DRAFT")}
                disabled={!canSave || saving}
              >
                {saving && saveStatus === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
                Save as Draft
              </Button>
            </div>

            {!activePricing && (
              <div className="rounded-md bg-yellow-50 p-3 text-xs text-yellow-700">
                No active pricing version. Please activate one in Charges Configuration.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewQuotationPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-gray-400">Loading...</div>}>
      <QuotationBuilderInner />
    </Suspense>
  );
}
