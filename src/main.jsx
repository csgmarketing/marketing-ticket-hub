import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";
import "./styles-ticket-hub-v7.css";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

const BRAND_STATUSES = {
  Qualicare: [
    "Open",
    "On Hold",
    "Escalated",
    "Waiting",
    "Closed",
  ],
  "Tutor Doctor": [
    "Open",
    "In Progress",
    "On Hold",
    "Escalated",
    "Waiting",
    "Closed",
  ],
  "Code Wiz": [
    "Open",
    "In Progress",
    "On Hold",
    "Escalated",
    "Waiting",
    "Closed",
  ],
};

const CODEWIZ_TICKET_OWNERS = [
  {
    name: "Manuela Cruz",
    email: "mcruz@clearsummitgroup.com",
  },
  {
    name: "Daniela Alvarez",
    email: "dalvarez@clearsummitgroup.com",
  },
  {
    name: "Brandy Blackburn",
    email: "bblackburn@tutordoctor.org",
  },
  {
    name: "Fauziyah Salaudeen",
    email: "fsalaudeen@qualicare.com",
  },
  {
    name: "Eduarda Servat",
    email: "eservat@clearsummitgroup.com",
  },
  {
    name: "Michelle Morris",
    email: "mmorris@clearsummitgroup.com",
  },
];

const CODEWIZ_DEFAULT_DEPARTMENT = {
  zoho_agent_id: "598256000022663005",
  name: "Code Wiz Marketing",
  email: "marketing@thecodewiz.com",
};


const ALLOWED_LOGIN_DOMAINS = [
  "clearsummitgroup.com",
  "tutordoctor.org",
  "qualicare.com",
  "thecodewiz.com",
];

function isApprovedCompanyEmail(value) {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  const atIndex =
    normalized.lastIndexOf("@");

  if (
    atIndex <= 0 ||
    atIndex ===
      normalized.length - 1
  ) {
    return false;
  }

  const domain =
    normalized.slice(
      atIndex + 1
    );

  return ALLOWED_LOGIN_DOMAINS.includes(
    domain
  );
}


const TUTOR_DOCTOR_DEPARTMENTS = [
  {
    value: "Marketing",
    label: "Marketing",
  },
  {
    value: "Client_Tutor Newsletter",
    label: "Client/Tutor Newsletter",
  },
  {
    value: "Marketing Tech",
    label: "Marketing Tech",
  },
];

// ======================================================
// HELPERS
// ======================================================

function formatDate(value) {
  if (!value) return "—";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(date);
}

function formatDateTime(value) {
  if (!value) return "";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}

function dateInputValue(value) {
  if (!value) return "";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isOverdue(ticket) {
  if (!ticket?.due_date) {
    return false;
  }

  if (
    ticket.status ===
    "Closed"
  ) {
    return false;
  }

  return (
    new Date(
      ticket.due_date
    ).getTime() <
    Date.now()
  );
}

function brandSlug(source) {
  if (
    source ===
    "Qualicare"
  ) {
    return "qualicare";
  }

  if (
    source ===
    "Tutor Doctor"
  ) {
    return "tutordoctor";
  }

  if (
    source ===
    "Code Wiz"
  ) {
    return "codewiz";
  }

  return "unknown";
}

function brandClass(source) {
  return `brand-${brandSlug(
    source
  )}`;
}

function getTicketOwnerName(ticket) {
  if (!ticket) {
    return "";
  }

  if (
    ticket.source ===
    "Code Wiz"
  ) {
    return (
      ticket.codewiz_agent_name ||
      ""
    );
  }

  return (
    ticket.assignee_name ||
    ""
  );
}

function getTicketOwnerEmail(ticket) {
  if (!ticket) {
    return "";
  }

  if (
    ticket.source ===
    "Code Wiz"
  ) {
    return (
      ticket.codewiz_agent_email ||
      ""
    );
  }

  return (
    ticket.assignee_email ||
    ""
  );
}

function isTicketUnassigned(ticket) {
  if (!ticket) {
    return true;
  }

  if (
    ticket.source ===
    "Code Wiz"
  ) {
    return !ticket.codewiz_agent_name;
  }

  return !ticket.assignee_id;
}

function statusClass(status) {
  return `status-${String(
    status || ""
  )
    .toLowerCase()
    .replaceAll(
      " ",
      "-"
    )}`;
}

function getTicketSummary(ticket) {
  return (
    ticket.email_summary ||
    ticket.description ||
    ""
  )
    .replace(
      /<[^>]*>?/gm,
      ""
    )
    .trim();
}

function stripHtml(html) {
  if (!html) {
    return "";
  }

  const div =
    document.createElement(
      "div"
    );

  div.innerHTML =
    html;

  return (
    div.textContent ||
    div.innerText ||
    ""
  ).trim();
}

function escapeHtml(value) {
  return String(
    value || ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

function extractEmail(value) {
  if (!value) {
    return "";
  }

  const text =
    String(value).trim();

  const match =
    text.match(
      /<([^>]+)>/
    );

  return (
    match?.[1] ||
    text
  )
    .trim()
    .toLowerCase();
}

function splitAddresses(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(
      /[,;]+/
    )
    .map(
      (item) =>
        item.trim()
    )
    .filter(Boolean);
}

function uniqueAddresses(values) {
  const seen =
    new Set();

  const output =
    [];

  for (
    const value of
    values
  ) {
    const email =
      extractEmail(
        value
      );

    if (
      !email ||
      seen.has(email)
    ) {
      continue;
    }

    seen.add(email);
    output.push(value);
  }

  return output;
}

function formatFileSize(bytes) {
  if (
    bytes === null ||
    bytes === undefined
  ) {
    return "";
  }

  if (
    bytes < 1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function isOutboundThread(thread) {
  const direction =
    String(
      thread?.direction ||
      ""
    ).toLowerCase();

  return (
    direction.includes(
      "out"
    ) ||
    direction ===
      "outbound"
  );
}

function hasRecipientInfo(thread) {
  return Boolean(
    thread?.from_email ||
    thread?.to_email ||
    thread?.cc ||
    thread?.bcc
  );
}

function normalizeMentionList(value) {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value.flatMap(
    (item) => {
      if (
        Array.isArray(
          item
        )
      ) {
        return item;
      }

      return [item];
    }
  );
}

// ======================================================
// SMALL COMPONENTS
// ======================================================

function BrandBadge({
  source,
  compact = false,
}) {
  const brand = source || "Unknown";
  const mark =
    brand === "Qualicare"
      ? "Q"
      : brand === "Tutor Doctor"
        ? "TD"
        : brand === "Code Wiz"
          ? "CW"
          : "?";

  return (
    <span
      className={`brand-badge ${brandClass(
        source
      )} ${compact ? "brand-badge-compact" : ""}`}
      title={brand}
    >
      <span className="brand-mark" aria-hidden="true">
        {mark}
      </span>
      <span className="brand-name">{brand}</span>
    </span>
  );
}

function StatusBadge({
  status,
}) {
  return (
    <span
      className={`status-badge ${statusClass(
        status
      )}`}
    >
      {status ||
        "Unknown"}
    </span>
  );
}

function Detail({
  label,
  children,
}) {
  return (
    <div className="detail-row">
      <div className="detail-label">
        {label}
      </div>

      <div className="detail-value">
        {children}
      </div>
    </div>
  );
}

function RecipientLine({
  label,
  value,
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="message-recipient-line">

      <div className="message-recipient-label">
        {label}
      </div>

      <div className="message-recipient-value">
        {value}
      </div>
    </div>
  );
}

// ======================================================
// LOGIN
// ======================================================


function ticketAgeDays(ticket) {
  if (!ticket) return 0;
  const opened = ticket.created_at_zoho || ticket.created_at;
  if (!opened) return 0;
  const start = new Date(opened).getTime();
  if (Number.isNaN(start)) return 0;
  const end = ticket.status === "Closed" && ticket.updated_at_zoho
    ? new Date(ticket.updated_at_zoho).getTime()
    : Date.now();
  return Math.max(0, end - start) / 86400000;
}

function formatAge(ticket) {
  const days = ticketAgeDays(ticket);
  if (!days) return "—";
  if (days < 1) return `${Math.max(1, Math.floor(days * 24))}h`;
  if (days < 7) return `${Math.floor(days)}d ${Math.floor((days % 1) * 24)}h`;
  return `${Math.floor(days / 7)}w ${Math.floor(days % 7)}d`;
}

function lastActivityAt(threads = [], comments = [], ticket = null) {
  const values = [
    ticket?.updated_at_zoho,
    ...threads.map(x => x.created_at_zoho),
    ...comments.map(x => x.commented_at_zoho),
  ].filter(Boolean).map(x => new Date(x).getTime()).filter(Number.isFinite);
  return values.length ? new Date(Math.max(...values)).toISOString() : null;
}

function lastActivityLabel(threads = [], comments = [], ticket = null) {
  const value = lastActivityAt(threads, comments, ticket);
  if (!value) return "No activity";
  const hours = Math.max(0, (Date.now() - new Date(value).getTime()) / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  if (hours < 168) return `${Math.floor(hours / 24)}d ago`;
  return `${Math.floor(hours / 168)}w ago`;
}

function needsAttentionReason(ticket) {
  if (!ticket || ticket.status === "Closed") return "";
  if (isOverdue(ticket)) return "Overdue";
  if (isTicketUnassigned(ticket)) return "Unassigned";
  if (String(ticket.priority || "").toLowerCase() === "high") return "High priority";
  if (ticketAgeDays(ticket) >= 7) return "Open 7+ days";
  if (ticketAgeDays(ticket) >= 3) return "Open 3+ days";
  if (ticket.status === "Escalated") return "Escalated";
  return "";
}

function isNeedsAttentionTicket(ticket) {
  return Boolean(needsAttentionReason(ticket));
}

function Login({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [recoverySession, setRecoverySession] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoverySession(true);
        setMode("reset");
        return;
      }
      if (nextSession && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        onSignedIn(nextSession);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [onSignedIn]);

  async function submit(event) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !isApprovedCompanyEmail(normalizedEmail)) {
      setMessage("Please use an approved company email address.");
      return;
    }
    setBusy(true); setMessage("");
    try {
      if (mode === "reset") {
        if (password.length < 8) throw new Error("Password must be at least 8 characters.");
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Password updated. Signing you in…");
        const { data: refreshed } = await supabase.auth.getSession();
        if (refreshed?.session) onSignedIn(refreshed.session);
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/`,
        });
        if (error) throw error;
        setMessage("If that account exists, a password reset email has been sent.");
      } else if (mode === "create") {
        if (password.length < 8) throw new Error("Password must be at least 8 characters.");
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data?.session) onSignedIn(data.session);
        else setMessage("Check your email to confirm your account, then sign in.");
      } else {
        if (!password) throw new Error("Enter your password.");
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
        if (data?.session) onSignedIn(data.session);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "forgot" ? "Reset your password" : mode === "reset" ? "Choose a new password" : mode === "create" ? "Create your password" : "Welcome back";
  const subtitle = mode === "forgot"
    ? "Enter your work email and we’ll send you a secure reset link."
    : mode === "reset"
      ? "Choose a new password for your Ticket Hub account."
      : mode === "create"
      ? "First time accessing the Hub? Set your password here."
      : "Your workspace for Qualicare, Tutor Doctor and Code Wiz.";

  return (
    <div className="login-page">
      <div className="login-card login-card-modern">
        <div className="login-logo"><span className="login-logo-mountain">▲</span><span>CSG</span></div>
        <div className="login-eyebrow">MARKETING OPERATIONS</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <form onSubmit={submit}>
          <label>Work email</label>
          <input type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
          {mode !== "forgot" && <>
            <label>Password</label>
            <input type="password" autoComplete={mode === "create" ? "new-password" : "current-password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </>}
          {mode === "create" && <>
            <label>Confirm password</label>
            <input type="password" autoComplete="new-password" placeholder="Repeat your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            <div className="password-hint">Use at least 8 characters.</div>
          </>}
          <button type="submit" className="primary-button" disabled={busy}>{busy ? "Please wait…" : mode === "forgot" ? "Send reset link" : mode === "create" ? "Create password" : "Sign in"}</button>
          {message && <div className="login-message">{message}</div>}
        </form>
        <div className="login-links">
          {mode === "login" && <>
            <button type="button" onClick={() => { setMode("forgot"); setMessage(""); }}>Forgot password?</button>
            <button type="button" onClick={() => { setMode("create"); setMessage(""); }}>First time accessing the Hub? <strong>Create your password</strong></button>
          </>}
          {mode !== "login" && mode !== "reset" && <button type="button" onClick={() => { setMode("login"); setMessage(""); }}>← Back to sign in</button>}
        </div>
      </div>
    </div>
  );
}

// ======================================================
// APP
// ======================================================

function App() {
  const editorRef =
    useRef(null);

  const composerRef =
    useRef(null);

  const fileInputRef =
    useRef(null);

  const imageInputRef =
    useRef(null);

  const commentFileInputRef =
    useRef(null);

  const commentInputRef =
    useRef(null);

  const [
    session,
    setSession,
  ] =
    useState(null);

  const [
    authLoading,
    setAuthLoading,
  ] =
    useState(true);

  const [
    tickets,
    setTickets,
  ] =
    useState([]);

  const [
    threads,
    setThreads,
  ] =
    useState([]);

  const [
    comments,
    setComments,
  ] =
    useState([]);

  const [
    agents,
    setAgents,
  ] =
    useState([]);

  const [
    tags,
    setTags,
  ] =
    useState([]);

  const [
    tagCatalog,
    setTagCatalog,
  ] =
    useState([]);

  const [
    selectedKey,
    setSelectedKey,
  ] =
    useState(null);

  const [
    loadingTickets,
    setLoadingTickets,
  ] =
    useState(false);

  const [
    loadingThreads,
    setLoadingThreads,
  ] =
    useState(false);

  const [
    loadingComments,
    setLoadingComments,
  ] =
    useState(false);

  const [
    loadingAgents,
    setLoadingAgents,
  ] =
    useState(false);

  const [
    loadingTags,
    setLoadingTags,
  ] =
    useState(false);

  const [
    zohoTierOptions,
    setZohoTierOptions,
  ] =
    useState([]);

  const [
    loadingTierOptions,
    setLoadingTierOptions,
  ] =
    useState(false);

  const [
    tierMetadataNotice,
    setTierMetadataNotice,
  ] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState("all");

  const [
    brandFilter,
    setBrandFilter,
  ] =
    useState("all");

  const [
    departmentFilter,
    setDepartmentFilter,
  ] =
    useState("all");

  const [
    search,
    setSearch,
  ] =
    useState("");


  const [dashboardTab, setDashboardTab] = useState(false);
  const [savedView, setSavedView] = useState("all");
  const [followedTickets, setFollowedTickets] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [showReminderMenu, setShowReminderMenu] = useState(false);
  const [reminderNotice, setReminderNotice] = useState("");
  const [draftNotice, setDraftNotice] = useState("");
  const [ageTick, setAgeTick] = useState(Date.now());
  const [ticketListView, setTicketListView] = useState(() => {
    try {
      return localStorage.getItem("csg-ticket-list-view") || "classic";
    } catch {
      return "classic";
    }
  });

  const [
    updateBusy,
    setUpdateBusy,
  ] =
    useState(false);

  const [
    updateNotice,
    setUpdateNotice,
  ] =
    useState("");


  useEffect(() => {
    const email = session?.user?.email?.toLowerCase();
    if (!email) return;
    try {
      setFollowedTickets(JSON.parse(localStorage.getItem(`csg-followed:${email}`) || "[]"));
      setReminders(JSON.parse(localStorage.getItem(`csg-reminders:${email}`) || "[]"));
    } catch {}
  }, [session?.user?.email]);

  useEffect(() => {
    const email = session?.user?.email?.toLowerCase();
    if (!email) return;
    localStorage.setItem(`csg-followed:${email}`, JSON.stringify(followedTickets));
  }, [followedTickets, session?.user?.email]);

  useEffect(() => {
    const email = session?.user?.email?.toLowerCase();
    if (!email) return;
    localStorage.setItem(`csg-reminders:${email}`, JSON.stringify(reminders));
  useEffect(() => {
    try {
      localStorage.setItem("csg-ticket-list-view", ticketListView);
    } catch {}
  }, [ticketListView]);

  }, [reminders, session?.user?.email]);

  useEffect(() => {
    const id = setInterval(() => setAgeTick(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShowCommandPalette(true);
        setCommandQuery("");
      }
      if (event.key === "Escape") {
        setShowCommandPalette(false);
        setShowReminderMenu(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function toggleFollow(ticketKey) {
    setFollowedTickets(current => current.includes(ticketKey)
      ? current.filter(key => key !== ticketKey)
      : [...current, ticketKey]);
  }

  function addReminder(ticket, hours = 24) {
    if (!ticket) return;
    const dueAt = new Date(Date.now() + hours * 3600000).toISOString();
    setReminders(current => [
      ...current.filter(item => item.ticket_key !== ticket.ticket_key),
      { id: `${ticket.ticket_key}-${Date.now()}`, ticket_key: ticket.ticket_key, due_at: dueAt, note: "", dismissed: false },
    ]);
    setReminderNotice(`Reminder set for ${formatDateTime(dueAt)}`);
    setShowReminderMenu(false);
  }

  function dismissReminder(id) {
    setReminders(current => current.map(item => item.id === id ? { ...item, dismissed: true } : item));
  }

  const activeReminders = reminders.filter(item => !item.dismissed);

  // ====================================================
  // ZOHO FIELD METADATA
  // ====================================================

  const loadTierMetadata =
    useCallback(
      async (
        source
      ) => {
        if (
          !session ||
          !source
        ) {
          setZohoTierOptions([]);
          setTierMetadataNotice("");
          return;
        }

        setLoadingTierOptions(
          true
        );
        setTierMetadataNotice("");

        const {
          data,
          error,
        } =
          await supabase
            .functions
            .invoke(
              "get-zoho-ticket-metadata",
              {
                body: {
                  source,
                },
              }
            );

        if (
          error ||
          !data?.success
        ) {
          console.error(
            "Tier metadata error:",
            error || data
          );

          setZohoTierOptions([]);
          setTierMetadataNotice(
            data?.error ||
              error?.message ||
              "Could not load Zoho tier options."
          );
        } else {
          setZohoTierOptions(
            Array.isArray(
              data.tier_options
            )
              ? data.tier_options
              : []
          );
        }

        setLoadingTierOptions(
          false
        );
      },
      [
        session,
      ]
    );

  // ====================================================
  // TAGS
  // ====================================================

  const [
    tagInput,
    setTagInput,
  ] =
    useState("");

  const [
    tagBusy,
    setTagBusy,
  ] =
    useState(false);

  const [
    tagNotice,
    setTagNotice,
  ] =
    useState("");

  const [
    showTagSuggestions,
    setShowTagSuggestions,
  ] =
    useState(false);

  // ====================================================
  // EMAIL COMPOSER
  // ====================================================

  const [
    replyMode,
    setReplyMode,
  ] =
    useState(
      "reply"
    );

  const [
    showReplyModeMenu,
    setShowReplyModeMenu,
  ] =
    useState(false);

  const [
    showSendMenu,
    setShowSendMenu,
  ] =
    useState(false);

  const [
    showCc,
    setShowCc,
  ] =
    useState(false);

  const [
    showBcc,
    setShowBcc,
  ] =
    useState(false);

  const [
    recipientTo,
    setRecipientTo,
  ] =
    useState("");

  const [
    recipientCc,
    setRecipientCc,
  ] =
    useState("");

  const [
    recipientBcc,
    setRecipientBcc,
  ] =
    useState("");

  const [
    editorHtml,
    setEditorHtml,
  ] =
    useState("");

  const [
    composerBusy,
    setComposerBusy,
  ] =
    useState(false);

  const [
    composerNotice,
    setComposerNotice,
  ] =
    useState("");

  const [
    pendingFiles,
    setPendingFiles,
  ] =
    useState([]);

  const [
    uploadProgress,
    setUploadProgress,
  ] =
    useState("");

  // ====================================================
  // COMMENTS
  // ====================================================

  const [
    commentText,
    setCommentText,
  ] =
    useState("");

  const [
    commentPublic,
    setCommentPublic,
  ] =
    useState(false);

  const [
    commentMentions,
    setCommentMentions,
  ] =
    useState([]);

  const [
    mentionQuery,
    setMentionQuery,
  ] =
    useState("");

  const [
    showMentionSuggestions,
    setShowMentionSuggestions,
  ] =
    useState(false);

  const [
    commentFiles,
    setCommentFiles,
  ] =
    useState([]);

  const [
    commentBusy,
    setCommentBusy,
  ] =
    useState(false);

  const [
    commentNotice,
    setCommentNotice,
  ] =
    useState("");

  // ====================================================
  // NOTIFICATIONS
  // ====================================================

  const [
    notifications,
    setNotifications,
  ] =
    useState([]);

  const [
    showNotifications,
    setShowNotifications,
  ] =
    useState(false);

  const [
    loadingNotifications,
    setLoadingNotifications,
  ] =
    useState(false);

  // ====================================================
  // AUTH
  // ====================================================

  useEffect(() => {
    async function loadSession() {
      const {
        data,
      } =
        await supabase
          .auth
          .getSession();

      setSession(
        data.session
      );

      setAuthLoading(
        false
      );
    }

    loadSession();

    const {
      data:
        listener,
    } =
      supabase
        .auth
        .onAuthStateChange(
          (
            _event,
            nextSession
          ) => {
            setSession(
              nextSession
            );
          }
        );

    return () => {
      listener
        .subscription
        .unsubscribe();
    };
  }, []);

  // ====================================================
  // NOTIFICATIONS
  // ====================================================

  const loadNotifications =
    useCallback(
      async () => {
        if (!session) {
          setNotifications([]);
          return;
        }

        setLoadingNotifications(
          true
        );

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "ticket_notifications"
            )
            .select("*")
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(50);

        if (error) {
          console.error(
            "Notification load error:",
            error
          );
          setNotifications([]);
        } else {
          setNotifications(
            data || []
          );
        }

        setLoadingNotifications(
          false
        );
      },
      [
        session,
      ]
    );

  useEffect(() => {
    if (session) {
      loadNotifications();
    } else {
      setNotifications([]);
    }
  }, [
    session,
    loadNotifications,
  ]);

  const unreadNotificationCount =
    useMemo(
      () =>
        notifications.filter(
          (
            notification
          ) =>
            !notification.is_read
        ).length,
      [
        notifications,
      ]
    );

  async function openNotification(
    notification
  ) {
    if (!notification) {
      return;
    }

    if (
      !notification.is_read
    ) {
      const {
        error,
      } =
        await supabase
          .from(
            "ticket_notifications"
          )
          .update({
            is_read:
              true,

            read_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            notification.id
          );

      if (!error) {
        setNotifications(
          (
            current
          ) =>
            current.map(
              (
                item
              ) =>
                item.id ===
                notification.id
                  ? {
                      ...item,
                      is_read:
                        true,
                      read_at:
                        new Date()
                          .toISOString(),
                    }
                  : item
            )
        );
      }
    }

    setFilter(
      "all"
    );

    setBrandFilter(
      notification.source ||
      "all"
    );

    setDepartmentFilter(
      "all"
    );

    setSearch(
      ""
    );

    setSelectedKey(
      notification.ticket_key
    );

    setShowNotifications(
      false
    );
  }

  async function markAllNotificationsRead() {
    const unreadIds =
      notifications
        .filter(
          (
            notification
          ) =>
            !notification.is_read
        )
        .map(
          (
            notification
          ) =>
            notification.id
        );

    if (
      unreadIds.length ===
      0
    ) {
      return;
    }

    const now =
      new Date()
        .toISOString();

    const {
      error,
    } =
      await supabase
        .from(
          "ticket_notifications"
        )
        .update({
          is_read:
            true,

          read_at:
            now,
        })
        .in(
          "id",
          unreadIds
        );

    if (!error) {
      setNotifications(
        (
          current
        ) =>
          current.map(
            (
              item
            ) => ({
              ...item,
              is_read:
                true,
              read_at:
                item.read_at ||
                now,
            })
          )
      );
    }
  }

  // ====================================================
  // TICKETS
  // ====================================================

  const loadTickets =
    useCallback(
      async (
        preferredKey = null
      ) => {
        if (!session) {
          return;
        }

        setLoadingTickets(
          true
        );

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "tickets"
            )
            .select("*")
            .eq(
              "is_deleted",
              false
            )
            .eq(
              "is_trashed",
              false
            )
            .order(
              "updated_at_zoho",
              {
                ascending:
                  false,
                nullsFirst:
                  false,
              }
            );

        if (error) {
          console.error(
            "Ticket load error:",
            error
          );

          setLoadingTickets(
            false
          );

          return;
        }

        const rows =
          data || [];

        setTickets(
          rows
        );

        setSelectedKey(
          (
            current
          ) => {
            const desired =
              preferredKey ||
              current;

            if (
              desired &&
              rows.some(
                (
                  ticket
                ) =>
                  ticket.ticket_key ===
                  desired
              )
            ) {
              return desired;
            }

            return (
              rows.find(
                (
                  ticket
                ) =>
                  ticket.status !==
                  "Closed"
              )
                ?.ticket_key ||
              rows[0]
                ?.ticket_key ||
              null
            );
          }
        );

        setLoadingTickets(
          false
        );
      },
      [
        session,
      ]
    );

  useEffect(() => {
    if (session) {
      loadTickets();
    }
  }, [
    session,
    loadTickets,
  ]);

  const selected =
    useMemo(
      () =>
        tickets.find(
          (
            ticket
          ) =>
            ticket.ticket_key ===
            selectedKey
        ) ||
        null,
      [
        tickets,
        selectedKey,
      ]
    );

  // ====================================================
  // THREADS
  // ====================================================

  const loadThreads =
    useCallback(
      async (
        ticketKey
      ) => {
        if (
          !session ||
          !ticketKey
        ) {
          setThreads([]);
          return;
        }

        setLoadingThreads(
          true
        );

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "ticket_threads"
            )
            .select("*")
            .eq(
              "ticket_key",
              ticketKey
            )
            .order(
              "created_at_zoho",
              {
                ascending:
                  true,
              }
            );

        if (error) {
          console.error(
            "Thread load error:",
            error
          );

          setThreads([]);
        } else {
          setThreads(
            data || []
          );
        }

        setLoadingThreads(
          false
        );
      },
      [
        session,
      ]
    );

  // ====================================================
  // COMMENTS
  // ====================================================

  const loadComments =
    useCallback(
      async (
        ticketKey,
        syncFirst = false
      ) => {
        if (
          !session ||
          !ticketKey
        ) {
          setComments([]);
          return;
        }

        setLoadingComments(
          true
        );

        if (
          syncFirst
        ) {
          try {
            await supabase
              .functions
              .invoke(
                "manage-zoho-ticket-comments",
                {
                  body: {
                    ticket_key:
                      ticketKey,

                    action:
                      "sync",
                  },
                }
              );
          } catch (
            error
          ) {
            console.warn(
              "Comment sync failed:",
              error
            );
          }
        }

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "ticket_comments"
            )
            .select("*")
            .eq(
              "ticket_key",
              ticketKey
            )
            .order(
              "commented_at_zoho",
              {
                ascending:
                  false,
              }
            );

        if (error) {
          console.error(
            "Comment load error:",
            error
          );

          setComments([]);
        } else {
          setComments(
            data || []
          );
        }

        setLoadingComments(
          false
        );
      },
      [
        session,
      ]
    );

  useEffect(() => {
    if (
      selectedKey
    ) {
      loadThreads(
        selectedKey
      );

      loadComments(
        selectedKey,
        true
      );
    } else {
      setThreads([]);
      setComments([]);
    }

    setCommentText("");
    setCommentPublic(false);
    setCommentMentions([]);
    setCommentFiles([]);
    setCommentNotice("");
    setMentionQuery("");
    setShowMentionSuggestions(
      false
    );
  }, [
    selectedKey,
    loadThreads,
    loadComments,
  ]);

  // ====================================================
  // AGENTS
  // ====================================================

  const loadAgents =
    useCallback(
      async (
        source
      ) => {
        if (
          !session ||
          !source
        ) {
          setAgents([]);
          return;
        }

        setLoadingAgents(
          true
        );

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "zoho_agents"
            )
            .select(
              "zoho_agent_id, zuid, name, email, active, source"
            )
            .eq(
              "source",
              source
            )
            .eq(
              "active",
              true
            )
            .order(
              "name",
              {
                ascending:
                  true,
              }
            );

        if (error) {
          console.error(
            "Agent load error:",
            error
          );

          setAgents([]);
        } else {
          setAgents(
            data || []
          );
        }

        setLoadingAgents(
          false
        );
      },
      [
        session,
      ]
    );

  // ====================================================
  // TAGS
  // ====================================================

  const loadTags =
    useCallback(
      async (
        ticketKey
      ) => {
        if (
          !session ||
          !ticketKey
        ) {
          setTags([]);
          return;
        }

        setLoadingTags(
          true
        );

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "ticket_tags"
            )
            .select(
              "id, ticket_key, zoho_tag_id, name, tag_type"
            )
            .eq(
              "ticket_key",
              ticketKey
            )
            .order(
              "name",
              {
                ascending:
                  true,
              }
            );

        if (error) {
          console.error(
            "Tag load error:",
            error
          );

          setTags([]);
        } else {
          setTags(
            data || []
          );
        }

        setLoadingTags(
          false
        );
      },
      [
        session,
      ]
    );

  const loadTagCatalog =
    useCallback(
      async (
        source
      ) => {
        if (
          !session ||
          !source
        ) {
          setTagCatalog([]);
          return;
        }

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "zoho_tags"
            )
            .select(
              "zoho_tag_id, name, tag_type"
            )
            .eq(
              "source",
              source
            )
            .eq(
              "active",
              true
            )
            .order(
              "name",
              {
                ascending:
                  true,
              }
            );

        if (error) {
          console.error(
            "Tag catalog error:",
            error
          );

          setTagCatalog([]);
        } else {
          setTagCatalog(
            data || []
          );
        }
      },
      [
        session,
      ]
    );

  useEffect(() => {
    if (
      selected?.source
    ) {
      loadAgents(
        selected.source
      );

      loadTagCatalog(
        selected.source
      );

      loadTierMetadata(
        selected.source
      );
    } else {
      setAgents([]);
      setTagCatalog([]);
      setZohoTierOptions([]);
      setTierMetadataNotice("");
    }
  }, [
    selected?.source,
    loadAgents,
    loadTagCatalog,
    loadTierMetadata,
  ]);

  useEffect(() => {
    if (
      selectedKey
    ) {
      loadTags(
        selectedKey
      );
    } else {
      setTags([]);
    }

    setTagInput("");
    setTagNotice("");
    setShowTagSuggestions(
      false
    );
  }, [
    selectedKey,
    loadTags,
  ]);

  // ====================================================
  // REALTIME
  // ====================================================

  useEffect(() => {
    if (!session) {
      return;
    }

    const channel =
      supabase
        .channel(
          "ticket-hub-live"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tickets",
          },
          () => {
            loadTickets();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "ticket_threads",
          },
          (
            payload
          ) => {
            const key =
              payload.new
                ?.ticket_key ||
              payload.old
                ?.ticket_key;

            if (
              key ===
              selectedKey
            ) {
              loadThreads(
                selectedKey
              );
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "ticket_comments",
          },
          (
            payload
          ) => {
            const key =
              payload.new
                ?.ticket_key ||
              payload.old
                ?.ticket_key;

            if (
              key ===
              selectedKey
            ) {
              loadComments(
                selectedKey,
                false
              );
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "ticket_notifications",
          },
          () => {
            loadNotifications();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "ticket_tags",
          },
          (
            payload
          ) => {
            const key =
              payload.new
                ?.ticket_key ||
              payload.old
                ?.ticket_key;

            if (
              key ===
              selectedKey
            ) {
              loadTags(
                selectedKey
              );
            }
          }
        )
        .subscribe();

    return () => {
      supabase
        .removeChannel(
          channel
        );
    };
  }, [
    session,
    selectedKey,
    loadTickets,
    loadThreads,
    loadComments,
    loadTags,
    loadNotifications,
  ]);

  // ====================================================
  // TIMELINE
  // ====================================================

  const newestThreads =
    useMemo(
      () =>
        [...threads].sort(
          (
            a,
            b
          ) =>
            new Date(
              b.created_at_zoho ||
                0
            ).getTime() -
            new Date(
              a.created_at_zoho ||
                0
            ).getTime()
        ),
      [
        threads,
      ]
    );

  const latestThread =
    newestThreads[0] ||
    null;

  useEffect(() => {
    if (!selected?.ticket_key || !editorRef.current) return;
    const key = `csg-draft:${selected.ticket_key}:${session?.user?.email || ""}`;
    const draft = localStorage.getItem(key) || "";
    editorRef.current.innerHTML = draft;
    setEditorHtml(draft);
    setDraftNotice(draft ? "Draft restored" : "");
  }, [selected?.ticket_key, session?.user?.email]);

  const timelineItems =
    useMemo(() => {
      const emailItems =
        threads.map(
          (
            thread
          ) => ({
            key:
              `email-${thread.thread_key || thread.id}`,

            type:
              "email",

            timestamp:
              thread.created_at_zoho,

            data:
              thread,
          })
        );

      const commentItems =
        comments.map(
          (
            comment
          ) => ({
            key:
              `comment-${comment.comment_key || comment.id}`,

            type:
              "comment",

            timestamp:
              comment.commented_at_zoho,

            data:
              comment,
          })
        );

      return [
        ...emailItems,
        ...commentItems,
      ].sort(
        (
          a,
          b
        ) =>
          new Date(
            b.timestamp ||
              0
          ).getTime() -
          new Date(
            a.timestamp ||
              0
          ).getTime()
      );
    }, [
      threads,
      comments,
    ]);

  // ====================================================
  // FROM EMAIL
  // ====================================================

  const detectedFromEmail =
    useMemo(() => {
      const outbound =
        newestThreads.find(
          (
            thread
          ) =>
            isOutboundThread(
              thread
            ) &&
            thread.from_email
        );

      return (
        outbound
          ?.from_email ||
        "Configured Zoho support address"
      );
    }, [
      newestThreads,
    ]);

  // ====================================================
  // REPLY TARGETS
  // ====================================================

  function getReplyTarget(
    thread
  ) {
    if (!selected) {
      return "";
    }

    if (
      !thread
    ) {
      return (
        selected.contact_email ||
        ""
      );
    }

    if (
      isOutboundThread(
        thread
      )
    ) {
      const recipients =
        splitAddresses(
          thread.to_email
        );

      const external =
        recipients.find(
          (
            address
          ) =>
            extractEmail(
              address
            ) !==
            extractEmail(
              detectedFromEmail
            )
        );

      return (
        external ||
        selected.contact_email ||
        recipients[0] ||
        ""
      );
    }

    return (
      thread.from_email ||
      selected.contact_email ||
      ""
    );
  }

  /*
    Reply All uses the recipients from the
    CURRENT email/thread being replied to.

    This prevents old historical CCs from being
    accidentally re-added.
  */
  function calculateReplyAllCc(
    thread,
    toAddress
  ) {
    if (
      !thread ||
      !selected
    ) {
      return "";
    }

    const candidates =
      [
        ...splitAddresses(
          thread.from_email
        ),
        ...splitAddresses(
          thread.to_email
        ),
        ...splitAddresses(
          thread.cc
        ),
      ];

    const excluded =
      new Set(
        [
          toAddress,
          detectedFromEmail,
          session
            ?.user
            ?.email,
        ]
          .filter(Boolean)
          .map(
            extractEmail
          )
      );

    return uniqueAddresses(
      candidates
    )
      .filter(
        (
          value
        ) =>
          !excluded.has(
            extractEmail(
              value
            )
          )
      )
      .join(", ");
  }

  const resetComposer =
    useCallback(() => {
      setReplyMode(
        "reply"
      );

      setRecipientTo(
        selected
          ?.contact_email ||
        ""
      );

      setRecipientCc("");
      setRecipientBcc("");

      setShowCc(false);
      setShowBcc(false);

      setEditorHtml("");
      setPendingFiles([]);

      setComposerNotice("");
      setUploadProgress("");

      if (
        editorRef.current
      ) {
        editorRef.current.innerHTML =
          "";
      }
    }, [
      selected,
    ]);

  useEffect(() => {
    resetComposer();
  }, [
    selectedKey,
    resetComposer,
  ]);

  function scrollToComposer() {
    window.setTimeout(
      () => {
        composerRef
          .current
          ?.scrollIntoView({
            behavior:
              "smooth",
            block:
              "start",
          });

        window.setTimeout(
          () => {
            editorRef
              .current
              ?.focus();
          },
          250
        );
      },
      20
    );
  }

  function configureComposer(
    mode,
    thread =
      latestThread
  ) {
    setReplyMode(mode);
    setShowReplyModeMenu(
      false
    );
    setComposerNotice("");

    if (
      mode ===
      "reply"
    ) {
      const to =
        getReplyTarget(
          thread
        );

      setRecipientTo(to);
      setRecipientCc("");
      setRecipientBcc("");

      setShowCc(false);
      setShowBcc(false);
    }

    if (
      mode ===
      "reply_all"
    ) {
      const to =
        getReplyTarget(
          thread
        );

      const cc =
        calculateReplyAllCc(
          thread,
          to
        );

      setRecipientTo(to);
      setRecipientCc(cc);
      setRecipientBcc("");

      setShowCc(
        true
      );

      setShowBcc(
        false
      );
    }

    if (
      mode ===
      "forward"
    ) {
      setRecipientTo("");
      setRecipientCc("");
      setRecipientBcc("");

      setShowCc(false);
      setShowBcc(false);
    }

    scrollToComposer();
  }

  function changeReplyMode(
    mode
  ) {
    configureComposer(
      mode,
      latestThread
    );
  }

  // ====================================================
  // RICH TEXT
  // ====================================================

  function focusEditor() {
    editorRef
      .current
      ?.focus();
  }

  function runEditorCommand(
    command,
    value = null
  ) {
    focusEditor();

    document.execCommand(
      command,
      false,
      value
    );

    setEditorHtml(
      editorRef
        .current
        ?.innerHTML ||
        ""
    );
  }

  function addLink() {
    const url =
      window.prompt(
        "Enter the link URL:"
      );

    if (!url) {
      return;
    }

    runEditorCommand(
      "createLink",
      url
    );
  }

  // ====================================================
  // ATTACHMENTS
  // ====================================================

  function addFiles(
    fileList
  ) {
    const files =
      Array.from(
        fileList ||
        []
      );

    if (
      !files.length
    ) {
      return;
    }

    setPendingFiles(
      (
        current
      ) => {
        const existing =
          new Set(
            current.map(
              (
                item
              ) =>
                `${item.name}-${item.size}-${item.lastModified}`
            )
          );

        const additions =
          files.filter(
            (
              file
            ) =>
              !existing.has(
                `${file.name}-${file.size}-${file.lastModified}`
              )
          );

        return [
          ...current,
          ...additions,
        ];
      }
    );
  }

  function removePendingFile(
    index
  ) {
    setPendingFiles(
      (
        current
      ) =>
        current.filter(
          (
            _,
            itemIndex
          ) =>
            itemIndex !==
            index
        )
    );
  }

  function addCommentFiles(
    fileList
  ) {
    const files =
      Array.from(
        fileList ||
        []
      );

    setCommentFiles(
      (
        current
      ) => {
        const existing =
          new Set(
            current.map(
              (
                item
              ) =>
                `${item.name}-${item.size}-${item.lastModified}`
            )
          );

        return [
          ...current,
          ...files.filter(
            (
              file
            ) =>
              !existing.has(
                `${file.name}-${file.size}-${file.lastModified}`
              )
          ),
        ];
      }
    );
  }

  async function uploadAttachment(
    file
  ) {
    const {
      data:
        sessionData,
    } =
      await supabase
        .auth
        .getSession();

    const token =
      sessionData
        .session
        ?.access_token;

    if (!token) {
      throw new Error(
        "Your session expired. Please sign in again."
      );
    }

    const formData =
      new FormData();

    formData.append(
      "ticket_key",
      selected.ticket_key
    );

    formData.append(
      "file",
      file,
      file.name
    );

    const response =
      await fetch(
        `${SUPABASE_URL}/functions/v1/upload-zoho-attachment`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            apikey:
              SUPABASE_ANON_KEY,
          },

          body:
            formData,
        }
      );

    const raw =
      await response.text();

    let data = {};

    try {
      data =
        raw
          ? JSON.parse(
              raw
            )
          : {};
    } catch {
      data = {
        raw,
      };
    }

    if (
      !response.ok ||
      !data?.success
    ) {
      throw new Error(
        data?.error ||
        `Could not upload ${file.name}`
      );
    }

    return data
      .attachment;
  }

  // ====================================================
  // EMAIL SEND
  // ====================================================

  async function sendMessage(
    sendAction =
      "send"
  ) {
    if (
      !selected ||
      composerBusy
    ) {
      return;
    }

    const html =
      editorRef
        .current
        ?.innerHTML ||
      editorHtml;

    if (
      !stripHtml(html)
    ) {
      setComposerNotice(
        "Write a message before sending."
      );

      return;
    }

    if (
      !recipientTo.trim()
    ) {
      setComposerNotice(
        replyMode ===
        "forward"
          ? "Add at least one forwarding recipient."
          : "A recipient is required."
      );

      return;
    }

    setComposerBusy(true);
    setComposerNotice("");
    setShowSendMenu(false);

    try {
      const uploaded =
        [];

      for (
        let index = 0;
        index <
        pendingFiles.length;
        index++
      ) {
        const file =
          pendingFiles[
            index
          ];

        setUploadProgress(
          `Uploading ${index + 1} of ${pendingFiles.length}: ${file.name}`
        );

        const attachment =
          await uploadAttachment(
            file
          );

        uploaded.push(
          attachment
        );
      }

      setUploadProgress(
        pendingFiles.length
          ? "Sending message…"
          : ""
      );

      const {
        data,
        error,
      } =
        await supabase
          .functions
          .invoke(
            "reply-to-zoho-ticket",
            {
              body: {
                ticket_key:
                  selected.ticket_key,

                mode:
                  replyMode,

                send_action:
                  sendAction,

                content_html:
                  html,

                to:
                  recipientTo,

                cc:
                  recipientCc,

                bcc:
                  recipientBcc,

                attachment_ids:
                  uploaded.map(
                    (
                      attachment
                    ) =>
                      attachment.id
                  ),
              },
            }
          );

      if (
        error ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
          error?.message ||
          "Could not send the message."
        );
      }

      let successText =
        "Message sent";

      if (
        sendAction ===
        "send_close"
      ) {
        successText =
          "Message sent and ticket closed";
      }

      if (
        sendAction ===
        "send_waiting"
      ) {
        successText =
          "Message sent and ticket set to Waiting";
      }

      if (
        sendAction ===
        "send_on_hold"
      ) {
        successText =
          "Message sent and ticket set to On Hold";
      }

      setComposerNotice(
        successText
      );

      setEditorHtml("");

      if (
        editorRef.current
      ) {
        editorRef.current.innerHTML =
          "";
      }

      setPendingFiles([]);
      setUploadProgress("");

      await loadThreads(
        selected.ticket_key
      );

      await loadTickets(
        selected.ticket_key
      );
    } catch (
      error
    ) {
      setUploadProgress("");

      setComposerNotice(
        error instanceof
        Error
          ? error.message
          : "Could not send the message."
      );
    } finally {
      setComposerBusy(
        false
      );
    }
  }

  // ====================================================
  // COMMENTS + MENTIONS
  // ====================================================

  const mentionSuggestions =
    useMemo(() => {
      if (
        !showMentionSuggestions
      ) {
        return [];
      }

      const needle =
        mentionQuery
          .trim()
          .toLowerCase();

      const zohoAgentOptions =
        agents
          .filter(
            (
              agent
            ) =>
              agent.zuid
          )
          .map(
            (
              agent
            ) => ({
              ...agent,

              mention_type:
                "zoho_agent",

              mention_key:
                `zoho:${agent.zoho_agent_id}`,
            })
          );

      /*
        Qualicare's active Zoho agents currently come back without ZUIDs.
        They therefore cannot create native Zoho @mentions, but we still
        expose them in the Ticket Hub mention picker and handle them as
        Ticket Hub mentions.
      */
      const qualicareHubOptions =
        selected?.source ===
        "Qualicare"
          ? agents
              .filter(
                (
                  agent
                ) =>
                  !agent.zuid &&
                  agent.active !==
                    false &&
                  String(
                    agent.email ||
                      ""
                  ).trim()
              )
              .map(
                (
                  agent
                ) => ({
                  ...agent,

                  mention_type:
                    "ticket_hub_user",

                  mention_key:
                    `ticket-hub:${String(
                      agent.email ||
                        ""
                    )
                      .trim()
                      .toLowerCase()}`,
                })
              )
          : [];

      const codeWizTeamOptions =
        selected?.source ===
        "Code Wiz"
          ? CODEWIZ_TICKET_OWNERS.map(
              (
                person
              ) => ({
                ...person,

                zoho_agent_id:
                  null,

                zuid:
                  null,

                mention_type:
                  "ticket_hub_user",

                mention_key:
                  `ticket-hub:${person.email.toLowerCase()}`,
              })
            )
          : [];

      const zohoEmails =
        new Set(
          zohoAgentOptions
            .map(
              (
                agent
              ) =>
                String(
                  agent.email ||
                    ""
                )
                  .trim()
                  .toLowerCase()
            )
            .filter(Boolean)
        );

      const combined =
        [
          ...codeWizTeamOptions.filter(
            (
              person
            ) =>
              !zohoEmails.has(
                String(
                  person.email ||
                    ""
                )
                  .trim()
                  .toLowerCase()
              )
          ),
          ...qualicareHubOptions.filter(
            (
              person
            ) =>
              !zohoEmails.has(
                String(
                  person.email ||
                    ""
                )
                  .trim()
                  .toLowerCase()
              )
          ),
          ...zohoAgentOptions,
        ];

      return combined
        .filter(
          (
            person
          ) => {
            if (!needle) {
              return true;
            }

            return `${person.name || ""} ${person.email || ""}`
              .toLowerCase()
              .includes(
                needle
              );
          }
        )
        .slice(
          0,
          12
        );
    }, [
      agents,
      mentionQuery,
      selected?.source,
      showMentionSuggestions,
    ]);

  function handleCommentChange(
    value
  ) {
    setCommentText(
      value
    );

    const match =
      value.match(
        /@([^@\n]*)$/
      );

    if (match) {
      setMentionQuery(
        match[1]
      );

      setShowMentionSuggestions(
        true
      );
    } else {
      setMentionQuery("");
      setShowMentionSuggestions(
        false
      );
    }
  }

  function mentionIdentity(
    mention
  ) {
    return (
      mention?.mention_key ||
      (
        mention?.zoho_agent_id
          ? `zoho:${mention.zoho_agent_id}`
          : `ticket-hub:${String(
              mention?.email ||
                ""
            )
              .trim()
              .toLowerCase()}`
      )
    );
  }

  function selectMention(
    agent
  ) {
    const atIndex =
      commentText.lastIndexOf(
        "@"
      );

    if (
      atIndex ===
      -1
    ) {
      return;
    }

    const display =
      agent.name ||
      agent.email ||
      "Teammate";

    const before =
      commentText.slice(
        0,
        atIndex
      );

    setCommentText(
      `${before}@${display} `
    );

    setCommentMentions(
      (
        current
      ) => {
        const identity =
          mentionIdentity(
            agent
          );

        if (
          current.some(
            (
              item
            ) =>
              mentionIdentity(
                item
              ) ===
              identity
          )
        ) {
          return current;
        }

        return [
          ...current,
          {
            mention_type:
              agent.mention_type ||
              "zoho_agent",

            mention_key:
              identity,

            zoho_agent_id:
              agent.zoho_agent_id ||
              null,

            name:
              display,

            email:
              agent.email ||
              null,

            zuid:
              agent.zuid ||
              null,
          },
        ];
      }
    );

    setMentionQuery("");
    setShowMentionSuggestions(
      false
    );

    window.setTimeout(
      () => {
        commentInputRef
          .current
          ?.focus();
      },
      20
    );
  }

  async function submitComment() {
    if (
      !selected ||
      commentBusy
    ) {
      return;
    }

    if (
      !commentText.trim()
    ) {
      setCommentNotice(
        "Write a comment first."
      );

      return;
    }

    setCommentBusy(
      true
    );

    setCommentNotice(
      ""
    );

    try {
      const uploaded =
        [];

      for (
        const file of
        commentFiles
      ) {
        const attachment =
          await uploadAttachment(
            file
          );

        uploaded.push(
          attachment
        );
      }

      let transformed =
        commentText;

      for (
        const mention of
        commentMentions
      ) {
        const visible =
          `@${mention.name}`;

        const placeholder =
          mention.mention_type ===
          "ticket_hub_user"
            ? `[[HUB_MENTION:${String(
                mention.email ||
                  ""
              )
                .trim()
                .toLowerCase()}]]`
            : `[[MENTION:${mention.zoho_agent_id}]]`;

        transformed =
          transformed
            .split(
              visible
            )
            .join(
              placeholder
            );
      }

      const contentHtml =
        escapeHtml(
          transformed
        ).replace(
          /\n/g,
          "<br>"
        );

      const {
        data,
        error,
      } =
        await supabase
          .functions
          .invoke(
            "manage-zoho-ticket-comments",
            {
              body: {
                ticket_key:
                  selected.ticket_key,

                action:
                  "add",

                is_public:
                  commentPublic,

                content_html:
                  contentHtml,

                mentions:
                  commentMentions.map(
                    (
                      mention
                    ) => ({
                      mention_type:
                        mention.mention_type ||
                        "zoho_agent",

                      zoho_agent_id:
                        mention.zoho_agent_id ||
                        null,

                      name:
                        mention.name ||
                        null,

                      email:
                        mention.email ||
                        null,
                    })
                  ),

                attachment_ids:
                  uploaded.map(
                    (
                      attachment
                    ) =>
                      attachment.id
                  ),
              },
            }
          );

      if (
        error ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
          error?.message ||
          "Could not add the comment."
        );
      }

      setCommentText("");
      setCommentMentions([]);
      setCommentFiles([]);

      setCommentNotice(
        commentPublic
          ? "Public comment added"
          : "Private comment added"
      );

      await loadComments(
        selected.ticket_key,
        false
      );

      window.setTimeout(
        () =>
          setCommentNotice(
            ""
          ),
        2200
      );
    } catch (
      error
    ) {
      setCommentNotice(
        error instanceof
        Error
          ? error.message
          : "Could not add the comment."
      );
    } finally {
      setCommentBusy(
        false
      );
    }
  }

  // ====================================================
  // UPDATE TICKET
  // ====================================================

  async function updateTicketField(
    field,
    value
  ) {
    if (
      !selected ||
      updateBusy
    ) {
      return;
    }

    setUpdateBusy(
      true
    );

    setUpdateNotice(
      ""
    );

    let finalValue =
      value;

    if (
      field ===
      "dueDate"
    ) {
      finalValue =
        value
          ? new Date(
              `${value}T12:00:00`
            ).toISOString()
          : null;
    }

    const {
      data,
      error,
    } =
      await supabase
        .functions
        .invoke(
          "update-zoho-ticket",
          {
            body: {
              ticket_key:
                selected.ticket_key,

              changes: {
                [field]:
                  finalValue,
              },
            },
          }
        );

    if (
      error ||
      !data?.success
    ) {
      setUpdateNotice(
        `Could not update: ${
          data?.error ||
          error?.message ||
          "Unknown error"
        }`
      );

      setUpdateBusy(
        false
      );

      return;
    }

    setUpdateNotice(
      "Saved"
    );

    await loadTickets(
      selected.ticket_key
    );

    setTimeout(
      () => {
        setUpdateNotice("");
      },
      1800
    );

    setUpdateBusy(
      false
    );
  }

  // ====================================================
  // TAGS
  // ====================================================

  const suggestedTags =
    useMemo(() => {
      const needle =
        tagInput
          .trim()
          .toLowerCase();

      const attached =
        new Set(
          tags.map(
            (
              tag
            ) =>
              String(
                tag.name ||
                  ""
              )
                .trim()
                .toLowerCase()
          )
        );

      return tagCatalog
        .filter(
          (
            tag
          ) =>
            !attached.has(
              String(
                tag.name ||
                  ""
              )
                .trim()
                .toLowerCase()
            )
        )
        .filter(
          (
            tag
          ) => {
            if (!needle) {
              return true;
            }

            return String(
              tag.name ||
                ""
            )
              .toLowerCase()
              .includes(
                needle
              );
          }
        );
    }, [
      tagCatalog,
      tags,
      tagInput,
    ]);

  const exactTagMatch =
    useMemo(() => {
      const needle =
        tagInput
          .trim()
          .toLowerCase();

      if (!needle) {
        return false;
      }

      return tagCatalog.some(
        (
          tag
        ) =>
          String(
            tag.name ||
              ""
          )
            .trim()
            .toLowerCase() ===
          needle
      );
    }, [
      tagCatalog,
      tagInput,
    ]);

  async function addTagByName(
    name
  ) {
    if (
      !selected ||
      tagBusy ||
      !name.trim()
    ) {
      return;
    }

    const cleanName =
      name.trim();

    const duplicate =
      tags.some(
        (
          tag
        ) =>
          String(
            tag.name ||
              ""
          ).toLowerCase() ===
          cleanName.toLowerCase()
      );

    if (duplicate) {
      setTagNotice(
        "This ticket already has that tag."
      );

      return;
    }

    setTagBusy(
      true
    );

    setTagNotice("");
    setShowTagSuggestions(
      false
    );

    const {
      data,
      error,
    } =
      await supabase
        .functions
        .invoke(
          "manage-zoho-ticket-tags",
          {
            body: {
              ticket_key:
                selected.ticket_key,

              action:
                "add",

              tag_name:
                cleanName,
            },
          }
        );

    if (
      error ||
      !data?.success
    ) {
      setTagNotice(
        `Could not add tag: ${
          data?.error ||
          error?.message ||
          "Unknown error"
        }`
      );

      setTagBusy(
        false
      );

      return;
    }

    setTagInput("");

    setTagNotice(
      exactTagMatch
        ? "Tag added"
        : "Tag created and added"
    );

    await loadTags(
      selected.ticket_key
    );

    await loadTagCatalog(
      selected.source
    );

    setTagBusy(
      false
    );
  }

  async function addTag(
    event
  ) {
    event.preventDefault();

    await addTagByName(
      tagInput
    );
  }

  async function removeTag(
    tag
  ) {
    if (
      !selected ||
      !tag?.zoho_tag_id ||
      tagBusy
    ) {
      return;
    }

    setTagBusy(
      true
    );

    setTagNotice(
      ""
    );

    const {
      data,
      error,
    } =
      await supabase
        .functions
        .invoke(
          "manage-zoho-ticket-tags",
          {
            body: {
              ticket_key:
                selected.ticket_key,

              action:
                "remove",

              tag_id:
                tag.zoho_tag_id,

              tag_name:
                tag.name,
            },
          }
        );

    if (
      error ||
      !data?.success
    ) {
      setTagNotice(
        `Could not remove tag: ${
          data?.error ||
          error?.message ||
          "Unknown error"
        }`
      );

      setTagBusy(
        false
      );

      return;
    }

    setTagNotice(
      "Tag removed"
    );

    await loadTags(
      selected.ticket_key
    );

    setTagBusy(
      false
    );
  }

  const tierOptions =
    useMemo(() => {
      const values =
        new Set(
          (
            zohoTierOptions ||
            []
          )
            .map((value) =>
              String(
                value ||
                  ""
              ).trim()
            )
            .filter(Boolean)
        );

      /*
        Keep the ticket's current value visible even if
        it is a legacy value that is no longer in Zoho's
        current picklist configuration.
      */
      if (
        selected?.tier_level
      ) {
        values.add(
          String(
            selected.tier_level
          ).trim()
        );
      }

      return Array.from(
        values
      );
    }, [
      zohoTierOptions,
      selected?.tier_level,
    ]);

  // ====================================================
  // FILTERING
  // ====================================================

  function isVisibleMarketingTicket(
    ticket
  ) {
    /*
      Code Wiz Support tickets remain synced in Supabase so a Marketing
      ticket can still be reassigned to Support and Support agents can
      continue to be used in the Department and @mention controls.

      They are simply excluded from the Marketing Ticket Hub's ticket
      lists, searches, My Work views, status views, and counts.
    */
    if (
      ticket?.source ===
        "Code Wiz" &&
      String(
        ticket?.department ||
          ""
      )
        .trim()
        .toLowerCase() ===
        "support"
    ) {
      return false;
    }

    return true;
  }

  const filteredTickets =
    useMemo(() => {
      let rows =
        tickets.filter(
          isVisibleMarketingTicket
        );

      if (
        brandFilter !==
        "all"
      ) {
        rows =
          rows.filter(
            (
              ticket
            ) =>
              ticket.source ===
              brandFilter
          );
      }

      if (
        brandFilter ===
          "Tutor Doctor" &&
        departmentFilter !==
          "all"
      ) {
        rows =
          rows.filter(
            (
              ticket
            ) =>
              String(
                ticket.department ||
                  ""
              ).trim() ===
              departmentFilter
          );
      }

      if (
        filter ===
        "all"
      ) {
        rows =
          rows.filter(
            (
              ticket
            ) =>
              ticket.status !==
              "Closed"
          );
      }

      if (
        filter ===
        "open"
      ) {
        rows =
          rows.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "Open"
          );
      }

      if (
        filter ===
        "inprogress"
      ) {
        rows =
          rows.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "In Progress"
          );
      }

      if (
        filter ===
        "onhold"
      ) {
        rows =
          rows.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "On Hold"
          );
      }

      if (
        filter ===
        "waiting"
      ) {
        rows =
          rows.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "Waiting"
          );
      }

      if (
        filter ===
        "escalated"
      ) {
        rows =
          rows.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "Escalated"
          );
      }

      if (
        filter ===
        "closed"
      ) {
        rows =
          rows.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "Closed"
          );
      }

      if (
        filter ===
        "overdue"
      ) {
        rows =
          rows.filter(
            isOverdue
          );
      }

      if (
        filter ===
        "unassigned"
      ) {
        rows =
          rows.filter(
            (
              ticket
            ) =>
              isTicketUnassigned(
                ticket
              ) &&
              ticket.status !==
                "Closed"
          );
      }

      if (
        filter ===
        "high"
      ) {
        rows =
          rows.filter(
            (ticket) =>
              String(
                ticket.priority ||
                  ""
              ).toLowerCase() ===
              "high" &&
              ticket.status !==
                "Closed"
          );
      }

      if (
        filter ===
        "mine"
      ) {
        const userEmail =
          session
            ?.user
            ?.email
            ?.toLowerCase();

        rows =
          rows.filter(
            (
              ticket
            ) =>
              String(
                getTicketOwnerEmail(
                  ticket
                ) ||
                  ""
              ).toLowerCase() ===
                userEmail &&
              ticket.status !==
                "Closed"
          );
      }


      if (savedView === "needs") {
        rows = rows.filter(isNeedsAttentionTicket);
      }
      if (savedView === "aging") {
        rows = rows.filter(ticket => ticket.status !== "Closed" && ticketAgeDays(ticket) >= 3);
      }
      if (savedView === "followed") {
        rows = rows.filter(ticket => followedTickets.includes(ticket.ticket_key));
      }
      if (savedView === "reminders") {
        const keys = new Set(activeReminders.map(item => item.ticket_key));
        rows = rows.filter(ticket => keys.has(ticket.ticket_key));
      }
      if (savedView === "today") {
        const now = new Date();
        rows = rows.filter(ticket => {
          const due = ticket.due_date ? new Date(ticket.due_date) : null;
          return due && due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() === now.getDate();
        });
      }
      if (["age_0_1", "age_1_3", "age_3_5", "age_5_7", "age_7_plus"].includes(savedView)) {
        const ranges = { age_0_1: [0, 1], age_1_3: [1, 3], age_3_5: [3, 5], age_5_7: [5, 7], age_7_plus: [7, Infinity] };
        const [minAge, maxAge] = ranges[savedView];
        rows = rows.filter(ticket => { const age = ticketAgeDays(ticket); return age >= minAge && age < maxAge; });
      }

      // Closed tickets belong ONLY in the Closed view.
      if (filter !== "closed") {
        rows = rows.filter((ticket) => ticket.status !== "Closed");
      }

      if (
        search.trim()
      ) {
        const needle =
          search
            .trim()
            .toLowerCase();

        rows =
          rows.filter(
            (
              ticket
            ) => {
              const haystack =
                [
                  ticket.subject,
                  ticket.ticket_number,
                  ticket.contact_name,
                  ticket.contact_email,
                  ticket.assignee_name,
                  ticket.assignee_email,
                  ticket.codewiz_agent_name,
                  ticket.codewiz_agent_email,
                  ticket.status,
                  ticket.source,
                  ticket.department,
                  ticket.description,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase();

              return haystack
                .includes(
                  needle
                );
            }
          );
      }

      return rows;
    }, [
      tickets,
      filter,
      brandFilter,
      departmentFilter,
      search,
      session,
      savedView,
      followedTickets,
      activeReminders,
      ageTick,
    ]);

  /*
    Keep selected ticket aligned with
    CURRENT filtered list.
  */
  useEffect(() => {
    if (dashboardTab) return;
    if (filteredTickets.length === 0) {
      setSelectedKey(
        null
      );

      return;
    }

    setSelectedKey(
      (
        current
      ) => {
        const stillVisible =
          current &&
          filteredTickets.some(
            (
              ticket
            ) =>
              ticket.ticket_key ===
              current
          );

        if (
          stillVisible
        ) {
          return current;
        }

        return (
          filteredTickets[0]
            ?.ticket_key ||
          null
        );
      }
    );
  }, [
    filteredTickets,
  ]);


  const dashboardMetrics = useMemo(() => {
    const visible = tickets.filter(isVisibleMarketingTicket);
    const active = visible.filter(t => t.status !== "Closed");
    const userEmail = session?.user?.email?.toLowerCase();
    const mine = active.filter(t => String(getTicketOwnerEmail(t) || "").toLowerCase() === userEmail);
    return {
      active: active.length,
      mine: mine.length,
      needs: active.filter(isNeedsAttentionTicket).length,
      overdue: active.filter(isOverdue).length,
      unassigned: active.filter(t => isTicketUnassigned(t)).length,
      aging: active.filter(t => ticketAgeDays(t) >= 3).length,
      waiting: active.filter(t => t.status === "Waiting" && ticketAgeDays(t) >= 2).length,
      high: active.filter(t => String(t.priority || "").toLowerCase() === "high").length,
      today: active.filter(t => {
        if (!t.due_date) return false;
        const d = new Date(t.due_date), n = new Date();
        return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
      }).length,
      brands: ["Qualicare", "Tutor Doctor", "Code Wiz"].map(source => ({ source, count: active.filter(t => t.source === source).length })),
      statuses: ["Open", "In Progress", "On Hold", "Waiting", "Escalated"].map(status => ({ status, count: active.filter(t => t.status === status).length })),
      agingBuckets: [
        ["0–1d", 0, 1], ["1–3d", 1, 3], ["3–5d", 3, 5], ["5–7d", 5, 7], ["7d+", 7, Infinity],
      ].map(([label, min, max]) => ({ label, count: active.filter(t => { const d=ticketAgeDays(t); return d >= min && d < max; }).length })),
      recent: [...active].sort((a,b) => new Date(b.updated_at_zoho || b.created_at_zoho || 0) - new Date(a.updated_at_zoho || a.created_at_zoho || 0)).slice(0, 8),
    };
  }, [tickets, session, ageTick]);

  function openDashboardQueue(target, options = {}) {
    setDashboardTab(false);
    setSelectedKey(null);
    setSearch("");
    setSavedView("all");
    if (!options.preserveBrand) {
      setBrandFilter("all");
      setDepartmentFilter("all");
    }
    if (target === "needs") { setSavedView("needs"); setFilter("all"); }
    else if (target === "aging") { setSavedView("aging"); setFilter("all"); }
    else if (target === "followed") { setSavedView("followed"); setFilter("all"); }
    else if (target === "reminders") { setSavedView("reminders"); setFilter("all"); }
    else if (target === "today") { setSavedView("today"); setFilter("all"); }
    else if (["age_0_1", "age_1_3", "age_3_5", "age_5_7", "age_7_plus"].includes(target)) { setSavedView(target); setFilter("all"); }
    else setFilter(target);
  }

  // ====================================================
  // COUNTS
  // ====================================================

  const counts =
    useMemo(() => {
      const userEmail =
        session
          ?.user
          ?.email
          ?.toLowerCase();

      const visibleTickets =
        tickets.filter(
          isVisibleMarketingTicket
        );

      let countTickets =
        brandFilter ===
        "all"
          ? visibleTickets
          : visibleTickets.filter(
              (
                ticket
              ) =>
                ticket.source ===
                brandFilter
            );

      if (
        brandFilter ===
          "Tutor Doctor" &&
        departmentFilter !==
          "all"
      ) {
        countTickets =
          countTickets.filter(
            (
              ticket
            ) =>
              String(
                ticket.department ||
                  ""
              ).trim() ===
              departmentFilter
          );
      }

      return {
        active:
          countTickets.filter(
            (
              ticket
            ) =>
              ticket.status !==
              "Closed"
          ).length,

        mine:
          countTickets.filter(
            (
              ticket
            ) =>
              ticket.status !==
                "Closed" &&
              String(
                getTicketOwnerEmail(
                  ticket
                ) ||
                  ""
              ).toLowerCase() ===
                userEmail
          ).length,

        open:
          countTickets.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "Open"
          ).length,

        inprogress:
          countTickets.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "In Progress"
          ).length,

        onhold:
          countTickets.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "On Hold"
          ).length,

        waiting:
          countTickets.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "Waiting"
          ).length,

        escalated:
          countTickets.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "Escalated"
          ).length,

        closed:
          countTickets.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "Closed"
          ).length,

        overdue:
          countTickets.filter(
            isOverdue
          ).length,

        unassigned:
          countTickets.filter(
            (
              ticket
            ) =>
              isTicketUnassigned(
                ticket
              ) &&
              ticket.status !==
                "Closed"
          ).length,
      };
    }, [
      tickets,
      session,
      brandFilter,
      departmentFilter,
    ]);

  async function signOut() {
    await supabase
      .auth
      .signOut();
  }

  if (
    authLoading
  ) {
    return (
      <div className="full-page-loading">
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <Login
        onSignedIn={
          setSession
        }
      />
    );
  }

  const availableStatuses =
    BRAND_STATUSES[
      selected?.source
    ] || [
      "Open",
      "On Hold",
      "Closed",
    ];

  // ====================================================
  // RENDER TIMELINE ITEM
  // ====================================================

  function renderEmailItem(
    thread
  ) {
    const outbound =
      isOutboundThread(
        thread
      );

    const attachments =
      Array.isArray(
        thread.attachments
      )
        ? thread.attachments
        : [];

    return (
      <article
        className={`timeline-item email-timeline-item thread-message ${
          outbound
            ? "outbound"
            : "inbound"
        }`}
      >
        <div className="timeline-rail-node email-node">
          ✉
        </div>

        <div className="message-header">

          <div className="message-author-area">

            <div
              className={`message-avatar ${
                outbound
                  ? "team-avatar"
                  : "customer-avatar"
              }`}
            >
              {(
                thread.author_name ||
                thread.author_email ||
                "?"
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <div className="message-author">
                {thread.author_name ||
                  thread.author_email ||
                  (outbound
                    ? "Team"
                    : "Requester")}
              </div>

              <div className="message-direction">
                {outbound
                  ? "Team email"
                  : "Customer email"}
              </div>
            </div>
          </div>

          <div className="message-header-right">

            <span className="message-time">
              {formatDateTime(
                thread.created_at_zoho
              )}
            </span>

            <div className="thread-actions">

              <button
                type="button"
                onClick={() =>
                  configureComposer(
                    "reply",
                    thread
                  )
                }
              >
                ↩ Reply
              </button>

              <button
                type="button"
                onClick={() =>
                  configureComposer(
                    "reply_all",
                    thread
                  )
                }
              >
                Reply all
              </button>

              <button
                type="button"
                onClick={() =>
                  configureComposer(
                    "forward",
                    thread
                  )
                }
              >
                Forward
              </button>
            </div>
          </div>
        </div>

        {hasRecipientInfo(
          thread
        ) && (
          <div className="message-recipient-box">

            <RecipientLine
              label="From"
              value={
                thread.from_email ||
                thread.author_email
              }
            />

            <RecipientLine
              label="To"
              value={
                thread.to_email
              }
            />

            <RecipientLine
              label="Cc"
              value={
                thread.cc
              }
            />

            <RecipientLine
              label="Bcc"
              value={
                thread.bcc
              }
            />
          </div>
        )}

        {thread.content_html ? (
          <div
            className="message-body"
            dangerouslySetInnerHTML={{
              __html:
                thread.content_html,
            }}
          />
        ) : (
          <div className="message-body text-message">
            {thread.content_text ||
              thread.summary ||
              ""}
          </div>
        )}

        {attachments.length >
          0 && (
          <div className="existing-attachments">

            {attachments.map(
              (
                attachment,
                index
              ) => (
                <div
                  className="existing-attachment"
                  key={
                    attachment.id ||
                    `${attachment.name}-${index}`
                  }
                >
                  <span>
                    📎
                  </span>

                  <span>
                    {attachment.name ||
                      "Attachment"}
                  </span>

                  {attachment.size && (
                    <small>
                      {formatFileSize(
                        attachment.size
                      )}
                    </small>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </article>
    );
  }

  function renderCommentItem(
    comment
  ) {
    const mentions =
      normalizeMentionList(
        comment.mentions
      );

    const attachments =
      Array.isArray(
        comment.attachments
      )
        ? comment.attachments
        : [];

    return (
      <article
        className={`timeline-item comment-timeline-item ${
          comment.is_public
            ? "public"
            : "private"
        }`}
      >
        <div
          className={`timeline-rail-node comment-node ${
            comment.is_public
              ? "public"
              : "private"
          }`}
        >
          {comment.is_public
            ? "◉"
            : "🔒"}
        </div>

        <div className="comment-header">

          <div className="comment-author-area">

            <div className="comment-avatar">
              {(
                comment.commenter_name ||
                comment.commenter_email ||
                "?"
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <div className="comment-author">
                {comment.commenter_name ||
                  comment.commenter_email ||
                  "Zoho user"}
              </div>

              <div className="comment-meta">

                <span
                  className={`comment-badge ${
                    comment.is_public
                      ? "public"
                      : "private"
                  }`}
                >
                  {comment.is_public
                    ? "Public comment"
                    : "Private comment"}
                </span>

                <span>
                  {formatDateTime(
                    comment.commented_at_zoho
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {comment.content_html ? (
          <div
            className="comment-body"
            dangerouslySetInnerHTML={{
              __html:
                comment.content_html,
            }}
          />
        ) : (
          <div className="comment-body">
            {comment.content_text ||
              ""}
          </div>
        )}

        {mentions.length >
          0 && (
          <div className="timeline-mention-list">

            {mentions.map(
              (
                mention,
                index
              ) => {
                const label =
                  mention.name ||
                  mention.displayName ||
                  mention.email ||
                  mention.emailId ||
                  "Mentioned agent";

                return (
                  <span
                    key={
                      mention.id ||
                      mention.zuid ||
                      `${label}-${index}`
                    }
                  >
                    @
                    {label}
                  </span>
                );
              }
            )}
          </div>
        )}

        {attachments.length >
          0 && (
          <div className="comment-attachments">

            {attachments.map(
              (
                attachment,
                index
              ) => (
                <span
                  key={
                    attachment.id ||
                    index
                  }
                >
                  📎{" "}
                  {attachment.name ||
                    "Attachment"}
                </span>
              )
            )}
          </div>
        )}
      </article>
    );
  }

  // ====================================================
  // UI
  // ====================================================

  return (
    <div className="app-shell">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="sidebar-header">

          <div className="app-mark">
            <span className="app-mark-icon">
              ▲
            </span>

            <span className="app-mark-text">
              CSG
            </span>
          </div>

          <div className="app-name-wrap">

            <div className="app-title">
              Ticket Hub
            </div>

            <div className="app-subtitle">
              Marketing Operations
            </div>
          </div>
        </div>

        <div className="sidebar-top-actions">
          <button className={`dashboard-nav-button ${dashboardTab ? "active" : ""}`} onClick={() => { setDashboardTab(true); setSelectedKey(null); }}>
            <span>▦</span><strong>Dashboard</strong><span className="shortcut-hint">⌘K</span>
          </button>
        </div>

        <div className="sidebar-section">

          <div className="sidebar-label">
            MY WORK
          </div>

          <button
            className={`nav-item ${
              showNotifications
                ? "active"
                : ""
            }`}
            onClick={() =>
              setShowNotifications(
                (
                  current
                ) =>
                  !current
              )
            }
          >
            <span>
              Mentions
            </span>

            <span className="nav-count">
              {
                unreadNotificationCount
              }
            </span>
          </button>

          {[
            [
              "mine",
              "My Tickets",
              counts.mine,
            ],
            [
              "all",
              "Active Tickets",
              counts.active,
            ],
            [
              "unassigned",
              "Unassigned",
              counts.unassigned,
            ],
            [
              "overdue",
              "Overdue",
              counts.overdue,
            ],
          ].map(
            (
              [
                id,
                label,
                count,
              ]
            ) => (
              <button
                key={id}
                className={`nav-item ${
                  filter === id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  openDashboardQueue(id)
                }
              >
                <span>
                  {label}
                </span>

                <span className="nav-count">
                  {count}
                </span>
              </button>
            )
          )}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">TODAY</div>
          <button className={`nav-item ${savedView === "today" ? "active" : ""}`} onClick={() => { setDashboardTab(false); setSelectedKey(null); setSavedView("today"); setFilter("all"); }}><span>Due today</span><span className="nav-count">{dashboardMetrics.today}</span></button>
          <button className={`nav-item ${savedView === "needs" ? "active" : ""}`} onClick={() => { setDashboardTab(false); setSelectedKey(null); setSavedView("needs"); setFilter("all"); }}><span>Needs attention</span><span className="nav-count">{dashboardMetrics.needs}</span></button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">SAVED VIEWS</div>
          <button className={`nav-item ${savedView === "followed" ? "active" : ""}`} onClick={() => { setDashboardTab(false); setSelectedKey(null); setSavedView("followed"); setFilter("all"); }}><span>Following</span><span className="nav-count">{followedTickets.length}</span></button>
          <button className={`nav-item ${savedView === "reminders" ? "active" : ""}`} onClick={() => { setDashboardTab(false); setSelectedKey(null); setSavedView("reminders"); setFilter("all"); }}><span>My reminders</span><span className="nav-count">{activeReminders.length}</span></button>
          <button className={`nav-item ${savedView === "aging" ? "active" : ""}`} onClick={() => { setDashboardTab(false); setSelectedKey(null); setSavedView("aging"); setFilter("all"); }}><span>Aging 3+ days</span><span className="nav-count">{dashboardMetrics.aging}</span></button>
        </div>

        <div className="sidebar-section">

          <div className="sidebar-label">
            STATUS
          </div>

          {[
            [
              "open",
              "Open",
              counts.open,
            ],
            [
              "inprogress",
              "In Progress",
              counts.inprogress,
            ],
            [
              "onhold",
              "On Hold",
              counts.onhold,
            ],
            [
              "waiting",
              "Waiting",
              counts.waiting,
            ],
            [
              "escalated",
              "Escalated",
              counts.escalated,
            ],
            [
              "closed",
              "Closed Tickets",
              counts.closed,
            ],
          ].map(
            (
              [
                id,
                label,
                count,
              ]
            ) => (
              <button
                key={id}
                className={`nav-item ${
                  id ===
                  "closed"
                    ? "closed-nav"
                    : ""
                } ${
                  filter === id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  openDashboardQueue(id)
                }
              >
                <span>
                  {label}
                </span>

                <span className="nav-count">
                  {count}
                </span>
              </button>
            )
          )}
        </div>

        <div className="sidebar-section">

          <div className="sidebar-label">
            BRANDS
          </div>

          {[
            [
              "all",
              "All brands",
            ],
            [
              "Qualicare",
              "Qualicare",
            ],
            [
              "Tutor Doctor",
              "Tutor Doctor",
            ],
            [
              "Code Wiz",
              "Code Wiz",
            ],
          ].map(
            (
              [
                value,
                label,
              ]
            ) => (
              <button
                key={value}
                className={`brand-nav brand-nav-${brandSlug(
                  value
                )} ${
                  brandFilter ===
                  value
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setBrandFilter(
                    value
                  );

                  if (
                    value !==
                    "Tutor Doctor"
                  ) {
                    setDepartmentFilter(
                      "all"
                    );
                  }

                  setSearch(
                    ""
                  );
                }}
              >
                <span
                  className={`brand-dot brand-dot-${brandSlug(
                    value
                  )}`}
                />

                <span>
                  {label}
                </span>
              </button>
            )
          )}
        </div>

        {brandFilter ===
          "Tutor Doctor" && (
          <div className="sidebar-section">

            <div className="sidebar-label">
              TUTOR DOCTOR DEPARTMENT
            </div>

            {[
              [
                "all",
                "All Departments",
              ],
              ...TUTOR_DOCTOR_DEPARTMENTS.map(
                (
                  department
                ) => [
                  department.value,
                  department.label,
                ]
              ),
            ].map(
              (
                [
                  value,
                  label,
                ]
              ) => (
                <button
                  key={
                    value
                  }
                  className={`nav-item ${
                    departmentFilter ===
                    value
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setDepartmentFilter(
                      value
                    );

                    setSearch(
                      ""
                    );
                  }}
                >
                  <span>
                    {label}
                  </span>
                </button>
              )
            )}
          </div>
        )}

        <div className="sidebar-footer">

          <div className="user-avatar">
            {session.user
              ?.email
              ?.charAt(0)
              ?.toUpperCase() ||
              "U"}
          </div>

          <div className="sidebar-user-info">

            <div className="user-email">
              {
                session.user
                  ?.email
              }
            </div>

            <button
              className="sign-out-button"
              onClick={
                signOut
              }
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {showNotifications && (
        <div
          style={{
            position:
              "fixed",
            left:
              "248px",
            top:
              "16px",
            width:
              "380px",
            maxHeight:
              "calc(100vh - 32px)",
            overflowY:
              "auto",
            background:
              "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius:
              "14px",
            boxShadow:
              "0 18px 45px rgba(15, 23, 42, 0.18)",
            zIndex:
              1000,
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap:
                "12px",
              padding:
                "16px",
              borderBottom:
                "1px solid #e5e7eb",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight:
                    700,
                  fontSize:
                    "16px",
                }}
              >
                Mentions
              </div>

              <div
                style={{
                  fontSize:
                    "12px",
                  color:
                    "#6b7280",
                  marginTop:
                    "2px",
                }}
              >
                {
                  unreadNotificationCount
                } unread
              </div>
            </div>

            <div
              style={{
                display:
                  "flex",
                gap:
                  "8px",
              }}
            >
              {unreadNotificationCount >
                0 && (
                <button
                  type="button"
                  onClick={
                    markAllNotificationsRead
                  }
                  style={{
                    border:
                      "0",
                    background:
                      "transparent",
                    fontSize:
                      "12px",
                    cursor:
                      "pointer",
                    color:
                      "#475569",
                  }}
                >
                  Mark all read
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setShowNotifications(
                    false
                  )
                }
                style={{
                  border:
                    "0",
                  background:
                    "transparent",
                  fontSize:
                    "20px",
                  lineHeight:
                    1,
                  cursor:
                    "pointer",
                  color:
                    "#64748b",
                }}
                aria-label="Close notifications"
              >
                ×
              </button>
            </div>
          </div>

          {loadingNotifications ? (
            <div
              style={{
                padding:
                  "20px",
                color:
                  "#64748b",
                fontSize:
                  "13px",
              }}
            >
              Loading mentions…
            </div>
          ) : notifications.length ===
            0 ? (
            <div
              style={{
                padding:
                  "24px 18px",
                color:
                  "#64748b",
                fontSize:
                  "13px",
              }}
            >
              No mentions yet.
            </div>
          ) : (
            notifications.map(
              (
                notification
              ) => (
                <button
                  key={
                    notification.id
                  }
                  type="button"
                  onClick={() =>
                    openNotification(
                      notification
                    )
                  }
                  style={{
                    display:
                      "block",
                    width:
                      "100%",
                    textAlign:
                      "left",
                    border:
                      "0",
                    borderBottom:
                      "1px solid #f1f5f9",
                    background:
                      notification.is_read
                        ? "#ffffff"
                        : "#f8fafc",
                    padding:
                      "14px 16px",
                    cursor:
                      "pointer",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      gap:
                        "10px",
                    }}
                  >
                    <strong
                      style={{
                        fontSize:
                          "13px",
                        color:
                          "#0f172a",
                      }}
                    >
                      {notification.source}
                      {notification.ticket_number
                        ? ` #${notification.ticket_number}`
                        : ""}
                    </strong>

                    {!notification.is_read && (
                      <span
                        style={{
                          width:
                            "8px",
                          height:
                            "8px",
                          borderRadius:
                            "999px",
                          background:
                            "#2563eb",
                          flex:
                            "0 0 auto",
                        }}
                      />
                    )}
                  </div>

                  <div
                    style={{
                      fontSize:
                        "13px",
                      fontWeight:
                        600,
                      color:
                        "#334155",
                      marginTop:
                        "6px",
                    }}
                  >
                    {
                      notification.subject ||
                      "Ticket mention"
                    }
                  </div>

                  <div
                    style={{
                      fontSize:
                        "12px",
                      color:
                        "#475569",
                      marginTop:
                        "6px",
                      lineHeight:
                        1.45,
                    }}
                  >
                    {notification.actor_name ||
                      notification.actor_email ||
                      "A teammate"}{" "}
                    mentioned you
                  </div>

                  {notification.comment_text && (
                    <div
                      style={{
                        fontSize:
                          "12px",
                        color:
                          "#64748b",
                        marginTop:
                          "5px",
                        lineHeight:
                          1.45,
                        display:
                          "-webkit-box",
                        WebkitLineClamp:
                          2,
                        WebkitBoxOrient:
                          "vertical",
                        overflow:
                          "hidden",
                      }}
                    >
                      {
                        notification.comment_text
                      }
                    </div>
                  )}

                  <div
                    style={{
                      fontSize:
                        "11px",
                      color:
                        "#94a3b8",
                      marginTop:
                        "8px",
                    }}
                  >
                    {notification.created_at
                      ? new Date(
                          notification.created_at
                        ).toLocaleString()
                      : ""}
                  </div>
                </button>
              )
            )
          )}
        </div>
      )}

      {/* TICKETS */}

      <section className="ticket-column">

        <div className="ticket-column-header">

          <div>
            <h1>
              {brandFilter ===
              "all"
                ? "Tickets"
                : brandFilter ===
                    "Tutor Doctor" &&
                  departmentFilter !==
                    "all"
                  ? `Tutor Doctor · ${
                      TUTOR_DOCTOR_DEPARTMENTS.find(
                        (department) =>
                          department.value ===
                          departmentFilter
                      )?.label ||
                      departmentFilter
                    }`
                  : brandFilter}
            </h1>

            <p>
              {filteredTickets.length} ticket
              {filteredTickets.length === 1 ? "" : "s"} in this view
            </p>
          </div>

          <div className="ticket-view-switcher" role="group" aria-label="Ticket list view">
            <span className="ticket-view-label">View</span>
            <button
              type="button"
              className={ticketListView === "classic" ? "active" : ""}
              onClick={() => setTicketListView("classic")}
              aria-pressed={ticketListView === "classic"}
            >
              Classic
            </button>
            <button
              type="button"
              className={ticketListView === "compact" ? "active" : ""}
              onClick={() => setTicketListView("compact")}
              aria-pressed={ticketListView === "compact"}
            >
              Compact
            </button>
          </div>
        </div>

        <div className="search-wrap">

          <input
            className="search-input"
            type="search"
            placeholder="Search tickets…"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <div className={`ticket-list ticket-list-${ticketListView}`}>

          {loadingTickets &&
            tickets.length === 0 && (
              <div className="empty-state">
                Loading tickets…
              </div>
            )}

          {!loadingTickets &&
            filteredTickets.length === 0 && (
              <div className="empty-state">
                No tickets match this view.
              </div>
            )}

          {filteredTickets.map((ticket) => {
            if (ticketListView === "compact") {
              return (
                <button
                  key={ticket.ticket_key}
                  type="button"
                  className={`ticket-row ticket-row-compact ${brandClass(
                    ticket.source
                  )} ${selectedKey === ticket.ticket_key ? "selected" : ""}`}
                  onClick={() => setSelectedKey(ticket.ticket_key)}
                >
                  <span className="compact-ticket-icon" aria-hidden="true">
                    ✉
                  </span>

                  <span className="compact-ticket-main">
                    <span className="compact-ticket-subject">
                      {ticket.subject || "Untitled ticket"}
                    </span>
                    <span className="compact-ticket-meta">
                      <BrandBadge source={ticket.source} compact />
                      <span className="ticket-number">#{ticket.ticket_number}</span>
                      <span className="compact-meta-separator">·</span>
                      <span>{ticket.contact_name || ticket.contact_email || "Unknown requester"}</span>
                      <span className="compact-meta-separator">·</span>
                      <span>{lastActivityLabel([], [], ticket)}</span>
                    </span>
                  </span>

                  <span className="compact-ticket-summary">
                    {getTicketSummary(ticket) || "No preview available"}
                  </span>

                  <span className="compact-ticket-status">
                    <StatusBadge status={ticket.status} />
                  </span>

                  <span className="compact-ticket-owner">
                    {getTicketOwnerName(ticket) || "Unassigned"}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={ticket.ticket_key}
                type="button"
                className={`ticket-row ${brandClass(
                  ticket.source
                )} ${selectedKey === ticket.ticket_key ? "selected" : ""}`}
                onClick={() => setSelectedKey(ticket.ticket_key)}
              >
                <div className="ticket-row-top">
                  <BrandBadge source={ticket.source} />
                  <span className="ticket-number">#{ticket.ticket_number}</span>
                </div>

                <div className="ticket-subject">
                  {ticket.subject || "Untitled ticket"}
                </div>

                <div className="ticket-summary">
                  {getTicketSummary(ticket) || "No preview available"}
                </div>

                <div className="ticket-requester">
                  {ticket.contact_name || ticket.contact_email || "Unknown requester"}
                </div>

                <div className="ticket-row-bottom">
                  <StatusBadge status={ticket.status} />
                  <span className="ticket-assignee">
                    {getTicketOwnerName(ticket) || "Unassigned"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {dashboardTab ? (
        <main className="dashboard-workspace">
          <div className="dashboard-page">
            <div className="dashboard-page-header">
              <div><div className="dashboard-eyebrow">CSG · MARKETING OPERATIONS</div><h1>Good work starts with knowing what needs attention.</h1><p>Your operational view across Qualicare, Tutor Doctor and Code Wiz.</p></div>
              <div className="dashboard-header-actions"><button onClick={() => openDashboardQueue("mine")}>My tickets</button><button onClick={() => openDashboardQueue("needs")}>Needs attention</button></div>
            </div>
            <div className="dashboard-grid">
              {[
                ["Active tickets", dashboardMetrics.active, "Current workload", "all"],
                ["Needs attention", dashboardMetrics.needs, "Action required", "needs"],
                ["High priority", dashboardMetrics.high, "High-priority work", "high"],
                ["Overdue", dashboardMetrics.overdue, "Past due", "overdue"],
                ["Due today", dashboardMetrics.today, "Needs action today", "today"],
                ["Unassigned", dashboardMetrics.unassigned, "No owner", "unassigned"],
                ["Aging 3+ days", dashboardMetrics.aging, "Older workload", "aging"],
              ].map(([label,count,sub,target]) => <button key={label} className="dashboard-kpi" onClick={() => openDashboardQueue(target)}><span>{label}</span><strong>{count}</strong><small>{sub} →</small></button>)}
            </div>
            <div className="dashboard-columns">
              <section className="dashboard-panel dashboard-panel-wide"><div className="panel-heading"><div><h2>My work</h2><p>Queues that matter most to you.</p></div></div><div className="dashboard-list">
                {[["My tickets",dashboardMetrics.mine,"mine"],["Overdue",dashboardMetrics.overdue,"overdue"],["Due today",dashboardMetrics.today,"today"],["High priority",dashboardMetrics.high,"high"],["Following",followedTickets.length,"followed"],["My reminders",activeReminders.length,"reminders"]].map(([label,count,target]) => <button key={label} onClick={() => openDashboardQueue(target)}><span>{label}</span><strong>{count}</strong><em>View →</em></button>)}
              </div></section>
              <section className="dashboard-panel"><div className="panel-heading"><div><h2>Workload by brand</h2><p>Active tickets.</p></div></div>{dashboardMetrics.brands.map(item => <button className="dashboard-bar-row" key={item.source} onClick={() => { setBrandFilter(item.source); setDepartmentFilter("all"); openDashboardQueue("all", { preserveBrand: true }); }}><span>{item.source}</span><div><i style={{width:`${dashboardMetrics.active ? Math.max(3,(item.count/dashboardMetrics.active)*100) : 0}%`}} /></div><strong>{item.count}</strong></button>)}</section>
            </div>
            <div className="dashboard-columns">
              <section className="dashboard-panel"><div className="panel-heading"><div><h2>Queue health</h2><p>Current status mix.</p></div></div>{dashboardMetrics.statuses.map(item => <button className="dashboard-simple-row" key={item.status} onClick={() => openDashboardQueue(item.status === "In Progress" ? "inprogress" : item.status.toLowerCase().replace(" ",""))}><span>{item.status}</span><strong>{item.count}</strong></button>)}</section>
              <section className="dashboard-panel"><div className="panel-heading"><div><h2>Ticket age</h2><p>Where the backlog is accumulating.</p></div></div>{dashboardMetrics.agingBuckets.map(item => <button className="dashboard-simple-row" key={item.label} onClick={() => openDashboardQueue(({ "0–1d": "age_0_1", "1–3d": "age_1_3", "3–5d": "age_3_5", "5–7d": "age_5_7", "7d+": "age_7_plus" })[item.label] || "aging")}><span>{item.label}</span><strong>{item.count}</strong></button>)}</section>
            </div>
            <section className="dashboard-panel"><div className="panel-heading"><div><h2>Recently updated</h2><p>Jump straight back into active work.</p></div></div><div className="recent-grid">{dashboardMetrics.recent.map(ticket => <button key={ticket.ticket_key} onClick={() => { setDashboardTab(false); setSelectedKey(ticket.ticket_key); }}><div><BrandBadge source={ticket.source}/><strong>#{ticket.ticket_number}</strong></div><h3>{ticket.subject || "Untitled ticket"}</h3><p>{ticket.contact_name || "Unknown requester"} · {formatAge(ticket)} old</p><span>{needsAttentionReason(ticket) || ticket.status}</span></button>)}</div></section>
          </div>
        </main>
      ) : null}

      {!dashboardTab && (
      <>
      {/* WORKSPACE */}

      <main
        className={`conversation-column ${
          selected
            ? brandClass(
                selected.source
              )
            : ""
        }`}
      >

        {!selected ? (
          <div className="conversation-empty">

            <div className="conversation-empty-card">

              <div className="conversation-empty-icon">
                ✉
              </div>

              <h2>
                No ticket selected
              </h2>

              <p>
                Choose a ticket from the list.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* HEADER */}

            <header className="conversation-header">

              <div className="conversation-heading">

                <div className="conversation-meta">

                  <BrandBadge
                    source={
                      selected.source
                    }
                  />

                  <span className="header-ticket-number">
                    Ticket #
                    {
                      selected.ticket_number
                    }
                  </span>

                  <StatusBadge
                    status={
                      selected.status
                    }
                  />
                </div>

                <h2>
                  {selected.subject ||
                    "Untitled ticket"}
                </h2>

                <div className="conversation-requester">

                  <span className="requester-name">
                    {selected.contact_name ||
                      "Unknown requester"}
                  </span>

                  {selected.contact_email && (
                    <span>
                      {
                        selected.contact_email
                      }
                    </span>
                  )}
                </div>
              </div>

              <div className="ticket-header-insights">
                <span>Opened <strong>{formatAge(selected)}</strong></span>
                <span>Last activity <strong>{lastActivityLabel(threads, comments, selected)}</strong></span>
                {selected.due_date && <span>Due <strong>{formatDate(selected.due_date)}</strong></span>}
                <button type="button" onClick={() => toggleFollow(selected.ticket_key)}>{followedTickets.includes(selected.ticket_key) ? "★ Following" : "☆ Follow"}</button>
                <button type="button" onClick={() => setShowReminderMenu(v => !v)}>⏰ Remind</button>
                {showReminderMenu && <div className="reminder-menu"><button onClick={() => addReminder(selected,1)}>In 1 hour</button><button onClick={() => addReminder(selected,24)}>Tomorrow</button><button onClick={() => addReminder(selected,72)}>In 3 days</button><button onClick={() => addReminder(selected,168)}>Next week</button></div>}
              </div>
              {selected.ticket_url && (
                <a
                  className="zoho-link"
                  href={
                    selected.ticket_url
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Zoho
                  <span>
                    ↗
                  </span>
                </a>
              )}
            </header>

            {/* REPLY COMPOSER */}

            <div
              ref={
                composerRef
              }
              className="composer-area"
            >

              <div className="composer-area-heading">

                <div>
                  <div className="composer-heading-title">
                    Respond to ticket
                  </div>

                  <div className="composer-heading-subtitle">
                    Reply by email, reply to everyone or forward.
                  </div>
                </div>
              </div>

              <div className="rich-composer">

                <div className="composer-mode-row">

                  <div className="composer-dropdown-wrap">

                    <button
                      type="button"
                      className="composer-mode-button"
                      onClick={() =>
                        setShowReplyModeMenu(
                          (
                            current
                          ) =>
                            !current
                        )
                      }
                    >
                      <span className="composer-mode-icon">
                        {replyMode ===
                        "forward"
                          ? "↗"
                          : replyMode ===
                            "reply_all"
                          ? "↩↩"
                          : "↩"}
                      </span>

                      <span>
                        {replyMode ===
                        "reply"
                          ? "Reply"
                          : replyMode ===
                            "reply_all"
                          ? "Reply All"
                          : "Forward"}
                      </span>

                      <span className="dropdown-chevron">
                        ▾
                      </span>
                    </button>

                    {showReplyModeMenu && (
                      <div className="composer-dropdown-menu">

                        <button
                          type="button"
                          onClick={() =>
                            changeReplyMode(
                              "reply"
                            )
                          }
                        >
                          <strong>
                            Reply
                          </strong>

                          <span>
                            Reply to the requester
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            changeReplyMode(
                              "reply_all"
                            )
                          }
                        >
                          <strong>
                            Reply All
                          </strong>

                          <span>
                            Include the current email's CC recipients
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            changeReplyMode(
                              "forward"
                            )
                          }
                        >
                          <strong>
                            Forward
                          </strong>

                          <span>
                            Forward this conversation
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="composer-top-actions">

                    {!showCc && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowCc(
                            true
                          )
                        }
                      >
                        + Cc
                      </button>
                    )}

                    {!showBcc && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowBcc(
                            true
                          )
                        }
                      >
                        + Bcc
                      </button>
                    )}
                  </div>
                </div>

                <div className="recipient-section">

                  <div className="recipient-row">

                    <div className="recipient-label">
                      From
                    </div>

                    <div className="recipient-readonly">
                      {detectedFromEmail}
                    </div>
                  </div>

                  <div className="recipient-row">

                    <div className="recipient-label">
                      To
                    </div>

                    <input
                      type="text"
                      className="recipient-input"
                      value={
                        recipientTo
                      }
                      placeholder="Recipient"
                      disabled={
                        composerBusy
                      }
                      onChange={(
                        event
                      ) =>
                        setRecipientTo(
                          event
                            .target
                            .value
                        )
                      }
                    />
                  </div>

                  {showCc && (
                    <div className="recipient-row">

                      <div className="recipient-label">
                        Cc
                      </div>

                      <input
                        type="text"
                        className="recipient-input"
                        value={
                          recipientCc
                        }
                        placeholder="CC recipients…"
                        disabled={
                          composerBusy
                        }
                        onChange={(
                          event
                        ) =>
                          setRecipientCc(
                            event
                              .target
                              .value
                          )
                        }
                      />

                      <button
                        type="button"
                        className="recipient-remove"
                        onClick={() => {
                          setRecipientCc(
                            ""
                          );

                          setShowCc(
                            false
                          );
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {showBcc && (
                    <div className="recipient-row">

                      <div className="recipient-label">
                        Bcc
                      </div>

                      <input
                        type="text"
                        className="recipient-input"
                        value={
                          recipientBcc
                        }
                        placeholder="BCC recipients…"
                        disabled={
                          composerBusy
                        }
                        onChange={(
                          event
                        ) =>
                          setRecipientBcc(
                            event
                              .target
                              .value
                          )
                        }
                      />

                      <button
                        type="button"
                        className="recipient-remove"
                        onClick={() => {
                          setRecipientBcc(
                            ""
                          );

                          setShowBcc(
                            false
                          );
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                <div className="rich-toolbar">

                  <button
                    type="button"
                    onMouseDown={(
                      event
                    ) => {
                      event.preventDefault();

                      runEditorCommand(
                        "undo"
                      );
                    }}
                  >
                    ↶
                  </button>

                  <button
                    type="button"
                    onMouseDown={(
                      event
                    ) => {
                      event.preventDefault();

                      runEditorCommand(
                        "redo"
                      );
                    }}
                  >
                    ↷
                  </button>

                  <div className="toolbar-divider" />

                  <button
                    type="button"
                    className="toolbar-bold"
                    onMouseDown={(
                      event
                    ) => {
                      event.preventDefault();

                      runEditorCommand(
                        "bold"
                      );
                    }}
                  >
                    B
                  </button>

                  <button
                    type="button"
                    className="toolbar-italic"
                    onMouseDown={(
                      event
                    ) => {
                      event.preventDefault();

                      runEditorCommand(
                        "italic"
                      );
                    }}
                  >
                    I
                  </button>

                  <button
                    type="button"
                    className="toolbar-underline"
                    onMouseDown={(
                      event
                    ) => {
                      event.preventDefault();

                      runEditorCommand(
                        "underline"
                      );
                    }}
                  >
                    U
                  </button>

                  <button
                    type="button"
                    className="toolbar-strike"
                    onMouseDown={(
                      event
                    ) => {
                      event.preventDefault();

                      runEditorCommand(
                        "strikeThrough"
                      );
                    }}
                  >
                    S
                  </button>

                  <div className="toolbar-divider" />

                  <select
                    className="toolbar-select"
                    defaultValue="3"
                    onChange={(
                      event
                    ) =>
                      runEditorCommand(
                        "fontSize",
                        event
                          .target
                          .value
                      )
                    }
                  >
                    <option value="2">
                      Small
                    </option>

                    <option value="3">
                      Normal
                    </option>

                    <option value="4">
                      Large
                    </option>

                    <option value="5">
                      Larger
                    </option>
                  </select>

                  <button
                    type="button"
                    onMouseDown={(
                      event
                    ) => {
                      event.preventDefault();

                      runEditorCommand(
                        "insertUnorderedList"
                      );
                    }}
                  >
                    •≡
                  </button>

                  <button
                    type="button"
                    onMouseDown={(
                      event
                    ) => {
                      event.preventDefault();

                      runEditorCommand(
                        "insertOrderedList"
                      );
                    }}
                  >
                    1≡
                  </button>

                  <button
                    type="button"
                    onMouseDown={(
                      event
                    ) => {
                      event.preventDefault();

                      addLink();
                    }}
                  >
                    🔗
                  </button>

                  <button
                    type="button"
                    onMouseDown={(
                      event
                    ) => {
                      event.preventDefault();

                      runEditorCommand(
                        "removeFormat"
                      );
                    }}
                  >
                    Tx
                  </button>
                </div>

                <div
                  ref={
                    editorRef
                  }
                  className="rich-editor"
                  contentEditable={
                    !composerBusy
                  }
                  suppressContentEditableWarning
                  data-placeholder="Write your reply…"
                  onInput={(
                    event
                  ) =>
                    setEditorHtml(
                      event
                        .currentTarget
                        .innerHTML
                    )
                  }
                />

                {pendingFiles.length >
                  0 && (
                  <div className="pending-attachments">

                    {pendingFiles.map(
                      (
                        file,
                        index
                      ) => (
                        <div
                          className="pending-attachment"
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                        >
                          <span>
                            📎
                          </span>

                          <div className="pending-file-meta">

                            <div className="pending-file-name">
                              {
                                file.name
                              }
                            </div>

                            <div className="pending-file-size">
                              {formatFileSize(
                                file.size
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="pending-file-remove"
                            onClick={() =>
                              removePendingFile(
                                index
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}

                <div className="rich-composer-footer">

                  <div className="composer-footer-left">

                    <input
                      ref={
                        fileInputRef
                      }
                      type="file"
                      multiple
                      className="hidden-file-input"
                      onChange={(
                        event
                      ) => {
                        addFiles(
                          event
                            .target
                            .files
                        );

                        event.target.value =
                          "";
                      }}
                    />

                    <input
                      ref={
                        imageInputRef
                      }
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden-file-input"
                      onChange={(
                        event
                      ) => {
                        addFiles(
                          event
                            .target
                            .files
                        );

                        event.target.value =
                          "";
                      }}
                    />

                    <button
                      type="button"
                      className="composer-icon-button"
                      onClick={() =>
                        fileInputRef
                          .current
                          ?.click()
                      }
                    >
                      📎 Attach
                    </button>

                    <button
                      type="button"
                      className="composer-icon-button"
                      onClick={() =>
                        imageInputRef
                          .current
                          ?.click()
                      }
                    >
                      🖼 Image
                    </button>

                    <button
                      type="button"
                      className="close-ticket-button"
                      disabled={
                        composerBusy ||
                        selected.status ===
                          "Closed"
                      }
                      onClick={() =>
                        updateTicketField(
                          "status",
                          "Closed"
                        )
                      }
                    >
                      Close ticket
                    </button>

                    {(uploadProgress ||
                      composerNotice) && (
                      <div className="composer-status">
                        {uploadProgress ||
                          composerNotice}
                      </div>
                    )}
                  </div>

                  <div className="send-split">

                    <button
                      type="button"
                      className="send-main-button"
                      disabled={
                        composerBusy
                      }
                      onClick={() =>
                        sendMessage(
                          "send"
                        )
                      }
                    >
                      {composerBusy
                        ? "Sending…"
                        : "Send"}
                    </button>

                    <div className="send-menu-wrap">

                      <button
                        type="button"
                        className="send-menu-button"
                        disabled={
                          composerBusy
                        }
                        onClick={() =>
                          setShowSendMenu(
                            (
                              current
                            ) =>
                              !current
                          )
                        }
                      >
                        ▾
                      </button>

                      {showSendMenu && (
                        <div className="send-menu">

                          <button
                            type="button"
                            onClick={() =>
                              sendMessage(
                                "send"
                              )
                            }
                          >
                            <strong>
                              Send
                            </strong>

                            <span>
                              Keep current status
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              sendMessage(
                                "send_close"
                              )
                            }
                          >
                            <strong>
                              Send & Close
                            </strong>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              sendMessage(
                                "send_waiting"
                              )
                            }
                          >
                            <strong>
                              Send & Waiting
                            </strong>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              sendMessage(
                                "send_on_hold"
                              )
                            }
                          >
                            <strong>
                              Send & On Hold
                            </strong>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COMMENT COMPOSER */}

            <section className="comment-composer-section">

              <div className="comment-composer">

                <div className="comment-mode-row">

                  <div>
                    <strong>
                      Add comment
                    </strong>

                    <span>
                      Internal note or public comment · type @ to mention an agent
                    </span>
                  </div>

                  <div className="comment-visibility">

                    <button
                      type="button"
                      className={
                        !commentPublic
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setCommentPublic(
                          false
                        )
                      }
                    >
                      🔒 Private
                    </button>

                    <button
                      type="button"
                      className={
                        commentPublic
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setCommentPublic(
                          true
                        )
                      }
                    >
                      ◉ Public
                    </button>
                  </div>
                </div>

                <div className="comment-input-wrap">

                  <textarea
                    ref={
                      commentInputRef
                    }
                    value={
                      commentText
                    }
                    placeholder="Add a comment… Type @ to mention an agent or teammate."
                    onChange={(
                      event
                    ) =>
                      handleCommentChange(
                        event
                          .target
                          .value
                      )
                    }
                  />

                  {showMentionSuggestions &&
                    mentionSuggestions.length >
                      0 && (
                      <div className="mention-menu">

                        {mentionSuggestions.map(
                          (
                            agent
                          ) => (
                            <button
                              type="button"
                              key={
                                mentionIdentity(
                                  agent
                                )
                              }
                              onClick={() =>
                                selectMention(
                                  agent
                                )
                              }
                            >
                              <span className="mention-avatar">
                                {(
                                  agent.name ||
                                  agent.email ||
                                  "?"
                                )
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </span>

                              <span className="mention-copy">

                                <strong>
                                  {agent.name ||
                                    agent.email}
                                </strong>

                                {agent.email && (
                                  <small>
                                    {
                                      agent.email
                                    }
                                    {agent.mention_type ===
                                      "ticket_hub_user"
                                      ? " · Ticket Hub teammate"
                                      : ""}
                                  </small>
                                )}
                              </span>
                            </button>
                          )
                        )}
                      </div>
                    )}
                </div>

                {commentMentions.length >
                  0 && (
                  <div className="comment-mention-chips">

                    {commentMentions.map(
                      (
                        mention
                      ) => (
                        <span
                          key={
                            mentionIdentity(
                              mention
                            )
                          }
                        >
                          @
                          {
                            mention.name
                          }

                          <button
                            type="button"
                            onClick={() =>
                              setCommentMentions(
                                (
                                  current
                                ) =>
                                  current.filter(
                                    (
                                      item
                                    ) =>
                                      mentionIdentity(
                                        item
                                      ) !==
                                      mentionIdentity(
                                        mention
                                      )
                                  )
                              )
                            }
                          >
                            ×
                          </button>
                        </span>
                      )
                    )}
                  </div>
                )}

                {commentFiles.length >
                  0 && (
                  <div className="comment-files">

                    {commentFiles.map(
                      (
                        file,
                        index
                      ) => (
                        <div
                          key={`${file.name}-${index}`}
                        >
                          📎
                          <span>
                            {
                              file.name
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setCommentFiles(
                                (
                                  current
                                ) =>
                                  current.filter(
                                    (
                                      _,
                                      itemIndex
                                    ) =>
                                      itemIndex !==
                                      index
                                  )
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}

                <div className="comment-composer-footer">

                  <div className="comment-left-actions">

                    <input
                      ref={
                        commentFileInputRef
                      }
                      type="file"
                      multiple
                      className="hidden-file-input"
                      onChange={(
                        event
                      ) => {
                        addCommentFiles(
                          event
                            .target
                            .files
                        );

                        event.target.value =
                          "";
                      }}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        commentFileInputRef
                          .current
                          ?.click()
                      }
                    >
                      📎 Attach file
                    </button>

                    {commentNotice && (
                      <span className="comment-notice">
                        {
                          commentNotice
                        }
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="add-comment-button"
                    disabled={
                      commentBusy ||
                      !commentText.trim()
                    }
                    onClick={
                      submitComment
                    }
                  >
                    {commentBusy
                      ? "Adding…"
                      : "Add comment"}
                  </button>
                </div>
              </div>
            </section>

            {/* UNIFIED TIMELINE */}

            <section className="timeline-section">

              <div className="conversation-section-heading">

                <div>
                  <h3>
                    Ticket timeline
                  </h3>

                  <p>
                    Emails and comments in the exact order they happened
                  </p>
                </div>

                <div className="timeline-count-group">

                  <span>
                    {
                      threads.length
                    }{" "}
                    email
                    {threads.length ===
                    1
                      ? ""
                      : "s"}
                  </span>

                  <span>
                    {
                      comments.length
                    }{" "}
                    comment
                    {comments.length ===
                    1
                      ? ""
                      : "s"}
                  </span>
                </div>
              </div>

              {(loadingThreads ||
                loadingComments) && (
                <div className="loading-threads">
                  Loading timeline…
                </div>
              )}

              <div className="timeline">

                {timelineItems.map(
                  (
                    item
                  ) => (
                    <React.Fragment
                      key={
                        item.key
                      }
                    >
                      {item.type ===
                      "email"
                        ? renderEmailItem(
                            item.data
                          )
                        : renderCommentItem(
                            item.data
                          )}
                    </React.Fragment>
                  )
                )}

                {/* ORIGINAL REQUEST ALWAYS LAST */}

                {selected.description && (
                  <article className="timeline-item original-message">

                    <div className="timeline-rail-node original-node">
                      ★
                    </div>

                    <div className="original-request-label">
                      Original request
                    </div>

                    <div className="message-header">

                      <div className="message-author-area">

                        <div className="message-avatar customer-avatar">
                          {(
                            selected.contact_name ||
                            selected.contact_email ||
                            "?"
                          )
                            .charAt(
                              0
                            )
                            .toUpperCase()}
                        </div>

                        <div>
                          <div className="message-author">
                            {selected.contact_name ||
                              selected.contact_email ||
                              "Requester"}
                          </div>

                          <div className="message-direction">
                            Ticket created
                          </div>
                        </div>
                      </div>

                      <span className="message-time">
                        {formatDateTime(
                          selected.created_at_zoho
                        )}
                      </span>
                    </div>

                    {selected.contact_email && (
                      <div className="message-recipient-box">

                        <RecipientLine
                          label="From"
                          value={
                            selected.contact_email
                          }
                        />
                      </div>
                    )}

                    <div
                      className="message-body"
                      dangerouslySetInnerHTML={{
                        __html:
                          selected.description,
                      }}
                    />
                  </article>
                )}

                <div className="conversation-end">
                  Start of ticket
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* DETAILS */}

      <aside className="details-column">

        {!selected ? (
          <div className="details-empty">
            Ticket details
          </div>
        ) : (
          <>
            <div className="details-header">

              <div>
                <h3>
                  Ticket details
                </h3>

                <p>
                  Manage this ticket
                </p>
              </div>
            </div>

            <div className="details-content">

              <Detail label="Brand">
                <BrandBadge
                  source={
                    selected.source
                  }
                />
              </Detail>

              <Detail label="Status">

                <select
                  className="detail-control"
                  value={
                    selected.status ||
                    ""
                  }
                  disabled={
                    updateBusy
                  }
                  onChange={(
                    event
                  ) =>
                    updateTicketField(
                      "status",
                      event
                        .target
                        .value
                    )
                  }
                >
                  {selected.status &&
                    !availableStatuses.includes(
                      selected.status
                    ) && (
                      <option
                        value={
                          selected.status
                        }
                      >
                        {
                          selected.status
                        }
                      </option>
                    )}

                  {availableStatuses.map(
                    (
                      status
                    ) => (
                      <option
                        key={
                          status
                        }
                        value={
                          status
                        }
                      >
                        {
                          status
                        }
                      </option>
                    )
                  )}
                </select>
              </Detail>

              {selected.source ===
              "Code Wiz" ? (
                <>
                  <Detail label="Department">

                    {loadingAgents ? (
                      <div className="agent-loading">
                        Loading departments…
                      </div>
                    ) : (
                      <select
                        className="detail-control owner-select"
                        value={
                          selected.assignee_id ||
                          CODEWIZ_DEFAULT_DEPARTMENT.zoho_agent_id
                        }
                        disabled={
                          updateBusy
                        }
                        onChange={(
                          event
                        ) =>
                          updateTicketField(
                            "assigneeId",
                            event
                              .target
                              .value ||
                              null
                          )
                        }
                      >
                        {!agents.some(
                          (agent) =>
                            agent.zoho_agent_id ===
                            CODEWIZ_DEFAULT_DEPARTMENT.zoho_agent_id
                        ) && (
                          <option
                            value={
                              CODEWIZ_DEFAULT_DEPARTMENT.zoho_agent_id
                            }
                          >
                            {CODEWIZ_DEFAULT_DEPARTMENT.name}
                            {` — ${CODEWIZ_DEFAULT_DEPARTMENT.email}`}
                          </option>
                        )}

                        {selected.assignee_id &&
                          selected.assignee_id !==
                            CODEWIZ_DEFAULT_DEPARTMENT.zoho_agent_id &&
                          !agents.some(
                            (
                              agent
                            ) =>
                              agent.zoho_agent_id ===
                              selected.assignee_id
                          ) && (
                            <option
                              value={
                                selected.assignee_id
                              }
                            >
                              {selected.assignee_name ||
                                selected.assignee_email ||
                                "Current Zoho owner"}

                              {selected.assignee_email
                                ? ` — ${selected.assignee_email}`
                                : ""}
                            </option>
                          )}

                        {agents.map(
                          (
                            agent
                          ) => (
                            <option
                              key={
                                agent.zoho_agent_id
                              }
                              value={
                                agent.zoho_agent_id
                              }
                            >
                              {agent.name ||
                                agent.email ||
                                "Unnamed department"}

                              {agent.email
                                ? ` — ${agent.email}`
                                : ""}
                            </option>
                          )
                        )}
                      </select>
                    )}

                    <div className="owner-current-email">
                      {selected.assignee_email ||
                        CODEWIZ_DEFAULT_DEPARTMENT.email}
                    </div>
                  </Detail>

                  <Detail label="Ticket Owner">
                    <select
                      className="detail-control owner-select"
                      value={
                        selected.codewiz_agent_name ||
                        ""
                      }
                      disabled={
                        updateBusy
                      }
                      onChange={(
                        event
                      ) =>
                        updateTicketField(
                          "codewizAgentName",
                          event
                            .target
                            .value ||
                            null
                        )
                      }
                    >
                      <option value="">
                        Unassigned
                      </option>

                      {selected.codewiz_agent_name &&
                        !CODEWIZ_TICKET_OWNERS.some(
                          (
                            owner
                          ) =>
                            owner.name ===
                            selected.codewiz_agent_name
                        ) && (
                          <option
                            value={
                              selected.codewiz_agent_name
                            }
                          >
                            {
                              selected.codewiz_agent_name
                            }
                          </option>
                        )}

                      {CODEWIZ_TICKET_OWNERS.map(
                        (
                          owner
                        ) => (
                          <option
                            key={
                              owner.email
                            }
                            value={
                              owner.name
                            }
                          >
                            {owner.name}
                            {` — ${owner.email}`}
                          </option>
                        )
                      )}
                    </select>

                    {selected.codewiz_agent_email && (
                      <div className="owner-current-email">
                        {
                          selected.codewiz_agent_email
                        }
                      </div>
                    )}
                  </Detail>
                </>
              ) : (
                <Detail label="Ticket Owner">

                  {loadingAgents ? (
                    <div className="agent-loading">
                      Loading agents…
                    </div>
                  ) : (
                    <select
                      className="detail-control owner-select"
                      value={
                        selected.assignee_id ||
                        ""
                      }
                      disabled={
                        updateBusy
                      }
                      onChange={(
                        event
                      ) =>
                        updateTicketField(
                          "assigneeId",
                          event
                            .target
                            .value ||
                            null
                        )
                      }
                    >
                      <option value="">
                        Unassigned
                      </option>

                      {selected.assignee_id &&
                        !agents.some(
                          (
                            agent
                          ) =>
                            agent.zoho_agent_id ===
                            selected.assignee_id
                        ) && (
                          <option
                            value={
                              selected.assignee_id
                            }
                          >
                            {selected.assignee_name ||
                              selected.assignee_email ||
                              "Current Zoho owner"}
                          </option>
                        )}

                      {agents.map(
                        (
                          agent
                        ) => (
                          <option
                            key={
                              agent.zoho_agent_id
                            }
                            value={
                              agent.zoho_agent_id
                            }
                          >
                            {agent.name ||
                              agent.email ||
                              "Unnamed agent"}

                            {agent.email
                              ? ` — ${agent.email}`
                              : ""}
                          </option>
                        )
                      )}
                    </select>
                  )}

                  {selected.assignee_email && (
                    <div className="owner-current-email">
                      {
                        selected.assignee_email
                      }
                    </div>
                  )}
                </Detail>
              )}

              <Detail label="Tags">

                {loadingTags ? (
                  <div className="tag-loading">
                    Loading tags…
                  </div>
                ) : (
                  <>
                    <div className="tag-list">

                      {tags.length ===
                        0 && (
                        <div className="no-tags">
                          No tags yet
                        </div>
                      )}

                      {tags.map(
                        (
                          tag
                        ) => (
                          <div
                            key={
                              tag.zoho_tag_id
                            }
                            className="ticket-tag"
                          >
                            <span>
                              {
                                tag.name
                              }
                            </span>

                            <button
                              type="button"
                              className="tag-remove-button"
                              onClick={() =>
                                removeTag(
                                  tag
                                )
                              }
                            >
                              ×
                            </button>
                          </div>
                        )
                      )}
                    </div>

                    <form
                      className="tag-autocomplete"
                      onSubmit={
                        addTag
                      }
                    >
                      <div className="tag-input-wrap">

                        <input
                          className="tag-input"
                          value={
                            tagInput
                          }
                          placeholder="Add a tag…"
                          autoComplete="off"
                          onFocus={() =>
                            setShowTagSuggestions(
                              true
                            )
                          }
                          onChange={(
                            event
                          ) => {
                            setTagInput(
                              event
                                .target
                                .value
                            );

                            setShowTagSuggestions(
                              true
                            );
                          }}
                        />

                        {showTagSuggestions && (
                            <div
                              className="tag-suggestions"
                              style={{
                                maxHeight: "320px",
                                overflowY: "auto",
                              }}
                            >

                              {!tagInput.trim() &&
                                suggestedTags.length > 0 && (
                                  <div className="tag-suggestions-title">
                                    Existing tags ({suggestedTags.length})
                                  </div>
                                )}

                              {suggestedTags.map(
                                (
                                  tag
                                ) => (
                                  <button
                                    key={
                                      tag.zoho_tag_id
                                    }
                                    type="button"
                                    className="tag-suggestion"
                                    onClick={() =>
                                      addTagByName(
                                        tag.name
                                      )
                                    }
                                  >
                                    #
                                    {
                                      tag.name
                                    }
                                  </button>
                                )
                              )}

                              {tagInput.trim() &&
                                !exactTagMatch && (
                                <button
                                  type="button"
                                  className="tag-suggestion"
                                  onClick={() =>
                                    addTagByName(
                                      tagInput
                                    )
                                  }
                                >
                                  + Create “
                                  {
                                    tagInput.trim()
                                  }
                                  ”
                                </button>
                              )}
                            </div>
                          )}
                      </div>

                      <button
                        type="submit"
                        className="tag-add-button"
                      >
                        +
                      </button>
                    </form>

                    {tagNotice && (
                      <div className="tag-notice">
                        {
                          tagNotice
                        }
                      </div>
                    )}
                  </>
                )}
              </Detail>

              <Detail label="Tier">
                {loadingTierOptions ? (
                  <div className="agent-loading">
                    Loading tiers…
                  </div>
                ) : (
                  <>
                    <select
                      className="detail-control"
                      value={
                        selected.tier_level ||
                        ""
                      }
                      disabled={
                        updateBusy
                      }
                      onChange={(
                        event
                      ) =>
                        updateTicketField(
                          "tierLevel",
                          event.target.value ||
                            null
                        )
                      }
                    >
                      <option value="">
                        No tier
                      </option>

                      {tierOptions.map(
                        (tier) => (
                          <option
                            key={tier}
                            value={tier}
                          >
                            {tier}
                          </option>
                        )
                      )}
                    </select>

                    {tierMetadataNotice && (
                      <div className="owner-current-email">
                        {tierMetadataNotice}
                      </div>
                    )}
                  </>
                )}
              </Detail>

              <Detail label="Priority">

                <select
                  className="detail-control"
                  value={
                    selected.priority ||
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    updateTicketField(
                      "priority",
                      event
                        .target
                        .value ||
                        null
                    )
                  }
                >
                  <option value="">
                    No priority
                  </option>

                  <option value="Low">
                    Low
                  </option>

                  <option value="Medium">
                    Medium
                  </option>

                  <option value="High">
                    High
                  </option>
                </select>
              </Detail>

              <Detail label="Due date">

                <input
                  className="detail-control"
                  type="date"
                  value={dateInputValue(
                    selected.due_date
                  )}
                  onChange={(
                    event
                  ) =>
                    updateTicketField(
                      "dueDate",
                      event
                        .target
                        .value
                    )
                  }
                />
              </Detail>

              {(updateBusy ||
                updateNotice) && (
                <div className="update-notice">
                  {updateBusy
                    ? "Saving…"
                    : updateNotice}
                </div>
              )}

              <div className="details-divider" />

              {activeReminders.filter(item => item.ticket_key === selected.ticket_key).map(item => (
                <Detail label="Reminder" key={item.id}><div className="reminder-detail"><strong>{formatDateTime(item.due_at)}</strong><button type="button" onClick={() => dismissReminder(item.id)}>Dismiss</button></div></Detail>
              ))}

              <Detail label="Requester">

                <div className="requester-detail">

                  <strong>
                    {selected.contact_name ||
                      "—"}
                  </strong>

                  {selected.contact_email && (
                    <span>
                      {
                        selected.contact_email
                      }
                    </span>
                  )}
                </div>
              </Detail>

              <Detail label="Department">
                {selected.department ||
                  "—"}
              </Detail>

              <Detail label="Layout">
                {selected.layout_name ||
                  "—"}
              </Detail>

              <Detail label="Created">
                {formatDate(
                  selected.created_at_zoho
                )}
              </Detail>

              <Detail label="Last updated">
                {formatDate(
                  selected.updated_at_zoho
                )}
              </Detail>
            </div>
          </>
        )}
      </aside>
      </>
      )}
    </div>
      {showCommandPalette && (
        <div className="command-overlay" onMouseDown={() => setShowCommandPalette(false)}>
          <div className="command-palette" onMouseDown={e => e.stopPropagation()}>
            <div className="command-input-wrap"><span>⌘K</span><input autoFocus value={commandQuery} onChange={e => setCommandQuery(e.target.value)} placeholder="Search tickets, customers, emails, tags…" /></div>
            <div className="command-results">{tickets.filter(isVisibleMarketingTicket).filter(ticket => `${ticket.ticket_number} ${ticket.subject} ${ticket.contact_name} ${ticket.contact_email} ${ticket.ticket_key}`.toLowerCase().includes(commandQuery.toLowerCase())).slice(0,10).map(ticket => <button key={ticket.ticket_key} onClick={() => { setDashboardTab(false); setSelectedKey(ticket.ticket_key); setShowCommandPalette(false); }}><span>#{ticket.ticket_number}</span><strong>{ticket.subject || "Untitled ticket"}</strong><small>{ticket.contact_name || ""} · {ticket.source}</small></button>)}</div>
            {!commandQuery && <div className="command-hints"><span>Search tickets and customers</span><span>Esc to close</span></div>}
          </div>
        </div>
      )}
  );
}

ReactDOM
  .createRoot(
    document.getElementById(
      "root"
    )
  )
  .render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
