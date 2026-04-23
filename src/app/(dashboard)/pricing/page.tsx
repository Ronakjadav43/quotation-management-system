"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle, Loader2, Eye, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import defaultPricing from "@/data/pricing/charges-v1.json";

interface PricingVersion {
  id: string;
  versionName: string;
  title: string;
  isActive: boolean;
  createdAt: string;
}

export default function PricingPage() {
  const [versions, setVersions] = useState<PricingVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [viewingJson, setViewingJson] = useState<string | null>(null);

  async function fetchVersions() {
    const res = await fetch("/api/pricing");
    const data = await res.json();
    setVersions(data);
    setLoading(false);
  }

  useEffect(() => { fetchVersions(); }, []);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonText(ev.target?.result as string);
      setJsonError("");
    };
    reader.readAsText(file);
  }

  async function handleUpload() {
    setJsonError("");
    if (!versionName.trim()) { setJsonError("Version name is required"); return; }
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setJsonError("Invalid JSON format");
      return;
    }

    setUploading(true);
    const res = await fetch("/api/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionName: versionName.trim(), title: parsed.title ?? versionName, jsonData: parsed }),
    });

    if (res.ok) {
      setVersionName("");
      setJsonText("");
      await fetchVersions();
    } else {
      const err = await res.json();
      setJsonError(err.error ?? "Upload failed");
    }
    setUploading(false);
  }

  async function handleActivate(id: string) {
    await fetch(`/api/pricing/${id}/activate`, { method: "POST" });
    await fetchVersions();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this pricing version?")) return;
    await fetch(`/api/pricing/${id}`, { method: "DELETE" });
    await fetchVersions();
  }

  async function handleLoadDefault() {
    setVersionName("v2026-01-Default");
    setJsonText(JSON.stringify(defaultPricing, null, 2));
  }

  return (
    <div>
      <Header title="Charges Configuration" description="Manage pricing versions and JSON rules" />

      <div className="p-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" />Upload Pricing JSON</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Version Name</Label>
              <Input placeholder="e.g. v2026-01" value={versionName} onChange={(e) => setVersionName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Upload JSON File</Label>
              <input type="file" accept=".json" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>

            <div className="space-y-1.5">
              <Label>Or paste JSON directly</Label>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='{"title": "...", "version": "...", "sections": [...]}'
                rows={6}
                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {jsonError && <p className="text-sm text-red-600">{jsonError}</p>}

            <div className="flex gap-2">
              <Button onClick={handleUpload} disabled={uploading || !jsonText || !versionName}>
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                Upload Version
              </Button>
              <Button variant="outline" onClick={handleLoadDefault}>
                Load Default
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              The default charges JSON is pre-loaded for Gujarat electricity board charges.
              Click &quot;Load Default&quot; to use it as a starting point.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pricing Versions</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin text-gray-400 mx-auto" /></div>
            ) : versions.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No pricing versions yet. Upload one or load the default.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{v.versionName}</p>
                        {v.isActive && <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>}
                      </div>
                      <p className="text-xs text-gray-500">{v.title} · {formatDate(v.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!v.isActive && (
                        <Button size="sm" variant="ghost" onClick={() => handleActivate(v.id)}>
                          Activate
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => setViewingJson(v.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!v.isActive && (
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(v.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {viewingJson && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">JSON Preview</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setViewingJson(null)}>Close</Button>
            </CardHeader>
            <CardContent>
              <JsonViewer id={viewingJson} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function JsonViewer({ id }: { id: string }) {
  const [data, setData] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/pricing/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(JSON.stringify(d.jsonData, null, 2)); setLoading(false); });
  }, [id]);

  if (loading) return <div className="text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>;

  return (
    <pre className="overflow-auto max-h-96 rounded-md bg-gray-50 p-4 text-xs font-mono text-gray-700">
      {data}
    </pre>
  );
}
