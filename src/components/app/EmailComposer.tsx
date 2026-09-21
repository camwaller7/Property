"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { Field, Textarea } from "./Field";

export default function EmailComposer({
  open,
  onClose,
  defaultTo = "",
  defaultSubject = "",
  defaultBody = "",
  tenancyId,
}: {
  open: boolean;
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  tenancyId?: string;
}) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);

  // Re-seed when opened for a different recipient.
  const [seed, setSeed] = useState("");
  if (open && seed !== defaultTo + defaultSubject) {
    setSeed(defaultTo + defaultSubject);
    setTo(defaultTo);
    setSubject(defaultSubject);
    setBody(defaultBody);
    setResult(null);
  }

  async function send() {
    if (!to || !subject) {
      setResult({ error: "Recipient and subject are required." });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body, tenancyId }),
      });
      const data = await res.json();
      if (!res.ok) setResult({ error: data.error || "Failed to send." });
      else setResult({ ok: true });
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Failed to send." });
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Send email">
      <div className="space-y-4">
        <Field label="To" type="email" value={to} onChange={(e) => setTo(e.target.value)} />
        <Field label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea label="Message" value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
      </div>

      {result?.ok && <p className="mt-4 text-sm text-good">Sent ✓</p>}
      {result?.error && <p className="mt-4 text-sm text-bad">{result.error}</p>}

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-surface">
          Close
        </button>
        <button
          onClick={send}
          disabled={sending}
          className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send email"}
        </button>
      </div>
    </Modal>
  );
}
