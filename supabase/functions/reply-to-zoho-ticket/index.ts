import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

type SourceConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  orgId: string;
  fromEmailAddress: string;
  apiDomain: string;
};

function getConfig(source: string): SourceConfig {
  const configs: Record<string, SourceConfig> = {
    "Code Wiz": {
      clientId: Deno.env.get("ZOHO_CODEWIZ_CLIENT_ID") || "",
      clientSecret: Deno.env.get("ZOHO_CODEWIZ_CLIENT_SECRET") || "",
      refreshToken: Deno.env.get("ZOHO_CODEWIZ_REFRESH_TOKEN") || "",
      orgId: Deno.env.get("ZOHO_CODEWIZ_ORG_ID") || "",
      fromEmailAddress: Deno.env.get("ZOHO_CODEWIZ_FROM_EMAIL") || "",
      apiDomain: "https://desk.zoho.com",
    },
    "Tutor Doctor": {
      clientId: Deno.env.get("ZOHO_TUTORDOCTOR_CLIENT_ID") || "",
      clientSecret: Deno.env.get("ZOHO_TUTORDOCTOR_CLIENT_SECRET") || "",
      refreshToken: Deno.env.get("ZOHO_TUTORDOCTOR_REFRESH_TOKEN") || "",
      orgId: Deno.env.get("ZOHO_TUTORDOCTOR_ORG_ID") || "",
      fromEmailAddress: Deno.env.get("ZOHO_TUTORDOCTOR_FROM_EMAIL") || "",
      apiDomain: "https://desk.zoho.com",
    },
    "Qualicare": {
      clientId: Deno.env.get("ZOHO_QUALICARE_CLIENT_ID") || "",
      clientSecret: Deno.env.get("ZOHO_QUALICARE_CLIENT_SECRET") || "",
      refreshToken: Deno.env.get("ZOHO_QUALICARE_REFRESH_TOKEN") || "",
      orgId: Deno.env.get("ZOHO_QUALICARE_ORG_ID") || "",
      fromEmailAddress: Deno.env.get("ZOHO_QUALICARE_FROM_EMAIL") || "",
      apiDomain: "https://desk.zoho.com",
    },
  };

  const config = configs[source];
  if (!config) throw new Error(`Unsupported source: ${source}`);

  for (const [key, value] of Object.entries(config)) {
    if (!value && key !== "apiDomain") {
      throw new Error(`Missing configuration '${key}' for ${source}`);
    }
  }

  return config;
}

async function getAccessToken(source: string, config: SourceConfig) {
  const { data: cached } = await supabase
    .from("zoho_tokens")
    .select("access_token, expires_at")
    .eq("source", source)
    .maybeSingle();

  if (cached?.access_token && cached?.expires_at) {
    const expiry = new Date(cached.expires_at).getTime();
    if (expiry > Date.now() + 5 * 60 * 1000) {
      return cached.access_token;
    }
  }

  const params = new URLSearchParams({
    refresh_token: config.refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
  });

  const res = await fetch(
    `https://accounts.zoho.com/oauth/v2/token?${params.toString()}`,
    { method: "POST" }
  );

  const raw = await res.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  if (!res.ok || !data.access_token) {
    throw new Error(`Zoho token error: ${JSON.stringify(data)}`);
  }

  const expiresAt = new Date(
    Date.now() + Number(data.expires_in || 3600) * 1000
  ).toISOString();

  await supabase.from("zoho_tokens").upsert(
    {
      source,
      access_token: data.access_token,
      expires_at: expiresAt,
      api_domain: config.apiDomain,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "source" }
  );

  return data.access_token as string;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!jwt) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const ticketKey = String(body.ticket_key || "").trim();
    const content = String(body.content || "").trim();

    if (!ticketKey || !content) {
      return new Response(
        JSON.stringify({ success: false, error: "ticket_key and content are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("ticket_key, zoho_ticket_id, source, contact_email")
      .eq("ticket_key", ticketKey)
      .single();

    if (ticketError || !ticket) {
      throw new Error(`Ticket not found: ${ticketKey}`);
    }

    if (!ticket.contact_email) {
      throw new Error("This ticket does not have a contact email.");
    }

    const config = getConfig(ticket.source);
    const accessToken = await getAccessToken(ticket.source, config);

    const zohoResponse = await fetch(
      `${config.apiDomain}/api/v1/tickets/${ticket.zoho_ticket_id}/sendReply`,
      {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          orgId: config.orgId,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          channel: "EMAIL",
          to: ticket.contact_email,
          fromEmailAddress: config.fromEmailAddress,
          contentType: "html",
          content: `<div style="white-space:pre-wrap">${escapeHtml(content)}</div>`,
          isForward: false,
        }),
      }
    );

    const zohoRaw = await zohoResponse.text();
    let zohoData: any = {};
    try {
      zohoData = zohoRaw ? JSON.parse(zohoRaw) : {};
    } catch {
      zohoData = { raw: zohoRaw };
    }

    if (!zohoResponse.ok) {
      throw new Error(
        `Zoho sendReply error ${zohoResponse.status}: ${JSON.stringify(zohoData)}`
      );
    }

    // Re-sync immediately so the sent reply appears in the dashboard.
    const syncResponse = await fetch(
      `${supabaseUrl}/functions/v1/sync-zoho-ticket`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          zoho_ticket_id: ticket.zoho_ticket_id,
          ticket_key: ticket.ticket_key,
          source: ticket.source,
        }),
      }
    );

    const syncRaw = await syncResponse.text();
    let syncData: any = {};
    try {
      syncData = syncRaw ? JSON.parse(syncRaw) : {};
    } catch {
      syncData = { raw: syncRaw };
    }

    return new Response(
      JSON.stringify({
        success: true,
        ticket_key: ticket.ticket_key,
        source: ticket.source,
        sent_by: userData.user.email,
        zoho_reply: zohoData,
        sync: syncData,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
