"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePortfolio } from "@/lib/portfolio";
import { fmtDate } from "@/lib/format";

const BUCKET = "property-photos";

// Pre-tenant / condition photos for a property — a historical record the
// landlord captures before a tenant moves in. Stored privately, org-scoped.
export default function PropertyPhotos({ propertyId }: { propertyId: string }) {
  const { org, propertyPhotos, addPropertyPhoto, deletePropertyPhoto } = usePortfolio();
  const [files, setFiles] = useState<FileList | null>(null);
  const [caption, setCaption] = useState("");
  const [takenOn, setTakenOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});

  const photos = propertyPhotos.filter((p) => p.property_id === propertyId);

  // Sign URLs for display. Deferred so the effect body has no sync setState.
  useEffect(() => {
    let active = true;
    const paths = photos.map((p) => p.path);
    if (paths.length === 0) {
      Promise.resolve().then(() => active && setUrls({}));
      return () => {
        active = false;
      };
    }
    supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, 3600)
      .then(({ data }) => {
        if (!active || !data) return;
        const map: Record<string, string> = {};
        data.forEach((d, i) => {
          if (d.signedUrl) map[paths[i]] = d.signedUrl;
        });
        setUrls(map);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.map((p) => p.id).join(",")]);

  async function upload() {
    if (!files || files.length === 0) return setErr("Choose one or more photos.");
    if (!org?.id) return setErr("Couldn't determine your organisation.");
    setBusy(true);
    setErr("");
    for (const file of Array.from(files)) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${org.id}/${propertyId}/${crypto.randomUUID()}-${safe}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file);
      if (up.error) {
        setBusy(false);
        return setErr(`Upload failed: ${up.error.message}`);
      }
      const res = await addPropertyPhoto({
        property_id: propertyId,
        path,
        caption: caption.trim() || null,
        taken_on: takenOn || null,
      });
      if (res.error) {
        setBusy(false);
        return setErr(res.error);
      }
    }
    setFiles(null);
    setCaption("");
    setTakenOn("");
    setBusy(false);
  }

  return (
    <div>
      <h4 className="mb-1 mt-6 text-sm font-semibold uppercase tracking-wide text-muted">
        Condition photos
      </h4>
      <p className="mb-3 text-xs text-muted">
        Capture the property&apos;s condition before a tenant moves in — kept as a historical record.
      </p>

      {photos.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((ph) => (
            <div key={ph.id} className="overflow-hidden rounded-xl border border-border">
              {urls[ph.path] ? (
                <a href={urls[ph.path]} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urls[ph.path]} alt={ph.caption || "Property photo"} className="h-28 w-full object-cover" />
                </a>
              ) : (
                <div className="flex h-28 w-full items-center justify-center bg-surface text-xs text-muted">Loading…</div>
              )}
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <span className="min-w-0 truncate text-[11px] text-muted" title={ph.caption || ""}>
                  {ph.caption || (ph.taken_on ? fmtDate(ph.taken_on) : "Photo")}
                </span>
                <button
                  onClick={() => deletePropertyPhoto(ph.id, ph.path)}
                  className="shrink-0 text-[11px] text-muted hover:text-bad"
                  title="Delete photo"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border p-4">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-medium"
        />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-[160px] flex-1">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Caption (optional)</span>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Kitchen — pre-move-in"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="min-w-[140px]">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Taken on</span>
            <input
              type="date"
              value={takenOn}
              onChange={(e) => setTakenOn(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <button
            onClick={upload}
            disabled={busy}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Upload photos"}
          </button>
        </div>
        {err && <p className="mt-2 text-sm text-bad">{err}</p>}
      </div>
    </div>
  );
}
