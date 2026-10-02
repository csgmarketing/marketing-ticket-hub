import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
}

const supabase = createClient(SUPABASE_URL || "", SUPABASE_ANON_KEY || "");

const brandClass = (source = "") =>
  source.toLowerCase().replace(/\s+/g, "-");

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const cleanText = (value = "") =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  }).format(d);
};

const formatDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
};

const isClosedStatus = (status = "") =>
  ["closed", "resolved", "completed"].includes(status.toLowerCase());

const isWaitingStatus = (status = "") =>
  ["on hold", "waiting", "pending"].some((x) =>
    status.toLowerCase().includes(x)
  );

function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendMagicLink(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-mark">M</div>
        <h1>Marketing Ticket Hub</h1>
        <p>One inbox for Qualicare, Tutor Doctor and Code Wiz.</p>
        {sent ? (
          <div className="success-box">
            Check your inbox for a secure sign-in link.
          </div>
        ) : (
          <form onSubmit={sendMagicLink}>
            <label>Work email</label>
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="primary full" disabled={busy}>
              {busy ? "Sending…" : "Email me a sign-in link"}
            </button>
            {error && <div className="error-text">{error}</div>}
          </form>
        )}
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [filter, setFilter] = useState("all");
  const [brand, setBrand] = useState("all");
  const [search, setSearch] = useState("");
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyNotice, setReplyNotice] = useState("");
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadTickets() {
    setLoadingTickets(true);
    setDataError("");

    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("is_deleted", false)
      .eq("is_trashed", false)
      .order("updated_at_zoho", { ascending: false, nullsFirst: false })
      .limit(500);

    if (error) {
      setDataError(error.message);
      setTickets([]);
    } else {
      setTickets(data || []);
      setSelectedKey((current) => {
        if (current && (data || []).some((t) => t.ticket_key === current)) {
          return current;
        }
        return data?.[0]?.ticket_key || null;
      });
    }
    setLoadingTickets(false);
  }

  async function loadThreads(ticketKey) {
    if (!ticketKey) {
      setThreads([]);
      return;
    }
    setLoadingThreads(true);
    const { data, error } = await supabase
      .from("ticket_threads")
      .select("*")
      .eq("ticket_key", ticketKey)
      .order("created_at_zoho", { ascending: true, nullsFirst: false });

    if (!error) setThreads(data || []);
    setLoadingThreads(false);
  }

  useEffect(() => {
    if (session) loadTickets();
  }, [session]);

  useEffect(() => {
    if (selectedKey && session) loadThreads(selectedKey);
  }, [selectedKey, session]);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("marketing-ticket-hub-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => loadTickets()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_threads" },
        (payload) => {
          const key = payload.new?.ticket_key || payload.old?.ticket_key;
          if (key && key === selectedKey) loadThreads(selectedKey);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, selectedKey]);

  const selected = useMemo(
    () => tickets.find((t) => t.ticket_key === selectedKey) || null,
    [tickets, selectedKey]
  );

  const counts = useMemo(() => {
    const now = Date.now();
    return {
      all: tickets.length,
      open: tickets.filter((t) => !isClosedStatus(t.status || "")).length,
      waiting: tickets.filter((t) => isWaitingStatus(t.status || "")).length,
      overdue: tickets.filter((t) => {
        if (!t.due_date || isClosedStatus(t.status || "")) return false;
        return new Date(t.due_date).getTime() < now;
      }).length,
      unassigned: tickets.filter((t) => !t.assignee_name).length,
    };
  }, [tickets]);

  const visibleTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (brand !== "all" && t.source !== brand) return false;

      if (filter === "open" && isClosedStatus(t.status || "")) return false;
      if (filter === "waiting" && !isWaitingStatus(t.status || "")) return false;
      if (
        filter === "overdue" &&
        !(
          t.due_date &&
          !isClosedStatus(t.status || "") &&
          new Date(t.due_date).getTime() < Date.now()
        )
      )
        return false;
      if (filter === "unassigned" && t.assignee_name) return false;

      if (!q) return true;
      return [
        t.subject,
        t.contact_name,
        t.contact_email,
        t.ticket_number,
        t.assignee_name,
        t.status,
        t.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [tickets, filter, brand, search]);

  async function sendReply() {
    if (!selected || !replyText.trim() || replyBusy) return;
    setReplyBusy(true);
    setReplyNotice("");

    const { data, error } = await supabase.functions.invoke(
      "reply-to-zoho-ticket",
      {
        body: {
          ticket_key: selected.ticket_key,
          content: replyText.trim(),
        },
      }
    );

    if (error || !data?.success) {
      setReplyNotice(
        `Could not send: ${error?.message || data?.error || "Unknown error"}`
      );
    } else {
      setReplyText("");
      setReplyNotice("Reply sent through Zoho.");
      setTimeout(() => {
        loadThreads(selected.ticket_key);
        loadTickets();
      }, 800);
    }

    setReplyBusy(false);
  }

  if (!authReady) return <div className="boot">Loading…</div>;
  if (!session) return <Login />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-title">
          <div className="logo-mark small">M</div>
          <div>
            <strong>Marketing Ticket Hub</strong>
            <span>Unified inbox</span>
          </div>
        </div>

        <div className="search-wrap">
          <span>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets, people, subjects…"
          />
        </div>

        <div className="user-menu">
          <div className="avatar">{initials(session.user?.email || "U")}</div>
          <div className="user-copy">
            <strong>{session.user?.email?.split("@")[0]}</strong>
            <button onClick={() => supabase.auth.signOut()}>Sign out</button>
          </div>
        </div>
      </header>

      <main className="workspace">
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Inbox</div>
            {[
              ["all", "All tickets", counts.all],
              ["open", "Open", counts.open],
              ["waiting", "Waiting", counts.waiting],
              ["overdue", "Overdue", counts.overdue],
              ["unassigned", "Unassigned", counts.unassigned],
            ].map(([key, label, count]) => (
              <button
                key={key}
                className={`nav-row ${filter === key ? "active" : ""}`}
                onClick={() => setFilter(key)}
              >
                <span>{label}</span>
                <b>{count}</b>
              </button>
            ))}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">Brands</div>
            {["all", "Qualicare", "Tutor Doctor", "Code Wiz"].map((value) => (
              <button
                key={value}
                className={`brand-filter ${brand === value ? "active" : ""}`}
                onClick={() => setBrand(value)}
              >
                <span
                  className={`brand-dot ${
                    value === "all" ? "all" : brandClass(value)
                  }`}
                />
                {value === "all" ? "All brands" : value}
              </button>
            ))}
          </div>

          <div className="sidebar-footer">
            Live data from Supabase
            <span className="live-dot" />
          </div>
        </aside>

        <section className="ticket-list-panel">
          <div className="panel-heading">
            <div>
              <h2>{filter === "all" ? "All tickets" : filter[0].toUpperCase() + filter.slice(1)}</h2>
              <span>{visibleTickets.length} shown</span>
            </div>
            <button className="icon-button" onClick={loadTickets} title="Refresh">
              ↻
            </button>
          </div>

          <div className="ticket-list">
            {loadingTickets ? (
              <div className="empty-state">Loading tickets…</div>
            ) : dataError ? (
              <div className="empty-state error">{dataError}</div>
            ) : visibleTickets.length === 0 ? (
              <div className="empty-state">No tickets match this view.</div>
            ) : (
              visibleTickets.map((ticket) => (
                <button
                  key={ticket.ticket_key}
                  className={`ticket-row ${
                    selectedKey === ticket.ticket_key ? "selected" : ""
                  }`}
                  onClick={() => setSelectedKey(ticket.ticket_key)}
                >
                  <div className="ticket-row-top">
                    <span className={`brand-pill ${brandClass(ticket.source)}`}>
                      {ticket.source}
                    </span>
                    <span className="ticket-time">
                      {formatDate(ticket.updated_at_zoho)}
                    </span>
                  </div>
                  <div className="ticket-subject">
                    {ticket.subject || "Untitled ticket"}
                  </div>
                  <div className="ticket-preview">
                    {ticket.email_summary ||
                      cleanText(ticket.description).slice(0, 120) ||
                      "No message preview"}
                  </div>
                  <div className="ticket-meta">
                    <span>
                      {ticket.contact_name ||
                        ticket.contact_email ||
                        "Unknown requester"}
                    </span>
                    <span className="dot-separator">·</span>
                    <span>{ticket.status || "No status"}</span>
                    {ticket.assignee_name && (
                      <>
                        <span className="dot-separator">·</span>
                        <span>{ticket.assignee_name}</span>
                      </>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="conversation-panel">
          {!selected ? (
            <div className="empty-conversation">
              Select a ticket to open the conversation.
            </div>
          ) : (
            <>
              <div className="conversation-header">
                <div>
                  <div className="eyebrow">
                    <span className={`brand-pill ${brandClass(selected.source)}`}>
                      {selected.source}
                    </span>
                    <span>#{selected.ticket_number || "—"}</span>
                  </div>
                  <h1>{selected.subject || "Untitled ticket"}</h1>
                  <p>
                    {selected.contact_name || "Unknown requester"}
                    {selected.contact_email
                      ? ` · ${selected.contact_email}`
                      : ""}
                  </p>
                </div>
                {selected.ticket_url && (
                  <a
                    className="secondary-button"
                    href={selected.ticket_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Zoho ↗
                  </a>
                )}
              </div>

              <div className="thread-scroll">
                {selected.description && (
                  <article className="message inbound description-message">
                    <div className="message-head">
                      <div className="message-avatar">
                        {initials(selected.contact_name || selected.contact_email)}
                      </div>
                      <div>
                        <strong>
                          {selected.contact_name ||
                            selected.contact_email ||
                            "Requester"}
                        </strong>
                        <span>Original request</span>
                      </div>
                    </div>
                    <div className="message-body preserve">
                      {selected.description}
                    </div>
                  </article>
                )}

                {loadingThreads ? (
                  <div className="empty-state">Loading conversation…</div>
                ) : threads.length === 0 ? (
                  <div className="conversation-note">
                    No conversation threads yet. You can start the conversation
                    below.
                  </div>
                ) : (
                  threads.map((thread) => {
                    const outbound =
                      (thread.direction || "").toLowerCase() === "out";
                    return (
                      <article
                        key={thread.thread_key}
                        className={`message ${outbound ? "outbound" : "inbound"}`}
                      >
                        <div className="message-head">
                          <div className="message-avatar">
                            {initials(
                              thread.author_name ||
                                thread.author_email ||
                                (outbound ? "Team" : "Contact")
                            )}
                          </div>
                          <div>
                            <strong>
                              {thread.author_name ||
                                thread.author_email ||
                                (outbound ? "Marketing team" : "Requester")}
                            </strong>
                            <span>{formatDateTime(thread.created_at_zoho)}</span>
                          </div>
                          <span className="direction-label">
                            {outbound ? "Sent" : "Received"}
                          </span>
                        </div>
                        <div className="message-body preserve">
                          {thread.content_text ||
                            thread.summary ||
                            "Message content unavailable"}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              <div className="composer">
                <div className="composer-top">
                  <strong>Reply</strong>
                  <span>
                    Sending through {selected.source} Zoho Desk
                  </span>
                </div>
                <textarea
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    setReplyNotice("");
                  }}
                  placeholder={
                    selected.contact_email
                      ? `Reply to ${selected.contact_name || selected.contact_email}…`
                      : "This ticket has no contact email."
                  }
                  disabled={!selected.contact_email || replyBusy}
                />
                <div className="composer-actions">
                  <span className={`reply-notice ${replyNotice.startsWith("Could") ? "error" : ""}`}>
                    {replyNotice}
                  </span>
                  <button
                    className="primary"
                    onClick={sendReply}
                    disabled={
                      !selected.contact_email ||
                      !replyText.trim() ||
                      replyBusy
                    }
                  >
                    {replyBusy ? "Sending…" : "Send reply"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="details-panel">
          {!selected ? null : (
            <>
              <div className="details-heading">Ticket details</div>

              <Detail label="Brand">
                <span className={`brand-pill ${brandClass(selected.source)}`}>
                  {selected.source}
                </span>
              </Detail>
              <Detail label="Status">{selected.status || "—"}</Detail>
              <Detail label="Assignee">
                {selected.assignee_name || "Unassigned"}
                {selected.assignee_email && (
                  <small>{selected.assignee_email}</small>
                )}
              </Detail>
              <Detail label="Tier">{selected.tier_level || "—"}</Detail>
              <Detail label="Priority">{selected.priority || "—"}</Detail>
              <Detail label="Due date">{formatDate(selected.due_date)}</Detail>
              <Detail label="Created">
                {formatDate(selected.created_at_zoho)}
              </Detail>
              <Detail label="Last updated">
                {formatDateTime(selected.updated_at_zoho) || "—"}
              </Detail>
              <Detail label="Ticket">
                #{selected.ticket_number || "—"}
              </Detail>

              <div className="details-divider" />

              <div className="requester-card">
                <div className="avatar large">
                  {initials(selected.contact_name || selected.contact_email)}
                </div>
                <div>
                  <strong>{selected.contact_name || "Unknown requester"}</strong>
                  <span>{selected.contact_email || "No email"}</span>
                </div>
              </div>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}

function Detail({ label, children }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
