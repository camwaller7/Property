"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePortfolio } from "@/lib/portfolio";
import { supabase } from "@/lib/supabase";
import { hasAI, planFor } from "@/lib/plans";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Summarise everything outstanding across my properties.",
  "Draft a routine inspection entry notice for my active tenancy.",
  "Write a rent-increase notice using the correct notice period for the property's state.",
  "Draft a tenant welcome handbook from the tenancy details on file.",
];

export default function AssistantPage() {
  const { org, loading } = usePortfolio();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  if (loading) return <p className="text-muted">Loading…</p>;

  const unlocked = hasAI(org?.plan, org?.subscription_status);
  if (!unlocked) {
    return (
      <div>
        <Header />
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-muted">
            The AI assistant is included with the {planFor("pro").name} plan. It has secure, read-only
            access to your own org&apos;s data and drafts forms, notices and templates from the landlord
            and tenant information you&apos;ve already captured.
          </p>
          <Link
            href="/app/billing"
            className="mt-4 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-80"
          >
            Upgrade to {planFor("pro").name}
          </Link>
        </div>
      </div>
    );
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setError("");
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "The assistant couldn't respond.");
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply as string }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The assistant couldn't respond.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      <Header />

      <div className="flex-1 space-y-4">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-border p-5">
            <p className="text-sm text-muted">
              Ask about your portfolio, or have me draft a document from your data. Try:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-left text-xs font-medium text-muted hover:bg-surface hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((m, i) => (
              <li key={i} className={m.role === "user" ? "text-right" : ""}>
                <div
                  className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-left text-sm ${
                    m.role === "user" ? "bg-accent/10" : "border border-border bg-surface"
                  }`}
                >
                  {m.content}
                </div>
              </li>
            ))}
            {busy && (
              <li>
                <div className="inline-block rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
                  Thinking…
                </div>
              </li>
            )}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="mt-3 text-sm text-bad">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-0 mt-4 flex gap-2 bg-background py-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the assistant, or describe a document to draft…"
          className="flex-1 rounded-full border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-80 disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <p className="mt-2 text-xs text-muted">
        The assistant only sees your organisation&apos;s data and produces editable drafts to review —
        it never sends anything or gives legal advice. Confirm state-specific rules with your tenancy authority.
      </p>
    </div>
  );
}

function Header() {
  return (
    <header className="mb-6">
      <h1 className="text-3xl font-semibold tracking-tight">Assistant</h1>
      <p className="mt-1 text-muted">Ask about your portfolio and draft documents from your own data.</p>
    </header>
  );
}
