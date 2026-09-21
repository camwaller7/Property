"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { Field, Select } from "@/components/app/Field";
import { usePortfolio } from "@/lib/portfolio";
import type { OrgRole } from "@/lib/types";

export default function TeamPage() {
  const { org, members, myRole, userId, loading, updateOrgName, createInvite, removeMember } =
    usePortfolio();

  const [name, setName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = myRole === "owner" || myRole === "admin";
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!org) return <p className="text-muted">No organization found.</p>;

  async function saveName() {
    setError("");
    const res = await updateOrgName(name || org!.name);
    if (res.error) setError(res.error);
    else {
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    }
  }

  async function invite() {
    setError("");
    setInviteLink("");
    const res = await createInvite(inviteRole);
    if (res.error) setError(res.error);
    else if (res.token) setInviteLink(`${origin}/join/${res.token}`);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — select the link manually.");
    }
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
        <p className="mt-1 text-muted">Your organization and the people who can access it.</p>
      </header>

      {/* Org name */}
      <section className="mb-8 rounded-2xl border border-border p-5">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Organization</h2>
        {isAdmin ? (
          <div className="flex flex-wrap items-end gap-3">
            <Field
              label="Name"
              className="min-w-[220px] flex-1"
              value={name || org.name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              onClick={saveName}
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-80"
            >
              Save
            </button>
            {nameSaved && <span className="text-sm text-good">Saved ✓</span>}
          </div>
        ) : (
          <p className="text-sm">{org.name}</p>
        )}
      </section>

      {/* Members */}
      <section className="mb-8 rounded-2xl border border-border p-5">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Members</h2>
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.user_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span>
                {m.email || m.user_id}
                {m.user_id === userId && <span className="ml-2 text-xs text-muted">(you)</span>}
              </span>
              <span className="flex items-center gap-3">
                <Badge tone={m.role === "owner" ? "good" : "neutral"}>{m.role}</Badge>
                {isAdmin && m.role !== "owner" && m.user_id !== userId && (
                  <button onClick={() => removeMember(m.user_id)} className="text-xs text-muted hover:text-bad">
                    Remove
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Invite */}
      {isAdmin && (
        <section className="rounded-2xl border border-border p-5">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Invite someone</h2>
          <p className="mb-3 text-sm text-muted">
            Generate an invite link and send it to a teammate. When they sign in and open it, they
            join <strong>{org.name}</strong>.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <Select label="Role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as OrgRole)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </Select>
            <button
              onClick={invite}
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-80"
            >
              Create invite link
            </button>
          </div>
          {inviteLink && (
            <div className="mt-3 rounded-xl border border-border bg-surface p-3">
              <div className="break-all rounded-lg border border-border bg-background px-3 py-2 text-sm">{inviteLink}</div>
              <button onClick={copy} className="mt-2 rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-background">
                Copy link
              </button>
              {copied && <span className="ml-2 text-xs text-good">Copied ✓</span>}
            </div>
          )}
        </section>
      )}

      {error && <p className="mt-4 text-sm text-bad">{error}</p>}
    </div>
  );
}
