import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { activePlan } from "@/lib/plans";

// In-app AI assistant (Pro plan). The caller is verified by their Supabase
// access token: we act as that user, so RLS confines every query to their own
// org — the assistant can never read another account's data. We load a compact
// snapshot of the org's data and let Claude answer questions and draft/fill
// documents from the landlord + tenant information already captured.
//
// Requires ANTHROPIC_API_KEY (server-only). Model defaults to claude-opus-5;
// set ANTHROPIC_MODEL to override (e.g. claude-sonnet-5 for ~5x lower cost).

type ChatMessage = { role: "user" | "assistant"; content: string };

const MAX_TURNS = 20;
const MAX_ROWS = 50;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The AI assistant isn't configured on this app yet (missing ANTHROPIC_API_KEY)." },
      { status: 501 }
    );
  }
  if (!url || !anon) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const messages = (body.messages || [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_TURNS);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Send a question for the assistant." }, { status: 400 });
  }

  // Act as the signed-in user — RLS confines everything below to their org.
  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: orgs, error: orgErr } = await sb.from("organizations").select("*").limit(1);
  if (orgErr || !orgs || orgs.length === 0) {
    return NextResponse.json({ error: "No organization found." }, { status: 400 });
  }
  const org = orgs[0];

  // Gate: AI assistant is a Pro-plan feature.
  if (!activePlan(org.plan, org.subscription_status).ai) {
    return NextResponse.json(
      { error: "The AI assistant is a Pro-plan feature. Upgrade on the Billing page to enable it." },
      { status: 402 }
    );
  }

  // Load a compact, org-scoped snapshot (RLS already limits these to the org).
  const [props, tenancies, applications, matters, notices] = await Promise.all([
    sb.from("properties").select("id,address,state,weekly_rent,bond,lease_start,lease_end,rent_due_day").limit(MAX_ROWS),
    sb.from("tenancies").select("id,property_id,tenant_name,tenant_email,tenant_phone,emergency_contact,move_in_date,lease_start,lease_end,weekly_rent,bond_amount,bond_lodged,rent_frequency,status,notes").limit(MAX_ROWS),
    sb.from("tenant_applications").select("id,tenancy_id,status,data,submitted_at").eq("status", "submitted").limit(MAX_ROWS),
    sb.from("maintenance_requests").select("id,property_id,tenancy_id,kind,title,description,urgency,status,due_date,source").limit(MAX_ROWS),
    sb.from("notices").select("id,property_id,category,title,body,due_date").limit(MAX_ROWS),
  ]);

  const context = {
    organization: { name: org.name, default_state: org.default_state ?? null },
    properties: props.data ?? [],
    tenancies: tenancies.data ?? [],
    submitted_applications: applications.data ?? [],
    matters: matters.data ?? [],
    notices: notices.data ?? [],
  };

  const system = [
    `You are the in-app assistant for ${org.name}, a property-management workspace on Corvelle Property (an Australian platform).`,
    "You help the landlord/manager understand their portfolio and DRAFT documents, forms, letters and notices (e.g. tenancy agreements, condition reports, entry notices, rent-increase notices, a tenant handbook) using the landlord and tenant information already captured.",
    "",
    "Rules:",
    "- Use ONLY the org data provided below plus what the user tells you. Never invent tenant names, figures, dates or addresses — if a needed detail is missing, ask for it or leave a clearly-marked [PLACEHOLDER].",
    "- You produce editable drafts for the manager to review. You do NOT send anything, email anyone, or take any action in the app.",
    "- Australian context: rules differ by state/territory. Use the property's state; when a legal figure (bond cap, notice period) matters, state your assumption and tell the user to confirm against their state's tenancy authority.",
    "- You are not a lawyer; drafts are a starting point, not legal advice.",
    "- Be concise. When drafting a document, return it as clean Markdown the user can copy.",
    "",
    "Org data (JSON):",
    "```json",
    JSON.stringify(context),
    "```",
  ].join("\n");

  const model = process.env.ANTHROPIC_MODEL || "claude-opus-5";
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      output_config: { effort: "medium" },
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "The assistant declined to answer that request." },
        { status: 200 }
      );
    }
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ reply: text || "(no response)" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "The assistant couldn't respond." },
      { status: 502 }
    );
  }
}
