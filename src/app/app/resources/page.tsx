"use client";

import { useState } from "react";
import { Field, Select, Textarea } from "@/components/app/Field";
import { supabase } from "@/lib/supabase";
import { usePortfolio } from "@/lib/portfolio";

const BUCKET = "tenant-resources";

export default function ResourcesPage() {
  const { properties, resources, addResource, deleteResource, loading, org } = usePortfolio();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    if (!title.trim()) {
      setError("Give the handout a title.");
      return;
    }
    if (!file && !url.trim()) {
      setError("Attach a file or provide a link.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let path: string | null = null;
      if (file) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        path = `${org?.id ?? "org"}/resources/${Date.now()}-${safe}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
        if (up.error) throw new Error(up.error.message);
      }
      const res = await addResource({
        property_id: propertyId || null,
        title: title.trim(),
        description: description.trim() || null,
        path,
        url: file ? null : url.trim() || null,
      });
      if (res.error) throw new Error(res.error);
      setTitle("");
      setDescription("");
      setPropertyId("");
      setUrl("");
      setFile(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  function propLabel(id: string | null) {
    if (!id) return "All properties";
    return properties.find((p) => p.id === id)?.address || "—";
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Resources &amp; handouts</h1>
        <p className="mt-1 text-muted">
          Documents and links shared to tenant portals — a handbook, forms, guides, contacts.
        </p>
      </header>

      <section className="mb-8 rounded-2xl border border-border p-5">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Add a handout</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tenant handbook" />
          <Select label="Visible to" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.address || "(no address)"}
              </option>
            ))}
          </Select>
          <Textarea label="Description (optional)" className="sm:col-span-2" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Upload file</span>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0])}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:font-medium file:text-background"
            />
          </div>
          <Field label="…or a link (URL)" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </div>
        {error && <p className="mt-3 text-sm text-bad">{error}</p>}
        <button
          onClick={add}
          disabled={saving}
          className="mt-4 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add handout"}
        </button>
      </section>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : resources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          No handouts yet — add your first above.
        </div>
      ) : (
        <ul className="space-y-3">
          {resources.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border p-4">
              <div>
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-muted">
                  {propLabel(r.property_id)}
                  {r.description ? ` · ${r.description}` : ""}
                  {r.url ? " · link" : r.path ? " · file" : ""}
                </div>
              </div>
              <button onClick={() => deleteResource(r.id)} className="text-sm text-muted hover:text-bad">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
