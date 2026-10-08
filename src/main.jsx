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

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY;

// Capture email-link intent before Supabase consumes and clears the URL hash.
const PASSWORD_SETUP_STORAGE_KEY = "csg-hub-password-setup";
function passwordSetupRequested(url) {
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.slice(1));
  const type = hash.get("type") || parsed.searchParams.get("type");
  return type === "recovery" || type === "invite" || parsed.searchParams.get("hub_auth") === "password-setup";
}
function rememberPasswordSetup(required) {
  try {
    if (required) sessionStorage.setItem(PASSWORD_SETUP_STORAGE_KEY, "1");
    else sessionStorage.removeItem(PASSWORD_SETUP_STORAGE_KEY);
  } catch {}
}
const INITIAL_PASSWORD_SETUP = (() => {
  if (passwordSetupRequested(window.location.href)) {
    rememberPasswordSetup(true);
    return true;
  }
  try { return sessionStorage.getItem(PASSWORD_SETUP_STORAGE_KEY) === "1"; }
  catch { return false; }
})();

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
  if (!ticket) return "";
  // Code Wiz's marketing assignment is separate from the Zoho owner.
  const email = String(ticket.source === "Code Wiz"
    ? ticket.codewiz_agent_email || ""
    : ticket.assignee_email || "").trim().toLowerCase();
  if (email) return email;
  // Some synced tickets only contain the owner's display name. Resolve only
  // an exact, unique full-name match in our configured team directory.
  const normalizeName = value => String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  const name = normalizeName(getTicketOwnerName(ticket));
  if (!name) return "";
  const matches = CODEWIZ_TICKET_OWNERS.filter(person => normalizeName(person.name) === name);
  return matches.length === 1 ? String(matches[0].email).trim().toLowerCase() : "";
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
}) {
  const brand = String(source || "").trim();
  const mark =
    brand === "Tutor Doctor"
      ? "TD"
      : brand === "Qualicare"
      ? "QC"
      : brand === "Code Wiz"
      ? "CW"
      : "?";

  const name =
    brand || "Unknown";

  return (
    <span
      className={`brand-badge ${brandClass(
        source
      )}`}
    >
      <span className="brand-mark" aria-hidden="true">
        {mark}
      </span>
      <span className="brand-name">
        {name}
      </span>
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

function emailDisplayDocument(html) {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  doc.querySelectorAll("script,iframe,object,embed,form,input,button,base,meta[http-equiv]").forEach(node=>node.remove());
  doc.querySelectorAll("*").forEach(node=>{
    for (const attr of [...node.attributes]) if (/^on/i.test(attr.name)) node.removeAttribute(attr.name);
  });
  doc.querySelectorAll("a").forEach(link=>{
    if (!/^(https?:\/\/|mailto:|tel:)/i.test(link.getAttribute("href") || "")) link.removeAttribute("href");
    link.setAttribute("target", "_blank"); link.setAttribute("rel", "noopener noreferrer");
  });
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${doc.head.innerHTML}<style>html,body{margin:0!important;padding:0!important;min-width:0!important;width:100%!important;height:auto!important;min-height:0!important;overflow-wrap:anywhere;font:14px/1.6 Arial,sans-serif;color:#334155;box-sizing:border-box}body{padding:12px 4px!important}img{max-width:100%!important;height:auto!important}table{max-width:100%!important}pre{white-space:pre-wrap}*{box-sizing:border-box}a{color:#2563eb}</style></head><body>${doc.body.innerHTML}</body></html>`;
}
function TicketEmailBody({html}) {
  const frame = useRef(null);
  const [height, setHeight] = useState(180);
  const source = useMemo(()=>emailDisplayDocument(html),[html]);
  useEffect(()=>{
    const iframe=frame.current;let observer;let active=true;
    function measure() {
      if (!active) return;
      const doc=iframe?.contentDocument;
      if(doc?.body) setHeight(Math.max(120,Math.ceil(doc.body.getBoundingClientRect().height)+8));
    }
    function loaded() {
      observer?.disconnect(); measure();
      const doc=iframe?.contentDocument;
      if(doc?.body && typeof ResizeObserver!=="undefined") { observer=new ResizeObserver(measure);observer.observe(doc.body); }
      doc?.querySelectorAll("img").forEach(img=>img.addEventListener("load",measure,{once:true}));
    }
    iframe?.addEventListener("load",loaded);
    loaded();
    return ()=>{active=false;observer?.disconnect();iframe?.removeEventListener("load",loaded);};
  },[source]);
  return <iframe ref={frame} className="hub-email-frame" title="Ticket email content" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" srcDoc={source} style={{height}} />;
}

const SIGNATURE_BRANDS = ["Tutor Doctor", "Qualicare", "Code Wiz"];
function sanitizeSignatureHtml(value) {
  const doc = new DOMParser().parseFromString(String(value || ""), "text/html");
  const allowed = new Set(["P","DIV","SPAN","BR","B","STRONG","I","EM","U","A","IMG","TABLE","TBODY","THEAD","TR","TD","TH","UL","OL","LI","HR"]);
  const styles = new Set(["color","background-color","font-family","font-size","font-weight","font-style","text-decoration","text-align","line-height","padding","padding-top","padding-bottom","padding-left","padding-right","margin","margin-top","margin-bottom","border","border-top","border-bottom","border-left","border-right","border-collapse","vertical-align","width","height","max-width"]);
  for (const element of [...doc.body.querySelectorAll("*")]) {
    if (["SCRIPT","STYLE","IFRAME","OBJECT","EMBED","SVG","MATH","FORM","INPUT","BUTTON","META","LINK"].includes(element.tagName)) { element.remove(); continue; }
    if (!allowed.has(element.tagName)) { element.replaceWith(...element.childNodes); continue; }
    for (const attr of [...element.attributes]) {
      const name = attr.name.toLowerCase();
      if (name === "style") {
        const safe = [...element.style].filter(key => styles.has(key)).map(key => [key, element.style.getPropertyValue(key)])
          .filter(([,val]) => !/url\s*\(|expression|javascript|@import/i.test(val));
        element.removeAttribute("style"); safe.forEach(([key,val]) => element.style.setProperty(key,val));
      } else if (name === "href" && element.tagName === "A") {
        if (!/^(https?:\/\/|mailto:|tel:)/i.test(attr.value.trim())) element.removeAttribute(attr.name);
      } else if (name === "src" && element.tagName === "IMG") {
        if (!/^https:\/\//i.test(attr.value.trim())) element.removeAttribute(attr.name);
      } else if (!["alt","title","width","height","colspan","rowspan","cellpadding","cellspacing","border"].includes(name)) element.removeAttribute(attr.name);
    }
    if (element.tagName === "IMG" && !element.hasAttribute("src")) element.remove();
  }
  return doc.body.innerHTML;
}
function withoutHubSignature(html) {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  doc.body.querySelectorAll("[data-hub-signature]").forEach(node => node.remove());
  return doc.body.innerHTML;
}
function MySignatures({session, signatures, ready, loadError, onSaved, onClose}) {
  const [brand, setBrand] = useState("Tutor Doctor");
  const [html, setHtml] = useState("");
  const [automatic, setAutomatic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const box = useRef(null);
  useEffect(() => {
    if (!ready || loadError) return;
    const saved = signatures[brand];
    const next = sanitizeSignatureHtml(saved?.html || "");
    setHtml(next); setAutomatic(saved?.automatic !== false);
    if (box.current) box.current.innerHTML = next;
  }, [brand, signatures, ready, loadError]);
  useEffect(() => {
    const key = event => { if (event.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", key); return () => document.removeEventListener("keydown", key);
  }, [busy, onClose]);
  async function save() {
    if (busy || !ready || loadError || !session?.user?.id) return;
    setBusy(true); setMessage("");
    const cleaned = sanitizeSignatureHtml(box.current?.innerHTML || "");
    try {
      if (cleaned.length > 50000) throw new Error("Signature is too large. Use hosted logo images instead of embedded images.");
      const {data:saved,error} = await supabase.from("hub_user_signatures").upsert({user_id:session.user.id, brand, html:cleaned, automatic, updated_at:new Date().toISOString()}, {onConflict:"user_id,brand"}).select("user_id,brand,html,automatic").single();
      if (error) throw error;
      if (saved?.user_id !== session.user.id || saved?.brand !== brand || saved?.html !== cleaned || saved?.automatic !== automatic) throw new Error("Signature save could not be verified. Please try again.");
      onSaved(brand, {html:saved.html, automatic:saved.automatic}); setHtml(saved.html);
      if (box.current) box.current.innerHTML = cleaned;
      setMessage("Signature saved to your account. It will be available after signing in again.");
    } catch (error) { setMessage(error.message || "Unable to save signature."); }
    finally { setBusy(false); }
  }
  function paste(event) {
    event.preventDefault();
    const raw = event.clipboardData.getData("text/html");
    const plain = event.clipboardData.getData("text/plain");
    if (raw) document.execCommand("insertHTML",false,sanitizeSignatureHtml(raw));
    else document.execCommand("insertText",false,plain);
    setHtml(sanitizeSignatureHtml(box.current.innerHTML));
  }
  return <div className="hub-signature-backdrop"><section className="hub-signature-modal" role="dialog" aria-modal="true" aria-labelledby="signature-title">
    <header><div><p className="hub-signature-eyebrow">PERSONAL SETTINGS</p><h2 id="signature-title">My Signatures</h2><p>Save your own email signature for each brand.</p></div><button type="button" disabled={busy} onClick={onClose} aria-label="Close signatures">✕</button></header>
    <div className="hub-signature-tabs">{SIGNATURE_BRANDS.map(name=><button type="button" disabled={busy||!ready||!!loadError} className={brand===name?"active":""} key={name} onClick={()=>{setMessage("");setBrand(name);}}>{name}</button>)}</div>
    {!ready&&<p role="status">Loading your saved signatures…</p>}
    {loadError&&<p role="alert">Signatures could not be loaded: {loadError}</p>}
    <p>Paste your existing signature below, including its formatting and logo. Images need a public HTTPS URL.</p>
    <div className="hub-signature-tools">{[["bold","Bold"],["italic","Italic"],["underline","Underline"]].map(([command,label])=><button type="button" disabled={busy||!ready||!!loadError} key={command} onMouseDown={event=>{event.preventDefault();box.current?.focus();document.execCommand(command);setHtml(sanitizeSignatureHtml(box.current.innerHTML));}}>{label}</button>)}
      <button type="button" disabled={busy||!ready||!!loadError} onClick={()=>{const url=window.prompt("Link URL (https://, mailto:, or tel:)");if(!url)return;box.current?.focus();document.execCommand("createLink",false,url);const clean=sanitizeSignatureHtml(box.current.innerHTML);box.current.innerHTML=clean;setHtml(clean);}}>Add link</button>
      <button type="button" disabled={busy||!ready||!!loadError} onClick={()=>{const url=window.prompt("Public HTTPS logo image URL");if(!url||!/^https:\/\//i.test(url.trim()))return;box.current?.focus();document.execCommand("insertImage",false,url.trim());setHtml(sanitizeSignatureHtml(box.current.innerHTML));}}>Add logo</button>
      <button type="button" disabled={busy||!ready||!!loadError} onClick={()=>{box.current.innerHTML="";setHtml("");}}>Clear</button>
    </div>
    <div ref={box} className="hub-signature-editor" contentEditable={!busy && ready && !loadError} suppressContentEditableWarning onPaste={paste} onInput={event=>setHtml(sanitizeSignatureHtml(event.currentTarget.innerHTML))} role="textbox" aria-label={`${brand} signature`} aria-multiline="true" />
    <label className="hub-signature-auto"><input type="checkbox" disabled={busy||!ready||!!loadError} checked={automatic} onChange={event=>setAutomatic(event.target.checked)} />Automatically add to new replies, Reply All and forwards for {brand}</label>
    <h3>Email preview</h3><div className="hub-signature-preview" dangerouslySetInnerHTML={{__html:sanitizeSignatureHtml(html)}} />
    <footer><span role="status">{message}</span><button type="button" className="primary-button" disabled={busy||!ready||!!loadError} onClick={save}>{busy?"Saving…":"Save signature"}</button></footer>
  </section></div>;
}

// ======================================================
// LOGIN
// ======================================================

function Login({
  onSignedIn,
  passwordSetupRequired = false,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState("signin");
  const recoveryMode = passwordSetupRequired;
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function signIn(event) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setMessage("Enter your work email and password.");
      return;
    }
    if (!isApprovedCompanyEmail(cleanEmail)) {
      setMessage("Please use an approved company email address.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) setMessage(error.message);
    else if (data?.session) onSignedIn(data.session);
    setBusy(false);
  }

  async function sendPasswordSetupEmail(event) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setMessage("Enter your work email first.");
      return;
    }
    if (!isApprovedCompanyEmail(cleanEmail)) {
      setMessage("Please use an approved company email address.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/?hub_auth=password-setup`,
    });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        mode === "first"
          ? "Check your email for a link to create your password."
          : "Check your email for a link to reset your password."
      );
    }
    setBusy(false);
  }

  async function updatePassword(event) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setMessage("Your password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data?.session) throw new Error("Your link has expired. Request a new password setup link.");
      onSignedIn(data.session);
    } catch (error) {
      setMessage(error.message || "Unable to save your password. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (recoveryMode) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo"><span className="login-logo-mountain">▲</span><span>CSG</span></div>
          <h1>Create your password</h1>
          <p>Set a password for your Marketing Ticket Hub account.</p>
          <form onSubmit={updatePassword}>
            <label>New password</label>
            <input type="password" placeholder="At least 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
            <label>Confirm password</label>
            <input type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            <button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving…" : "Create password"}</button>
            {message && <div className="login-message">{message}</div>}
          </form>
        </div>
      </div>
    );
  }

  const passwordHelpMode = mode === "first" || mode === "forgot";
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo"><span className="login-logo-mountain">▲</span><span>CSG</span></div>
        <h1>Marketing Ticket Hub</h1>
        <p>One workspace for Qualicare, Tutor Doctor and Code Wiz.</p>
        {passwordHelpMode ? (
          <form onSubmit={sendPasswordSetupEmail}>
            <label>Work email</label>
            <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
            <button type="submit" className="primary-button" disabled={busy}>{busy ? "Sending…" : mode === "first" ? "Send password setup link" : "Send reset link"}</button>
            <button type="button" className="login-secondary-button" onClick={() => { setMode("signin"); setMessage(""); }}>Back to sign in</button>
            {message && <div className="login-message">{message}</div>}
          </form>
        ) : (
          <form onSubmit={signIn}>
            <label>Work email</label>
            <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <label>Password</label>
            <input type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            <button type="submit" className="primary-button" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
            <div className="login-links">
              <button type="button" onClick={() => { setMode("first"); setMessage(""); }}>First time? Create your password</button>
              <button type="button" onClick={() => { setMode("forgot"); setMessage(""); }}>Forgot password?</button>
            </div>
            {message && <div className="login-message">{message}</div>}
          </form>
        )}
      </div>
    </div>
  );
}

const HUB_CLOSED = t => /^(closed|resolved)$/i.test(t.status || "");
const hubDate = v => v && Number.isFinite(new Date(v).getTime()) ? new Date(v) : null;
const hubSameDay = (a,b) => hubDate(a)?.toDateString() === hubDate(b)?.toDateString();
function hubLocalInput(v) { const d=hubDate(v); return d ? new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16) : ""; }
function hubUrgency(t, now=new Date()) {
  if(HUB_CLOSED(t)) return "Completed";
  const due=hubDate(t.due_date); if(!due) return "No deadline";
  const mins=Math.ceil(Math.abs(due-now)/60000), span=mins>=1440 ? `${Math.floor(mins/1440)}d ${Math.floor(mins%1440/60)}h` : `${Math.floor(mins/60)}h ${mins%60}m`;
  return due<now ? `Overdue by ${span}` : `Due ${hubSameDay(due,now) ? "today" : hubSameDay(due,new Date(+now+86400000)) ? "tomorrow" : `in ${span}`}`;
}
function hubAttention(t,now=new Date()) { const updated=hubDate(t.updated_at_zoho || t.created_at_zoho); return !HUB_CLOSED(t) && (hubDate(t.due_date)<now && !!hubDate(t.due_date) || String(t.priority).toLowerCase()==="high" && updated && now-updated>172800000); }
function HubOperations({page,tickets,session,onOpen,onDue}) {
  const [notice,setNotice]=useState(""), [busy,setBusy]=useState(false);
  const [brand,setBrand]=useState("all"), [owner,setOwner]=useState("all");
  const [date,setDate]=useState(hubLocalInput(new Date()).slice(0,10)), [mode,setMode]=useState("month");
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(id);},[]);
  const people=[...new Map(tickets.filter(t=>getTicketOwnerEmail(t)).map(t=>[getTicketOwnerEmail(t).toLowerCase(),{email:getTicketOwnerEmail(t).toLowerCase(),name:getTicketOwnerName(t)}])).values()];
  const scoped=tickets.filter(t=>(brand==="all" || t.source===brand) && (page==="My Week" || owner==="all" || String(getTicketOwnerEmail(t)).toLowerCase()===owner));
  const active=scoped.filter(t=>!HUB_CLOSED(t));
  const list=rows=>rows.length ? rows.map(t=><button type="button" className="hub-ticket" key={t.ticket_key} onClick={()=>onOpen(t)}><BrandBadge source={t.source}/><span>#{t.ticket_number} · {t.subject || "Untitled"}<small>{getTicketOwnerName(t)||"Unassigned"}</small></span><span className={hubAttention(t,now)?"hub-danger":""}>{hubUrgency(t,now)}</span></button>):<p className="hub-muted">No tickets in this group.</p>;
  const chosen=hubDate(`${date}T12:00:00`)||now;
  let start=new Date(chosen),days=1;
  if(mode==="month"){start=new Date(chosen.getFullYear(),chosen.getMonth(),1);start.setDate(start.getDate()-((start.getDay()+6)%7));days=42;}
  if(mode==="week"){start.setDate(start.getDate()-((start.getDay()+6)%7));days=7;}
  function move(delta){const next=new Date(chosen);if(mode==="month")next.setMonth(next.getMonth()+delta,1);else next.setDate(next.getDate()+delta*(mode==="week"?7:1));setDate(hubLocalInput(next).slice(0,10));}
  return <section className={`dashboard-view hub-operations ${page==="My Week"?"hub-week-page":""}`}>
    {page==="Calendar" && <div className="dashboard-header"><div><div className="dashboard-eyebrow">MARKETING OPERATIONS</div><h1>Calendar</h1><p>Your team's deadlines, in one place.</p></div></div>}
    {notice && <p role="status" className="hub-notice">{notice}</p>}
    {page==="Calendar" && <div className="hub-toolbar"><select aria-label="Brand" value={brand} onChange={e=>setBrand(e.target.value)}><option value="all">All brands</option>{[...new Set(tickets.map(t=>t.source))].map(b=><option key={b}>{b}</option>)}</select><select aria-label="Owner" value={owner} onChange={e=>setOwner(e.target.value)}><option value="all">All owners</option>{people.map(p=><option key={p.email} value={p.email}>{p.name||p.email}</option>)}</select></div>}
      {page==="Calendar" && <><div className="hub-toolbar"><button onClick={()=>move(-1)}>Previous</button><input aria-label="Calendar date" type="date" value={date} onChange={e=>setDate(e.target.value)}/><button onClick={()=>move(1)}>Next</button>{["month","week","day"].map(m=><button key={m} aria-pressed={mode===m} onClick={()=>setMode(m)}>{m}</button>)}<button onClick={()=>setDate(hubLocalInput(now).slice(0,10))}>Today</button></div><p className="hub-muted">Drag a ticket to reschedule its Zoho deadline; the existing local time is preserved. On touch devices, edit the deadline inside the ticket.</p><div className={`hub-calendar hub-calendar-${mode}`}>{Array.from({length:days},(_,i)=>{const day=new Date(start);day.setDate(start.getDate()+i);const rows=scoped.filter(t=>hubSameDay(t.due_date,day));return <div key={i} className={`hub-day ${hubSameDay(day,now)?"hub-today":""}`} onDragOver={e=>e.preventDefault()} onDrop={async e=>{e.preventDefault();const key=e.dataTransfer.getData("text/plain"),t=tickets.find(t=>t.ticket_key===key);if(!t||busy)return;setBusy(true);try{const d=hubDate(t.due_date)||new Date(day);d.setFullYear(day.getFullYear(),day.getMonth(),day.getDate());await onDue(t,d.toISOString());setNotice("Zoho deadline updated.");}catch(err){setNotice(err.message);}finally{setBusy(false);}}}><strong>{day.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}</strong>{rows.map(t=><button draggable={!busy} onDragStart={e=>e.dataTransfer.setData("text/plain",t.ticket_key)} className={`hub-calendar-ticket ${brandClass(t.source)}`} key={t.ticket_key} onClick={()=>onOpen(t)}>#{t.ticket_number} {t.subject}<small>{t.source} · {hubUrgency(t,now)}</small></button>)}</div>;})}</div><details><summary>No due date ({active.filter(t=>!hubDate(t.due_date)).length})</summary>{list(active.filter(t=>!hubDate(t.due_date)))}</details></>}

    {page==="My Week" && <MyWeekWorkspace tickets={tickets} session={session} now={now} onOpen={onOpen} />}
  </section>;
}
function MyWeekWorkspace({tickets,session,now,onOpen}) {
  const [brand,setBrand]=useState("all"),[focus,setFocus]=useState("all");
  const email=String(session?.user?.email||"").toLowerCase();
  const mine=tickets.filter(t=>String(getTicketOwnerEmail(t)||"").toLowerCase()===email && (brand==="all"||t.source===brand));
  const open=mine.filter(t=>!HUB_CLOSED(t));
  const weekStart=new Date(now);weekStart.setHours(0,0,0,0);weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));
  const weekEnd=new Date(weekStart);weekEnd.setDate(weekEnd.getDate()+7);
  const todayStart=new Date(now);todayStart.setHours(0,0,0,0);
  const tomorrow=new Date(todayStart);tomorrow.setDate(tomorrow.getDate()+1);
  const overdue=open.filter(t=>hubDate(t.due_date)&&hubDate(t.due_date)<now);
  const today=open.filter(t=>hubSameDay(t.due_date,now));
  const upcoming=open.filter(t=>hubDate(t.due_date)>=tomorrow&&hubDate(t.due_date)<weekEnd);
  const waiting=open.filter(t=>/waiting|hold/i.test(t.status));
  const completed=mine.filter(t=>HUB_CLOSED(t)&&hubDate(t.closed_at_zoho)>=weekStart&&hubDate(t.closed_at_zoho)<=now);
  const noDate=open.filter(t=>!hubDate(t.due_date));
  const groups=[{id:"overdue",title:"Needs attention",subtitle:"Past their deadline",rows:overdue,tone:"rose",icon:"clock",empty:"You're caught up. No overdue tickets."},{id:"today",title:"Today's focus",subtitle:"Your deadlines for today",rows:today,tone:"blue",icon:"week",empty:"No deadlines today. A little room to get ahead."},{id:"upcoming",title:"Coming up",subtitle:"Later this week",rows:upcoming,tone:"violet",icon:"calendar",empty:"No more deadlines scheduled this week."},{id:"waiting",title:"Waiting on others",subtitle:"Waiting or on hold",rows:waiting,tone:"amber",icon:"mention",empty:"No tickets waiting on someone else."},{id:"completed",title:"Completed this week",subtitle:"Your progress since Monday",rows:completed,tone:"green",icon:"tickets",empty:"Completed tickets with a closure date will appear here."},{id:"nodate",title:"Ready to plan",subtitle:"Active tickets without a deadline",rows:noDate,tone:"slate",icon:"views",empty:"Every active ticket has a deadline."}];
  const endLabel=new Date(weekEnd);endLabel.setDate(endLabel.getDate()-1);
  const range=`${weekStart.toLocaleDateString(undefined,{month:"short",day:"numeric"})} – ${endLabel.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}`;
  const sorted=rows=>[...rows].sort((a,b)=>(hubDate(a.due_date)?.getTime()||Infinity)-(hubDate(b.due_date)?.getTime()||Infinity));
  const metrics=[{id:"overdue",label:"Overdue",count:overdue.length,tone:"rose",icon:"clock"},{id:"today",label:"Due today",count:today.length,tone:"blue",icon:"week"},{id:"upcoming",label:"Coming up",count:upcoming.length,tone:"violet",icon:"calendar"},{id:"completed",label:"Completed",count:completed.length,tone:"green",icon:"tickets"}];
  return <>
    <header className="hub-week-header"><div><div className="dashboard-eyebrow">YOUR WORKSPACE</div><h1>My Week<span className="hub-week-header-dot" /></h1><p>A clear view of what needs your attention.</p></div><div className="hub-week-range"><HubNavIcon name="calendar"/><span>{range}</span></div></header>
    <TicketPerformance tickets={visible} />
    <div className="hub-week-metrics">{metrics.map(m=><button type="button" key={m.id} className={`hub-week-metric hub-tone-${m.tone} ${focus===m.id?"selected":""}`} aria-pressed={focus===m.id} onClick={()=>setFocus(f=>f===m.id?"all":m.id)}><span className="hub-week-metric-icon"><HubNavIcon name={m.icon}/></span><span className="hub-week-metric-value">{m.count}</span><span className="hub-week-metric-label">{m.label}</span><span className="hub-week-metric-arrow" aria-hidden="true">↗</span></button>)}</div>
    <div className="hub-week-agenda" aria-label="Deadlines this week">{Array.from({length:7},(_,i)=>{const day=new Date(weekStart);day.setDate(day.getDate()+i);const rows=open.filter(t=>hubSameDay(t.due_date,day)),id=`day-${i}`;return <button type="button" key={id} aria-pressed={focus===id} className={`hub-week-day ${hubSameDay(day,now)?"today":""} ${focus===id?"selected":""}`} onClick={()=>setFocus(f=>f===id?"all":id)}><span>{day.toLocaleDateString(undefined,{weekday:"short"})}</span><strong>{day.getDate()}</strong><small>{rows.length?`${rows.length} due`:"No deadlines"}</small>{hubSameDay(day,now)&&<i aria-hidden="true"/>}</button>;})}</div>
    <div className="hub-week-controls"><div><h2>{focus==="all"?"Your priorities":"Focused view"}</h2><p>{open.length} active ticket{open.length===1?"":"s"} assigned to you</p></div><div className="hub-week-control-actions">{focus!=="all"&&<button type="button" onClick={()=>setFocus("all")}>Show everything</button>}<select aria-label="My Week brand" value={brand} onChange={e=>setBrand(e.target.value)}><option value="all">All brands</option>{[...new Set(tickets.map(t=>t.source))].map(b=><option key={b}>{b}</option>)}</select></div></div>
    <div className="hub-week-grid">{(focus.startsWith("day-")?(()=>{const day=new Date(weekStart);day.setDate(day.getDate()+Number(focus.slice(4)));return [{id:focus,title:day.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"}),subtitle:"Tickets due on this day",rows:open.filter(t=>hubSameDay(t.due_date,day)),tone:"blue",icon:"calendar",empty:"No deadlines on this day."}];})():groups.filter(g=>focus==="all"||g.id===focus)).map(g=><section key={g.id} className={`hub-week-card hub-tone-${g.tone}`}><header><span className="hub-week-group-icon"><HubNavIcon name={g.icon}/></span><div><h3>{g.title}</h3><p>{g.subtitle}</p></div><span className="hub-week-group-count">{g.rows.length}</span></header><div className="hub-week-card-list">{g.rows.length?sorted(g.rows).map(t=><button type="button" className="hub-week-ticket" key={t.ticket_key} onClick={()=>onOpen(t)}><div className="hub-week-ticket-top"><BrandBadge source={t.source}/><span>#{t.ticket_number}</span>{String(t.priority).toLowerCase()==="high"&&<span className="hub-week-high">High priority</span>}</div><strong>{t.subject||"Untitled ticket"}</strong><div className="hub-week-ticket-bottom"><span className="hub-week-status">{t.status}</span><span className={hubDate(t.due_date)&&hubDate(t.due_date)<now&&!HUB_CLOSED(t)?"hub-danger":""}>{hubUrgency(t,now)}</span></div></button>):<div className="hub-week-empty"><span aria-hidden="true">✓</span><p>{g.empty}</p></div>}</div></section>)}</div>
    <p className="hub-week-footnote">Only tickets assigned to you are shown. A ticket can appear in more than one group. Completion counts use recorded closure dates.</p>
  </>;
}
function TicketOperations({ticket,threads,comments,onDue}) {
  const [activity,setActivity]=useState([]),[rules,setRules]=useState([]),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[summary,setSummary]=useState("");
  const [tab,setTab]=useState("activity");
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(id);},[]);
  useEffect(()=>{let live=true;async function load(){const results=await Promise.all([supabase.from("hub_ticket_activity").select("*").eq("ticket_key",ticket.ticket_key).order("created_at",{ascending:false}).limit(200),supabase.from("hub_sla_rules").select("*")]);if(!live)return;setActivity(results[0].data||[]);setRules(results[1].data||[]);const failed=results.find(r=>r.error);if(failed)setNotice(`Planning data unavailable: ${failed.error.message}`);}load();const channel=supabase.channel(`hub-planning-${ticket.ticket_key}`).on("postgres_changes",{event:"*",schema:"public",table:"hub_ticket_activity",filter:`ticket_key=eq.${ticket.ticket_key}`},load).subscribe();return()=>{live=false;supabase.removeChannel(channel);};},[ticket.ticket_key]);
  const events=[...activity.map(a=>({key:`a-${a.id}`,date:a.created_at,text:`${a.actor || "Zoho sync"} · ${a.activity_type}: ${a.old_value||"—"} → ${a.new_value||"—"}`})),...threads.map(t=>({key:`t-${t.thread_key||t.id}`,date:t.created_at_zoho,text:`${t.author_name||t.from_email||"Email"} · Email: ${stripHtml(t.content||t.content_html||t.summary||"").slice(0,240)}`})),...comments.map(c=>({key:`c-${c.comment_key||c.id}`,date:c.commented_at_zoho,text:`${c.author_name||"Team"} · Comment: ${stripHtml(c.content||c.content_html||"").slice(0,240)}`}))].sort((a,b)=>(hubDate(b.date)||0)-(hubDate(a.date)||0));
  async function run(fn){if(busy)return;setBusy(true);setNotice("");try{await fn();}catch(err){setNotice(err.message);}finally{setBusy(false);}}
  async function applySla(){const matching=rules.filter(r=>(!r.brand||r.brand===ticket.source)&&r.priority.toLowerCase()===String(ticket.priority||"Normal").toLowerCase()).sort((a,b)=>Number(!!b.brand)-Number(!!a.brand));const rule=matching[0];if(!rule)throw new Error("No matching SLA rule. Configure hub_sla_rules first.");const d=hubDate(ticket.created_at_zoho);if(!d)throw new Error("Created date is missing; cannot calculate SLA.");if(rule.business_days){let remaining=rule.target;while(remaining>0){d.setDate(d.getDate()+1);if(d.getDay()!==0&&d.getDay()!==6)remaining--;}}else d.setHours(d.getHours()+rule.target);await onDue(d.toISOString());setNotice("SLA deadline saved to Zoho.");}
  return <section className="hub-ticket-tools"><h3>Activity &amp; Summary</h3><p className={hubAttention(ticket,now)?"hub-danger":"hub-muted"}>{hubUrgency(ticket,now)}</p>{!ticket.due_date&&!HUB_CLOSED(ticket)&&<button disabled={busy} onClick={()=>run(applySla)}>Apply SLA deadline</button>}<div className="hub-toolbar">{["activity","summary"].map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t === "activity" ? "Activity" : "Summary"}</button>)}</div>{notice&&<p role="status" className="hub-notice">{notice}</p>}
  {tab==="activity"&&<div className="hub-activity">{events.length?events.map(e=><article key={e.key}><time>{formatDateTime(e.date)}</time><p>{e.text}</p></article>):<p>No recorded activity yet. New field changes are recorded after migration.</p>}</div>}
  {tab==="summary"&&<><button disabled={busy} onClick={()=>run(async()=>{const {data,error}=await supabase.functions.invoke("hub-ticket-summary",{body:{ticket_key:ticket.ticket_key}});if(error||!data?.summary)throw new Error(data?.error||error?.message||"Summary unavailable. Deploy the supplied AI function.");setSummary(data.summary);})}>{busy?"Summarizing…":"✨ Summarize"}</button><p className="hub-muted">AI draft for review. Suggestions do not change tickets or send replies.</p>{summary&&<div className="hub-summary">{summary}</div>}</>}
  </section>;
}

function HubNavIcon({ name }) {
  const paths = {
    dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    week: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2 M8 15l3 3 5-5",
    tickets: "M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5",
    star: "m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.2-.9z",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
    mention: "M16 8v8h2a4 4 0 0 0 4-4 10 10 0 1 0-4 8 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    clock: "M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    views: "M4 5h16 M4 12h16 M4 19h16 M9 3v4 M15 10v4 M8 17v4",
    calendar: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2 M7 14h2 M12 14h2 M17 14h1 M7 18h2 M12 18h2",
    workload: "M4 20V10 M10 20V4 M16 20v-8 M22 20H2",
    unassigned: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 12-7 M18 16v6 M15 19h6",
  };
  return <svg className="hub-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.tickets} /></svg>;
}

function HubTicketSearch({onOpen,isVisible,session}) {
  const [query,setQuery]=useState(""),[results,setResults]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[expanded,setExpanded]=useState(false);
  const input=useRef(null),container=useRef(null);
  useEffect(()=>{function shortcut(e){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();input.current?.focus();setExpanded(true);}if(e.key==="Escape")setExpanded(false);}function outside(e){if(!container.current?.contains(e.target))setExpanded(false);}document.addEventListener("keydown",shortcut);document.addEventListener("pointerdown",outside);return()=>{document.removeEventListener("keydown",shortcut);document.removeEventListener("pointerdown",outside);};},[]);
  useEffect(()=>{let live=true;const q=query.trim();setResults([]);setError("");if(q.length<2 && !/^\d$/.test(q)){setBusy(false);return;}setBusy(true);const timer=setTimeout(async()=>{try{
    // Quoted PostgREST values prevent punctuation from becoming filter syntax.
    const literal=q.replace(/^#(?=\d)/," ").trim().replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/%/g,"\\%").replace(/_/g,"\\_");
    const value=`"%${literal}%"`;
    const fields=["ticket_number","subject","contact_name","contact_email","assignee_name","assignee_email","codewiz_agent_name","codewiz_agent_email"];
    const {data,error:failure}=await supabase.from("tickets").select("*").eq("is_deleted",false).eq("is_trashed",false).or(fields.map(f=>`${f}.ilike.${value}`).join(",")).order("updated_at_zoho",{ascending:false,nullsFirst:false}).limit(40);
    if(!live)return;if(failure)throw failure;setResults((data||[]).filter(isVisible));
  }catch(err){if(live)setError(err.message||"Search unavailable");}finally{if(live)setBusy(false);}},300);return()=>{live=false;clearTimeout(timer);};},[query,session?.user?.id]);
  return <div className="hub-search" ref={container}><div className="hub-search-field"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg><input ref={input} aria-label="Find ticket" placeholder="Find ticket…" value={query} onFocus={()=>setExpanded(true)} onChange={e=>{setQuery(e.target.value);setExpanded(true);}} onKeyDown={e=>{if(e.key==="Enter"&&results.length){onOpen(results[0]);setExpanded(false);}}}/><kbd title="Ctrl or Command + K">⌘K</kbd></div>{expanded&&<div className="hub-search-results"><div className="hub-search-caption">All statuses · ticket, subject, requester or owner</div>{query.trim().length<2 && !/^\d$/.test(query.trim())?<p>Enter a ticket number or at least 2 characters.</p>:busy?<p role="status">Searching…</p>:error?<p role="alert">{error}</p>:results.length?<>{results.map(t=><button type="button" key={t.ticket_key} onClick={()=>{onOpen(t);setExpanded(false);}}><div><BrandBadge source={t.source}/><small>#{t.ticket_number}</small></div><strong>{t.subject||"Untitled ticket"}</strong><span>{t.status} · {t.contact_name||t.contact_email||"No requester"}</span></button>)}<div className="hub-search-caption">{results.length} matches shown · newest first</div></>:<p>No matching tickets.</p>}<button type="button" className="hub-search-close" onClick={()=>setExpanded(false)}>Close search</button></div>}</div>;
}
function HubSyncHealth({session}) {
  const [rows,setRows]=useState([]),[error,setError]=useState(""),[busy,setBusy]=useState(false),[open,setOpen]=useState(false),[now,setNow]=useState(Date.now());
  const refresh=useCallback(async()=>{setBusy(true);const {data,error:failure}=await supabase.from("hub_sync_health").select("*");setRows(data||[]);setError(failure?"Sync monitoring unavailable. Run the sync-health SQL first.":"");setBusy(false);},[session?.user?.id]);
  useEffect(()=>{refresh();const timer=setInterval(()=>{setNow(Date.now());refresh();},30000);return()=>clearInterval(timer);},[refresh]);
  const state=r=>!r?.status?"Not recorded":r.status==="running"?(now-new Date(r.started_at).getTime()>10*60000?"Check needed":"Syncing"):r.status==="failed"?"Failed":"Healthy";
  const brands=["Qualicare","Tutor Doctor","Code Wiz"];
  const states=brands.map(b=>state(rows.find(r=>r.source===b)));
  const label=error?"Unavailable":busy&&!rows.length?"Checking…":states.includes("Failed")?"Needs attention":states.includes("Check needed")?"Check needed":states.includes("Syncing")?"Syncing":states.every(s=>s==="Healthy")?"Healthy":"Not fully recorded";
  const tone=label==="Healthy"?"healthy":label==="Syncing"?"syncing":["Needs attention","Check needed"].includes(label)?"failed":"unknown";
  return <div className="hub-sync"><button className="hub-sync-toggle" type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><span className={`hub-sync-dot ${tone}`}/><span><strong>Ticket sync</strong><small>{label}</small></span><span aria-hidden="true">{open?"⌃":"⌄"}</span></button>{open&&<div className="hub-sync-details">{error&&<p role="status">{error}</p>}{brands.map(b=>{const r=rows.find(r=>r.source===b);return <div key={b}><strong>{b}</strong><span>{state(r)}</span><small>Last success: {r?.last_success_at?formatDateTime(r.last_success_at):"Not recorded"}</small>{r?.started_at&&<small>Latest attempt: {formatDateTime(r.started_at)}</small>}</div>;})}<p>Tracks individual ticket refreshes. Healthy means the latest recorded attempt succeeded; it does not verify a complete brand sync.</p><button type="button" disabled={busy} onClick={refresh}>{busy?"Checking…":"Refresh status"}</button></div>}</div>;
}

function TicketPerformance({tickets}) {
  const [period,setPeriod]=useState("week"),[start,setStart]=useState(""),[end,setEnd]=useState("");
  const [rows,setRows]=useState([]),[error,setError]=useState(""),[loading,setLoading]=useState(true);
  useEffect(()=>{let live=true;async function refresh(){setLoading(true);try{
    const all=[];for(let offset=0;;offset+=1000){const r=await supabase.from("hub_ticket_metrics").select("ticket_key,first_response_seconds,total_response_seconds,response_count,resolution_seconds,closed_at_zoho,synced_at").order("ticket_key").range(offset,offset+999);if(r.error)throw r.error;all.push(...r.data);if(r.data.length<1000)break;}
    if(live){setRows(all);setError("");}
  }catch(e){if(live)setError(e.message||"Unable to load performance metrics");}finally{if(live)setLoading(false);}}
  refresh();const timer=setInterval(refresh,60000);return()=>{live=false;clearInterval(timer);};},[]);
  const now=new Date(),from=new Date(now);from.setHours(0,0,0,0);let until=new Date(now);until.setHours(24,0,0,0);
  if(period==="week")from.setDate(from.getDate()-((from.getDay()+6)%7));
  if(period==="month")from.setDate(1);
  if(period==="custom"){from.setTime(new Date(`${start}T00:00:00`).getTime());until=new Date(`${end}T00:00:00`);until.setDate(until.getDate()+1);}
  const valid=Number.isFinite(from.getTime())&&Number.isFinite(until.getTime())&&until>from;
  const inRange=value=>{const d=hubDate(value);return valid&&d&&d>=from&&d<until;};
  const lookup=new Map(rows.map(r=>[r.ticket_key,r]));
  const cohort=tickets.filter(t=>inRange(t.created_at_zoho));
  const measured=cohort.map(t=>lookup.get(t.ticket_key)).filter(Boolean);
  const average=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
  const seconds=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value))&&Number(value)>=0;
  const first=average(measured.filter(r=>seconds(r.first_response_seconds)).map(r=>Number(r.first_response_seconds)));
  const responses=measured.filter(r=>seconds(r.total_response_seconds)&&r.response_count>0);
  const responseCount=responses.reduce((n,r)=>n+r.response_count,0);
  const response=responseCount?responses.reduce((n,r)=>n+Number(r.total_response_seconds),0)/responseCount:null;
  const resolved=cohort.filter(t=>HUB_CLOSED(t)).map(t=>lookup.get(t.ticket_key)).filter(r=>r&&seconds(r.resolution_seconds));
  const resolution=average(resolved.map(r=>Number(r.resolution_seconds)));
  const closed=tickets.filter(t=>HUB_CLOSED(t)&&inRange(lookup.get(t.ticket_key)?.closed_at_zoho));
  const format=value=>value===null?"—":`${Math.floor(Math.round(value/60)/60)}h ${String(Math.round(value/60)%60).padStart(2,"0")}m`;
  const cards=[{label:"First response time",value:format(first),note:`${measured.filter(r=>seconds(r.first_response_seconds)).length} tickets`},{label:"Response time",value:format(response),note:`${responseCount} responses`},{label:"Resolution time",value:format(resolution),note:`${resolved.length} closed tickets`},{label:"New tickets",value:valid?cohort.length:"—",note:"Created in period"},{label:"Closed tickets",value:valid?closed.length:"—",note:"Closed in period"},{label:"Current backlog",value:tickets.filter(t=>!HUB_CLOSED(t)).length,note:"Now, independent of date range"}];
  const days=[];if(valid){for(let d=new Date(from);d<until&&days.length<93;d.setDate(d.getDate()+1)){const day=new Date(d),next=new Date(d);next.setDate(next.getDate()+1);const inside=v=>{const x=hubDate(v);return x&&x>=day&&x<next;};days.push({label:day.toLocaleDateString(undefined,{month:"short",day:"numeric"}),created:cohort.filter(t=>inside(t.created_at_zoho)).length,closed:closed.filter(t=>inside(lookup.get(t.ticket_key)?.closed_at_zoho)).length});}}
  const max=Math.max(1,...days.flatMap(d=>[d.created,d.closed]));
  return <section className="hub-dashboard-panel hub-performance"><header><div><h2>Performance</h2><p>Uses the selected brand and My / Team overview.</p></div><select aria-label="Performance period" value={period} onChange={e=>setPeriod(e.target.value)}><option value="day">Today</option><option value="week">This week</option><option value="month">This month</option><option value="custom">Custom range</option></select></header>
    {period==="custom"&&<div className="hub-performance-dates"><label>From <input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Through <input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>}
    {error&&<p role="alert">Performance data unavailable: {error}</p>}{loading&&<p role="status">Updating metrics…</p>}{!valid&&<p>Select a valid date range.</p>}
    <div className="hub-performance-cards">{cards.map(c=><div key={c.label}><span>{c.label}</span><strong>{c.value}</strong><small>{c.note}</small></div>)}</div>
    <p className="hub-muted">Timing averages use Zoho's latest lifetime metrics for tickets created in this period. Response time is weighted by response count. Missing timings are excluded; zero is included. {measured.length} of {cohort.length} tickets have synced metrics. Dates use your browser's timezone.</p>
    {valid&&<><h3>Created vs closed <small>Blue: created · Green: closed</small></h3><div className="hub-performance-chart">{days.map((d,i)=><div key={i} title={`${d.label}: ${d.created} created, ${d.closed} closed`}><div className="hub-performance-bars"><i style={{height:`${d.created/max*100}%`}}/><i style={{height:`${d.closed/max*100}%`}}/></div><small>{d.label}</small></div>)}</div>{days.length===93&&<p>Chart shows the first 93 days. Totals cover the full selected range.</p>}</>}
    <p className="hub-muted">Counts cover tickets loaded in the Hub. Closed dates require a successful metrics sync. Historical average backlog is not available yet.</p>
  </section>;
}

function MarketingDashboard({tickets,session,onOpen,onNavigate,onFind}) {
  const [scope,setScope]=useState("team"),[brand,setBrand]=useState("all"),[metric,setMetric]=useState(null);
  const [events,setEvents]=useState([]),[notice,setNotice]=useState(""),[loading,setLoading]=useState(true),[now,setNow]=useState(new Date());
  useEffect(()=>{let live=true;async function refresh(){setLoading(true);const results=await Promise.all([
    supabase.from("hub_ticket_activity").select("*").order("created_at",{ascending:false}).limit(80),
    supabase.from("ticket_comments").select("*").order("commented_at_zoho",{ascending:false}).limit(40),
    supabase.from("ticket_threads").select("*").order("created_at_zoho",{ascending:false}).limit(40),
  ]);if(!live)return;const merged=[];
    for(const a of results[0].data||[]){const labels={status:"Status changed",priority:"Priority changed",due_date:"Deadline changed",assignee_name:"Owner changed",assignee_email:"Owner email changed",codewiz_agent_name:"Owner changed",codewiz_agent_email:"Owner email changed",created:"Ticket created"};merged.push({id:`audit-${a.id}`,ticket_key:a.ticket_key,date:a.created_at,label:labels[a.activity_type]||a.activity_type,actor:a.actor||"Zoho sync",detail:a.activity_type==="created"?a.new_value:`${a.old_value||"None"} → ${a.new_value||"None"}`,kind:"audit"});}
    for(const c of results[1].data||[])merged.push({id:`comment-${c.comment_key||c.id}`,ticket_key:c.ticket_key,date:c.commented_at_zoho,label:"Comment added",actor:c.commenter_name||c.author_name||c.commented_by_name||"Team member",detail:stripHtml(c.content_html||c.content||c.content_text||"").slice(0,140),kind:"comment"});
    for(const t of results[2].data||[])merged.push({id:`email-${t.thread_key||t.id}`,ticket_key:t.ticket_key,date:t.created_at_zoho,label:isOutboundThread(t)?"Reply sent":"Email received",actor:t.author_name||t.from_email||"Email",detail:stripHtml(t.summary||t.content_text||"").slice(0,140),kind:"email"});
    setEvents(merged.sort((a,b)=>(hubDate(b.date)?.getTime()||0)-(hubDate(a.date)?.getTime()||0)));setNotice(results.some(r=>r.error)?"Some activity sources could not be loaded. Showing the available history.":"");setLoading(false);
  }refresh();const interval=setInterval(()=>{setNow(new Date());refresh();},60000);const channel=supabase.channel("hub-dashboard-activity");for(const table of ["hub_ticket_activity","ticket_comments","ticket_threads"])channel.on("postgres_changes",{event:"*",schema:"public",table},refresh);channel.subscribe();return()=>{live=false;clearInterval(interval);supabase.removeChannel(channel);};},[session?.user?.id]);
  const email=String(session?.user?.email||"").toLowerCase();
  const visible=tickets.filter(t=>(brand==="all"||t.source===brand)&&(scope==="team"||String(getTicketOwnerEmail(t)||"").toLowerCase()===email));
  const active=visible.filter(t=>!HUB_CLOSED(t)),overdue=active.filter(t=>hubDate(t.due_date)&&hubDate(t.due_date)<now),today=active.filter(t=>hubSameDay(t.due_date,now)),unassigned=active.filter(isTicketUnassigned);
  const attention=active.filter(t=>hubAttention(t,now)||isTicketUnassigned(t)).sort((a,b)=>{const score=t=>(hubDate(t.due_date)&&hubDate(t.due_date)<now?4:0)+(String(t.priority).toLowerCase()==="high"?2:0)+(isTicketUnassigned(t)?1:0);return score(b)-score(a)||(hubDate(a.due_date)?.getTime()||Infinity)-(hubDate(b.due_date)?.getTime()||Infinity);});
  const map=new Map(visible.map(t=>[t.ticket_key,t]));const activity=events.filter(e=>map.has(e.ticket_key)).slice(0,12);
  const name=(session?.user?.user_metadata?.full_name||getTicketOwnerName(tickets.find(t=>String(getTicketOwnerEmail(t)||"").toLowerCase()===email))||"").split(" ")[0];
  const greeting=now.getHours()<12?"Good morning":now.getHours()<18?"Good afternoon":"Good evening";
  const metrics=[{id:"active",label:"Active",rows:active,tone:"blue",icon:"tickets"},{id:"today",label:"Due today",rows:today,tone:"violet",icon:"calendar"},{id:"overdue",label:"Overdue",rows:overdue,tone:"rose",icon:"clock"},{id:"unassigned",label:"Unassigned",rows:unassigned,tone:"amber",icon:"unassigned"}];
  const list=rows=>rows.length?rows.map(t=><button type="button" className="hub-dashboard-ticket" key={t.ticket_key} onClick={()=>onOpen(t)}><div><BrandBadge source={t.source}/><span>#{t.ticket_number}</span></div><strong>{t.subject||"Untitled ticket"}</strong><footer><span>{getTicketOwnerName(t)||"Unassigned"}</span><span className={hubDate(t.due_date)&&hubDate(t.due_date)<now?"hub-danger":""}>{hubUrgency(t,now)}</span></footer></button>):<div className="hub-dashboard-empty">No tickets in this view.</div>;
  return <section className="dashboard-view hub-dashboard-home"><header className="hub-week-header"><div><div className="dashboard-eyebrow">MARKETING OVERVIEW</div><h1>{greeting}{name?`, ${name}`:""}.</h1><p>{now.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})} · Let's see what needs your attention.</p></div><div className="hub-dashboard-scope"><button type="button" aria-pressed={scope==="mine"} onClick={()=>{setScope("mine");setMetric(null);}}>My overview</button><button type="button" aria-pressed={scope==="team"} onClick={()=>{setScope("team");setMetric(null);}}>Team overview</button></div></header>
    <div className="hub-dashboard-quick"><button type="button" onClick={onFind}><HubNavIcon name="views"/>Find ticket <kbd>⌘K</kbd></button><button type="button" onClick={()=>onNavigate("My Week")}><HubNavIcon name="week"/>My Week</button><button type="button" onClick={()=>onNavigate("Calendar")}><HubNavIcon name="calendar"/>Calendar</button><select aria-label="Dashboard brand" value={brand} onChange={e=>{setBrand(e.target.value);setMetric(null);}}><option value="all">All brands</option>{["Tutor Doctor","Qualicare","Code Wiz"].map(b=><option key={b}>{b}</option>)}</select></div>
    <div className="hub-week-metrics">{metrics.map(m=><button type="button" key={m.id} className={`hub-week-metric hub-tone-${m.tone} ${metric===m.id?"selected":""}`} aria-pressed={metric===m.id} onClick={()=>setMetric(v=>v===m.id?null:m.id)}><span className="hub-week-metric-icon"><HubNavIcon name={m.icon}/></span><span className="hub-week-metric-value">{m.rows.length}</span><span className="hub-week-metric-label">{m.label}</span><span className="hub-week-metric-arrow" aria-hidden="true">↗</span></button>)}</div>
    {metric&&<section className="hub-dashboard-panel hub-dashboard-metric-panel"><header><div><h2>{metrics.find(m=>m.id===metric)?.label} tickets</h2><p>Showing up to 20 tickets in the selected scope.</p></div><button type="button" onClick={()=>setMetric(null)}>Close</button></header>{list((metrics.find(m=>m.id===metric)?.rows||[]).slice(0,20))}</section>}
    <div className="hub-dashboard-columns"><section className="hub-dashboard-panel"><header><div><h2>Needs attention <span>{attention.length}</span></h2><p>Overdue, unassigned, or high-priority work inactive for 48 hours.</p></div><HubNavIcon name="clock"/></header>{attention.length?list(attention.slice(0,8)):<div className="hub-dashboard-empty"><span>✓</span>No tickets need attention in this view.</div>}</section>
    <section className="hub-dashboard-panel"><header><div><h2>Recent activity</h2><p>The latest recorded changes, comments and emails.</p></div><span className="hub-dashboard-live">Live</span></header>{notice&&<p className="hub-notice" role="status">{notice}</p>}{loading&&!events.length?<div className="hub-dashboard-empty" role="status">Loading activity…</div>:activity.length?<div className="hub-dashboard-feed">{activity.map(e=>{const t=map.get(e.ticket_key);return <button type="button" key={e.id} onClick={()=>onOpen(t)}><span className={`hub-dashboard-feed-icon ${e.kind}`}><HubNavIcon name={e.kind==="comment"?"mention":e.kind==="email"?"tickets":"clock"}/></span><div><strong>{e.label}</strong><p>#{t.ticket_number} · {t.subject||"Untitled ticket"}</p>{e.detail&&<small>{e.detail}</small>}<footer>{e.actor} · {formatDateTime(e.date)}</footer></div></button>;})}</div>:<div className="hub-dashboard-empty">No recorded activity for these tickets yet.</div>}</section></div>
    <section className="hub-dashboard-brands"><header><h2>Brand snapshot</h2><p>{scope==="mine"?"Your assigned tickets":"Your team's tickets"} · select a brand to focus the dashboard.</p></header><div>{["Tutor Doctor","Qualicare","Code Wiz"].map(b=>{const rows=tickets.filter(t=>t.source===b&&!HUB_CLOSED(t)&&(scope==="team"||String(getTicketOwnerEmail(t)||"").toLowerCase()===email));return <button type="button" key={b} aria-pressed={brand===b} onClick={()=>{setBrand(v=>v===b?"all":b);setMetric(null);}}><BrandBadge source={b}/><strong>{rows.length}<small>active</small></strong><footer><span>{rows.filter(t=>hubDate(t.due_date)&&hubDate(t.due_date)<now).length} overdue</span><span>{rows.filter(isTicketUnassigned).length} unassigned</span></footer></button>;})}</div></section>
    <TeamMoments session={session} tickets={tickets} onOpen={onOpen} />
    <p className="hub-week-footnote">Counts use loaded tickets. Activity shows recent accessible records; field-change history starts when audit logging was enabled. Zoho sync changes retain their recorded actor.</p>
  </section>;
}

function hubReadPreference(key,fallback){try{const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v);}catch{return fallback;}}
function hubWritePreference(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* private browsing can disable local storage */}}
function hubCompletionEvent(ticket,status){if(!HUB_CLOSED(ticket)&&/^(closed|resolved)$/i.test(status||""))window.dispatchEvent(new CustomEvent("hub-ticket-completed",{detail:{number:ticket.ticket_number,subject:ticket.subject}}));}
function CompletionCelebration({session}) {
  const [ticket,setTicket]=useState(null),[enabled,setEnabled]=useState(true);const timer=useRef(null);
  useEffect(()=>{const key=`hub-celebrations:${session?.user?.id}`;setEnabled(hubReadPreference(key,true));function celebrate(e){if(!hubReadPreference(key,true))return;setTicket(e.detail);clearTimeout(timer.current);timer.current=setTimeout(()=>setTicket(null),3800);}function preference(){setEnabled(hubReadPreference(key,true));}window.addEventListener("hub-ticket-completed",celebrate);window.addEventListener("hub-celebrations-change",preference);return()=>{clearTimeout(timer.current);window.removeEventListener("hub-ticket-completed",celebrate);window.removeEventListener("hub-celebrations-change",preference);};},[session?.user?.id]);
  if(!ticket||!enabled)return null;
  return <div className="hub-celebration" role="status"><div className="hub-confetti" aria-hidden="true">{Array.from({length:26},(_,i)=><i key={i} style={{"--piece":i,"--drift":`${(i%5-2)*23}px`,left:`${(i*37)%100}%`,background:["#73c6a1","#e6b468","#8aa6df","#c6a5db"][i%4],animationDelay:`${i%7*55}ms`}}/>)}</div><span>🎉</span><div><strong>Nice work!</strong><p>Ticket #{ticket.number} is complete.</p></div><button type="button" aria-label="Dismiss celebration" onClick={()=>setTicket(null)}>×</button></div>;
}
const HUB_MOODS=[{value:"focused",emoji:"🎯",label:"Focused"},{value:"busy",emoji:"🔥",label:"Busy"},{value:"available",emoji:"🙌",label:"Happy to help"},{value:"help",emoji:"💬",label:"Could use help"}];
function TeamMoments({session,tickets,onOpen}) {
  const [wins,setWins]=useState([]),[moods,setMoods]=useState([]),[kudos,setKudos]=useState([]),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[goal,setGoal]=useState(5),[celebrations,setCelebrations]=useState(true),[now,setNow]=useState(new Date());
  const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7));const end=new Date(start);end.setDate(end.getDate()+7);
  const weekKey=hubLocalInput(start).slice(0,10),goalKey=`hub-week-goal:${session.user.id}:${weekKey}`,prefKey=`hub-celebrations:${session.user.id}`;
  useEffect(()=>{setGoal(hubReadPreference(goalKey,5));setCelebrations(hubReadPreference(prefKey,true));},[goalKey,prefKey]);
  useEffect(()=>{let live=true;async function load(){const r=await Promise.all([supabase.rpc("hub_weekly_wins",{p_start:start.toISOString(),p_end:end.toISOString()}),supabase.from("hub_team_moods").select("*").order("updated_at",{ascending:false}),supabase.from("hub_kudos").select("*").order("created_at",{ascending:false}).limit(12)]);if(!live)return;setWins(r[0].data||[]);setMoods(r[1].data||[]);setKudos(r[2].data||[]);setNotice(r.some(x=>x.error)?"Team moments are unavailable until the community SQL is installed.":"");setLoading(false);}load();const id=setInterval(()=>{setNow(new Date());load();},60000);const channel=supabase.channel("hub-team-moments");for(const table of ["hub_team_moods","hub_kudos","hub_ticket_activity"])channel.on("postgres_changes",{event:"*",schema:"public",table},load);channel.subscribe();return()=>{live=false;clearInterval(id);supabase.removeChannel(channel);};},[session.user.id,weekKey]);
  const email=String(session.user.email||"").toLowerCase(),mine=wins.filter(w=>String(w.owner_email||"").toLowerCase()===email),percent=Math.min(100,Math.round(mine.length/Math.max(goal,1)*100));
  const mineMood=moods.find(m=>m.user_id===session.user.id)?.mood||"";
  const recentMoods=moods.filter(m=>new Date(m.updated_at)>=new Date(now.getFullYear(),now.getMonth(),now.getDate()));
  async function mood(value){if(busy)return;setBusy(true);setNotice("");let error;if(value){const r=await supabase.from("hub_team_moods").upsert({user_id:session.user.id,user_email:email,user_name:session.user.user_metadata?.full_name||getTicketOwnerName(tickets.find(t=>String(getTicketOwnerEmail(t)||"").toLowerCase()===email))||email,mood:value,updated_at:new Date().toISOString()},{onConflict:"user_id"}).select().single();error=r.error;if(!error)setMoods(v=>[r.data,...v.filter(m=>m.user_id!==session.user.id)]);}else{const r=await supabase.from("hub_team_moods").delete().eq("user_id",session.user.id);error=r.error;if(!error)setMoods(v=>v.filter(m=>m.user_id!==session.user.id));}if(error)setNotice(error.message);setBusy(false);}
  function toggleCelebrations(){const next=!celebrations;setCelebrations(next);hubWritePreference(prefKey,next);window.dispatchEvent(new Event("hub-celebrations-change"));}
  return <section className="hub-moments"><header><h2>A little team spirit</h2><p>Celebrate progress, check in, and thank someone.</p></header>{notice&&<p className="hub-notice" role="status">{notice}</p>}<div className="hub-moments-grid">
    <section className="hub-garden-card"><div className="hub-moment-title"><span>🌱</span><h3>Your progress garden</h3></div><div className="hub-garden-scene" aria-hidden="true"><svg viewBox="0 0 200 130"><ellipse cx="100" cy="112" rx="60" ry="9" fill="#e1ede5"/><path d="M78 92h44l-6 25H84z" fill="#c99779"/><path d="M75 89h50v8H75z" fill="#dfb496"/><path d={`M100 91 Q96 75 100 ${mine.length?45:68}`} stroke="#76a68b" strokeWidth="4" fill="none"/>{mine.length>0&&<><path d="M99 70Q67 71 70 46Q98 45 99 70" fill="#94c8a5"/><path d="M100 59Q126 58 128 34Q100 35 100 59" fill="#78b997"/></>}{percent>=50&&<path d="M99 45Q76 44 77 24Q99 23 99 45" fill="#abd4b4"/>}{percent>=100&&<><circle cx="102" cy="23" r="10" fill="#e9b4c8"/><circle cx="91" cy="30" r="10" fill="#e9b4c8"/><circle cx="113" cy="31" r="10" fill="#e9b4c8"/><circle cx="102" cy="39" r="10" fill="#e9b4c8"/><circle cx="102" cy="31" r="7" fill="#efd18b"/></>}</svg><span>{percent>=100?"In full bloom":percent>=50?"Growing strong":mine.length?"Taking root":"Ready to grow"}</span></div><div className="hub-garden-progress"><strong>{mine.length}<small> / {goal} weekly goal</small></strong><progress aria-label="Weekly completion goal" value={Math.min(mine.length,goal)} max={goal}/></div><label className="hub-garden-goal">Your goal <input type="number" min="1" max="50" value={goal} onChange={e=>{const g=Math.min(50,Math.max(1,Number(e.target.value)||1));setGoal(g);hubWritePreference(goalKey,g);}}/> completions</label><p className="hub-moment-note">Recorded completions on tickets assigned to you. A personal goal, at your pace.</p><label className="hub-celebration-setting"><input type="checkbox" checked={celebrations} onChange={toggleCelebrations}/> Celebrate when I close a ticket</label></section>
    <section className="hub-wins-card"><div className="hub-moment-title"><span>🏆</span><h3>This week's wins</h3></div><strong className="hub-wins-total">{loading?"…":wins.length}<small>recorded team completions</small></strong><div className="hub-wins-brands">{["Tutor Doctor","Qualicare","Code Wiz"].map(b=><span key={b}>{b}<strong>{wins.filter(w=>w.source===b).length}</strong></span>)}</div><div className="hub-wins-list">{wins.slice(0,4).map(w=><button type="button" key={w.ticket_key} onClick={()=>onOpen(w)}><span>✓</span><div><strong>{w.subject||"Untitled ticket"}</strong><small>#{w.ticket_number} · {w.owner_name||"Team effort"}</small></div></button>)}{!loading&&!wins.length&&<p className="hub-moment-note">Your next recorded completion will appear here.</p>}</div><p className="hub-moment-note">Team progress, without a leaderboard. Only tickets still closed are counted.</p></section>
    <section className="hub-mood-card"><div className="hub-moment-title"><span>💬</span><h3>How's today going?</h3></div><p className="hub-moment-note">An optional check-in, visible to the team.</p><div className="hub-mood-options">{HUB_MOODS.map(m=><button type="button" key={m.value} aria-pressed={mineMood===m.value} disabled={busy} onClick={()=>mood(m.value)}><span>{m.emoji}</span>{m.label}</button>)}</div>{mineMood&&<button type="button" className="hub-mood-clear" disabled={busy} onClick={()=>mood("")}>Clear my check-in</button>}<div className="hub-team-checkins">{recentMoods.map(m=>{const v=HUB_MOODS.find(v=>v.value===m.mood);return <div key={m.user_id}><span>{v?.emoji}</span><strong>{m.user_name}</strong><small>{v?.label}</small></div>;})}</div><p className="hub-moment-note">Showing check-ins updated today.</p></section>
  </div><section className="hub-kudos-wall"><div className="hub-moment-title"><span>🙌</span><h3>Team kudos</h3></div><div>{kudos.length?kudos.slice(0,6).map(k=><article key={k.id}><strong>{k.author_name} <span>→</span> {k.recipient_name}</strong><p>{k.message}</p><small>{formatDateTime(k.created_at)}</small></article>):<p className="hub-moment-note">Give a teammate kudos from a ticket to add the first thank-you.</p>}</div></section></section>;
}
function TicketKudos({ticket,session,people}) {
  const [recipient,setRecipient]=useState(""),[message,setMessage]=useState(""),[rows,setRows]=useState([]),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
  const options=people.filter(p=>String(p.email).toLowerCase()!==String(session.user.email).toLowerCase());
  useEffect(()=>{let live=true;const owner=String(getTicketOwnerEmail(ticket)||"").toLowerCase();setRecipient(options.some(p=>p.email===owner)?owner:"");supabase.from("hub_kudos").select("*").eq("ticket_key",ticket.ticket_key).order("created_at",{ascending:false}).limit(10).then(({data,error})=>{if(live){setRows(data||[]);if(error)setNotice("Kudos needs the community SQL migration.");}});return()=>{live=false;};},[ticket.ticket_key]);
  async function submit(e){e.preventDefault();if(busy||!recipient||!message.trim())return;setBusy(true);setNotice("");const person=options.find(p=>p.email===recipient);const {data,error}=await supabase.from("hub_kudos").insert({ticket_key:ticket.ticket_key,author_id:session.user.id,author_email:String(session.user.email).toLowerCase(),author_name:session.user.user_metadata?.full_name||session.user.email,recipient_email:person.email,recipient_name:person.name,message:message.trim()}).select().single();if(error)setNotice(error.message);else{setRows(v=>[data,...v]);setMessage("");setNotice("Kudos added to the ticket and team wall.");}setBusy(false);}
  async function remove(row){setBusy(true);const {error}=await supabase.from("hub_kudos").delete().eq("id",row.id);if(error)setNotice(error.message);else setRows(v=>v.filter(k=>k.id!==row.id));setBusy(false);}
  return <section className="hub-ticket-kudos"><h3>🙌 Give kudos</h3><form onSubmit={submit}><select aria-label="Kudos recipient" value={recipient} onChange={e=>setRecipient(e.target.value)} required><option value="">Choose a teammate</option>{options.map(p=><option key={p.email} value={p.email}>{p.name}</option>)}</select><textarea aria-label="Kudos message" maxLength={400} rows={2} placeholder="Thanks for getting this live!" value={message} onChange={e=>setMessage(e.target.value)} required/><button disabled={busy||!recipient||!message.trim()}>Add kudos</button></form>{notice&&<p role="status" className="hub-moment-note">{notice}</p>}{rows.map(k=><article key={k.id}><strong>{k.recipient_name}</strong><p>{k.message}</p><small>From {k.author_name}</small>{k.author_id===session.user.id&&<button type="button" disabled={busy} onClick={()=>remove(k)} aria-label="Remove your kudos">×</button>}</article>)}</section>;
}

function App() {
  const [deleteBusy,setDeleteBusy]=useState(false);
  const [deleteNotice,setDeleteNotice]=useState("");
  const [opsPage, setOpsPage] = useState(null);
  const [ticketDetailsOpen, setTicketDetailsOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [showSignatures, setShowSignatures] = useState(false);
  const [signatures, setSignatures] = useState({});
  const [signatureReady, setSignatureReady] = useState(false);
  const [signatureError, setSignatureError] = useState("");
  const signatureAttempt = useRef(null);

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

  const [passwordSetupRequired, setPasswordSetupRequired] = useState(INITIAL_PASSWORD_SETUP);
  useEffect(() => {
    let cancelled = false;
    setSignatures({}); setSignatureReady(false); setSignatureError("");
    if (!session?.user?.id) return;
    (async () => {
      try {
        const {data,error} = await supabase.from("hub_user_signatures").select("brand,html,automatic").eq("user_id",session.user.id);
        if (error) throw error;
        if (!cancelled) setSignatures(Object.fromEntries((data || []).map(row=>[row.brand,{html:sanitizeSignatureHtml(row.html),automatic:row.automatic}])));
      } catch (error) { if (!cancelled) setSignatureError(error.message || "Unable to load signatures"); }
      finally { if (!cancelled) setSignatureReady(true); }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);


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
    setSelectedKeyState,
  ] =
    useState(null);

  const [
    loadingTickets,
    setLoadingTickets,
  ] =
    useState(false);

  const ticketReturnView = useRef(null);
  function setSelectedKey(value) {
    if (typeof value === "string" && !selectedKey) {
      ticketReturnView.current = {filter, brandFilter, departmentFilter, assigneeFilter, search, ticketViewMode};
    }
    setSelectedKeyState(value);
  }
  function returnToTicketList() {
    const view = ticketReturnView.current;
    if (view) {
      setFilter(view.filter); setBrandFilter(view.brandFilter);
      setDepartmentFilter(view.departmentFilter); setAssigneeFilter(view.assigneeFilter);
      setSearch(view.search); setTicketViewMode(view.ticketViewMode);
    }
    ticketReturnView.current = null;
    setSelectedKeyState(null); setComposerOpen(false);
    setTicketDetailsOpen(false); setOpsPage(null); setShowDashboard(false);
  }

  useEffect(() => { setDeleteNotice(""); }, [selectedKey]);

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
    assigneeFilter,
    setAssigneeFilter,
  ] =
    useState("all");

  const [
    showDashboard,
    setShowDashboard,
  ] =
    useState(true);

  const [
    favoriteKeys,
    setFavoriteKeys,
  ] =
    useState([]);

  const [
    ticketViewMode,
    setTicketViewMode,
  ] =
    useState("compact");

  const [
    classicAssignmentKey,
    setClassicAssignmentKey,
  ] =
    useState(null);

  const [
    classicAssignmentBusy,
    setClassicAssignmentBusy,
  ] =
    useState(false);

  const [
    classicAgentOptions,
    setClassicAgentOptions,
  ] =
    useState([]);

  const [
    statusEditKey,
    setStatusEditKey,
  ] =
    useState(null);

  const [
    statusEditBusy,
    setStatusEditBusy,
  ] =
    useState(false);

  const [
    notificationFilter,
    setNotificationFilter,
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
  // REMINDERS
  // ====================================================

  const [
    reminders,
    setReminders,
  ] =
    useState([]);

  const [
    showReminders,
    setShowReminders,
  ] =
    useState(false);

  const [
    reminderDate,
    setReminderDate,
  ] =
    useState("");

  const [
    reminderNote,
    setReminderNote,
  ] =
    useState("");

  const [
    reminderBusy,
    setReminderBusy,
  ] =
    useState(false);

  const [
    reminderNotice,
    setReminderNotice,
  ] =
    useState("");

  // ====================================================
  // FAVORITES / STARRED TICKETS

  useEffect(() => {
    if (!session?.user?.email) {
      setFavoriteKeys([]);
      return;
    }
    try {
      const storageKey = `csg-ticket-favorites:${String(session.user.email).trim().toLowerCase()}`;
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setFavoriteKeys(Array.isArray(saved) ? saved : []);
    } catch {
      setFavoriteKeys([]);
    }
  }, [session?.user?.email]);

  function toggleFavorite(ticketKey) {
    if (!ticketKey || !session?.user?.email) return;
    const storageKey = `csg-ticket-favorites:${String(session.user.email).trim().toLowerCase()}`;
    setFavoriteKeys((current) => {
      const next = current.includes(ticketKey) ? current.filter((key) => key !== ticketKey) : [...current, ticketKey];
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

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
            if (_event === "PASSWORD_RECOVERY" || passwordSetupRequested(window.location.href)) {
              rememberPasswordSetup(true);
              setPasswordSetupRequired(true);
            } else if (_event === "SIGNED_OUT") {
              rememberPasswordSetup(false);
              setPasswordSetupRequired(false);
            }
            setSession(nextSession);
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
  // REMINDERS
  // ====================================================

  const loadReminders =
    useCallback(
      async () => {
        if (!session?.user?.email) {
          setReminders([]);
          return;
        }

        const { data, error } = await supabase
          .from("ticket_reminders")
          .select("*")
          .eq("user_email", session.user.email.toLowerCase())
          .is("completed_at", null)
          .order("reminder_at", { ascending: true })
          .limit(100);

        if (error) {
          console.error("Reminder load error:", error);
          setReminders([]);
        } else {
          setReminders(data || []);
        }
      },
      [session]
    );

  useEffect(() => {
    if (session) loadReminders();
    else setReminders([]);
  }, [session, loadReminders]);

  async function createReminder() {
    if (!selected || !session?.user?.email) return;
    if (!reminderDate) {
      setReminderNotice("Choose a date and time for the reminder.");
      return;
    }

    setReminderBusy(true);
    setReminderNotice("");

    const reminderAt = new Date(reminderDate).toISOString();
    const { error } = await supabase
      .from("ticket_reminders")
      .insert({
        user_email: session.user.email.toLowerCase(),
        ticket_key: selected.ticket_key,
        source: selected.source,
        ticket_number: selected.ticket_number,
        subject: selected.subject,
        reminder_at: reminderAt,
        note: reminderNote.trim() || null,
      });

    if (error) {
      console.error("Reminder create error:", error);
      setReminderNotice(error.message);
    } else {
      setReminderNotice("Reminder saved.");
      setReminderDate("");
      setReminderNote("");
      await loadReminders();
    }

    setReminderBusy(false);
  }

  async function completeReminder(reminder) {
    if (!reminder?.id) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("ticket_reminders")
      .update({ completed_at: now })
      .eq("id", reminder.id)
      .eq("user_email", session.user.email.toLowerCase());

    if (!error) {
      setReminders((current) => current.filter((item) => item.id !== reminder.id));
    }
  }

  function openReminderForTicket(ticket = selected) {
    if (!ticket) return;
    setSelectedKey(ticket.ticket_key);
    setShowReminders(true);
    setReminderNotice("");
    setReminderNote("");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(9, 0, 0, 0);
    const local = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000);
    setReminderDate(local.toISOString().slice(0, 16));
  }

  const activeReminderCount = useMemo(
    () => reminders.length,
    [reminders]
  );

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

            return null;
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
            (data || []).filter(
              (agent) =>
                agent.active !== false
            )
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

      signatureAttempt.current = null;
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
      selected?.ticket_key, selected?.contact_email,
    ]);

  useEffect(() => {
    resetComposer();
    setComposerOpen(false);
    setTicketDetailsOpen(false);
  }, [
    selectedKey,
    resetComposer,
  ]);

  function insertBrandSignature() {
    const signature = signatures[selected?.source];
    if (!editorRef.current || !signature?.html) { setComposerNotice("Save a signature for this brand in My Signatures first."); return; }
    const content = withoutHubSignature(editorRef.current.innerHTML);
    const html = `${content || "<p><br></p>"}<div data-hub-signature="true">${sanitizeSignatureHtml(signature.html)}</div><p><br></p>`;
    editorRef.current.innerHTML = html; setEditorHtml(html);
    signatureAttempt.current = selected.ticket_key;
  }
  useEffect(() => {
    if (!signatureReady || !selected || !editorRef.current || signatureAttempt.current === selected.ticket_key) return;
    signatureAttempt.current = selected.ticket_key;
    const signature = signatures[selected.source];
    if (signature?.automatic && signature.html) insertBrandSignature();
  }, [selectedKey, signatureReady, signatures, showDashboard, opsPage, resetComposer]);

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
    setComposerOpen(true);
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
      !stripHtml(withoutHubSignature(html))
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

      setComposerOpen(false);
      signatureAttempt.current = null;
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

      // Refresh in-app notifications immediately so a self-mention
      // (or any teammate mention) appears without a page refresh.
      await loadNotifications();

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
              value.length === 10 ? `${value}T12:00:00` : value
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

    if (field === "status") hubCompletionEvent(selected, finalValue);

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

    if (ticket?.source === "Qualicare") {
      // Missing owner email alone does not mean a ticket is unassigned.
      const hasOwner = [ticket.assignee_id, ticket.assignee_name, ticket.assignee_email]
        .some(value => String(value || "").trim());
      if (!hasOwner) return true;
      const ownerEmail = getTicketOwnerEmail(ticket);
      return !!ownerEmail && CODEWIZ_TICKET_OWNERS.some(person =>
        String(person.email || "").trim().toLowerCase() === ownerEmail);
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

      const currentUserEmail =
        String(
          session?.user?.email ||
          ""
        )
          .trim()
          .toLowerCase();

      if (
        filter ===
        "inprogress"
      ) {
        rows = rows.filter((ticket) => ticket.status === "In Progress");
      }
      if (
        filter ===
        "onhold"
      ) {
        rows = rows.filter((ticket) => ticket.status === "On Hold");
      }
      if (
        filter ===
        "waiting"
      ) {
        rows = rows.filter((ticket) => ticket.status === "Waiting");
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
        "mine"
      ) {
        const ownerEmail = currentUserEmail;

        rows = rows.filter(
          (ticket) =>
            ownerEmail && getTicketOwnerEmail(ticket) === ownerEmail &&
            ticket.status !== "Closed"
        );
      }

      if (assigneeFilter !== "all" && filter !== "mine") {
        const ownerEmail =
          assigneeFilter === "mine"
            ? currentUserEmail
            : String(assigneeFilter).trim().toLowerCase();

        rows = rows.filter(
          (ticket) =>
            String(getTicketOwnerEmail(ticket) || "").trim().toLowerCase() === ownerEmail
        );
      }

      if (filter === "favorites") {
        rows = rows.filter((ticket) => favoriteKeys.includes(ticket.ticket_key));
      }

      if (filter === "mentions") {
        const mentionTicketKeys = new Set(
          notifications
            .filter((notification) => String(notification.notification_type || "").toLowerCase() === "mention")
            .map((notification) => notification.ticket_key)
            .filter(Boolean)
        );
        rows = rows.filter((ticket) => mentionTicketKeys.has(ticket.ticket_key));
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

      if (filter === "duetoday") rows = rows.filter(t => !HUB_CLOSED(t) && hubSameDay(t.due_date, new Date()));
      if (filter === "highpriority") rows = rows.filter(t => !HUB_CLOSED(t) && String(t.priority).toLowerCase() === "high");
      return rows;
    }, [
      tickets,
      filter,
      brandFilter,
      departmentFilter,
      assigneeFilter,
      favoriteKeys,
      notifications,
      search,
      session,
    ]);

  // Preserve a user's selection while visible; never open another ticket
  // automatically when a closure or filter change removes it from the list.
  useEffect(() => {
    setSelectedKey(current => current && filteredTickets.some(ticket =>
      ticket.ticket_key === current) ? current : null);
  }, [filteredTickets]);

  // ====================================================
  // The Team Member filter is intentionally limited to the CSG marketing
  // team. Do not populate it from every Zoho agent, because that would expose
  // support, operations, sales, and other non-marketing users in the Hub.
  const teamMemberOptions = useMemo(() => {
    const currentUserEmail = String(session?.user?.email || "").trim().toLowerCase();

    return CODEWIZ_TICKET_OWNERS
      .map((person) => ({
        email: String(person.email || "").trim().toLowerCase(),
        name: String(person.name || person.email || "").trim(),
      }))
      .filter((person) => person.email && person.name && person.email !== currentUserEmail)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [session?.user?.email]);

  useEffect(() => {
    if (
      assigneeFilter !== "all" &&
      assigneeFilter !== "mine" &&
      !teamMemberOptions.some((member) => member.email === assigneeFilter)
    ) {
      setAssigneeFilter("all");
    }
  }, [assigneeFilter, teamMemberOptions]);

  // Classic view assignment options are loaded once so the owner avatar can
  // act as a quick assignment control without opening the ticket.
  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    async function loadClassicAgents() {
      const { data, error } = await supabase
        .from("zoho_agents")
        .select("zoho_agent_id, zuid, name, email, active, source")
        .order("name", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("Classic agent load error:", error);
        setClassicAgentOptions([]);
        return;
      }

      setClassicAgentOptions(
        (data || []).filter((agent) => agent.active !== false)
      );
    }

    loadClassicAgents();

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function updateListTicketStatus(ticket, status) {
    if (!ticket || statusEditBusy || !status || status === ticket.status) {
      setStatusEditKey(null);
      return;
    }

    setStatusEditBusy(true);

    try {
      const { data, error } = await supabase
        .functions
        .invoke("update-zoho-ticket", {
          body: {
            ticket_key: ticket.ticket_key,
            changes: {
              status,
            },
          },
        });

      if (error || !data?.success) {
        throw new Error(
          data?.error || error?.message || "Could not update the ticket status."
        );
      }

      hubCompletionEvent(ticket, status);
      await loadTickets(ticket.ticket_key);
      setStatusEditKey(null);

      // Classic and Board are list-first views. Do not leave a hidden
      // ticket selected after changing its status from either view.
      if (ticketViewMode === "classic" || ticketViewMode === "board") {
        setSelectedKey(null);
      }
    } catch (error) {
      console.error("Ticket status update error:", error);
    } finally {
      setStatusEditBusy(false);
    }
  }

  async function assignClassicTicket(ticket, owner) {
    if (!ticket || classicAssignmentBusy) return;

    setClassicAssignmentBusy(true);

    try {
      const changes =
        ticket.source === "Code Wiz"
          ? { codewizAgentName: owner?.name || null }
          : { assigneeId: owner?.zoho_agent_id || null };

      const { data, error } = await supabase
        .functions
        .invoke("update-zoho-ticket", {
          body: {
            ticket_key: ticket.ticket_key,
            changes,
          },
        });

      if (error || !data?.success) {
        throw new Error(
          data?.error || error?.message || "Could not assign the ticket."
        );
      }

      // In-app only. Zoho owns assignment emails.
      if (owner?.email) {
        const { error: notificationError } = await supabase.rpc("hub_notify_assignment", {
          p_ticket_key: ticket.ticket_key, p_recipient: owner.email,
        });
        if (notificationError) console.error("In-app assignment notification failed:", notificationError.message);
      }

      await loadTickets(ticket.ticket_key);
      await loadNotifications();
      setClassicAssignmentKey(null);

      // Classic view is intentionally list-only; never leave a hidden
      // selected ticket behind after an assignment.
      if (ticketViewMode === "classic") {
        setSelectedKey(null);
      }
    } catch (error) {
      console.error("Classic ticket assignment error:", error);
    } finally {
      setClassicAssignmentBusy(false);
    }
  }

  const favoriteCount = favoriteKeys.length;

  const mentionNotifications = useMemo(() => {
    const currentEmail = String(session?.user?.email || "").trim().toLowerCase();
    return notifications.filter((notification) =>
      String(notification.notification_type || "").trim().toLowerCase() === "mention" &&
      (!notification.recipient_email || String(notification.recipient_email).trim().toLowerCase() === currentEmail)
    );
  }, [notifications, session?.user?.email]);

  const unreadMentionCount = mentionNotifications.filter((notification) => !notification.is_read).length;

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

      const myTickets = countTickets.filter(ticket => userEmail &&
        getTicketOwnerEmail(ticket) === userEmail && ticket.status !== "Closed" &&
        (brandFilter !== "Tutor Doctor" || departmentFilter === "all" ||
          String(ticket.department || "").trim() === departmentFilter));

      // The Team Member selector scopes every sidebar count, not just the
      // ticket list. "Mine" means the signed-in user; a named member means
      // that member. When viewing everyone, counts remain combined.
      const selectedOwnerEmail =
        assigneeFilter === "all"
          ? ""
          : assigneeFilter === "mine"
            ? userEmail
            : String(assigneeFilter).trim().toLowerCase();

      if (selectedOwnerEmail) {
        countTickets = countTickets.filter(
          (ticket) =>
            String(getTicketOwnerEmail(ticket) || "").trim().toLowerCase() === selectedOwnerEmail
        );
      }

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

        mine: myTickets.length,

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
          selectedOwnerEmail
            ? 0
            : countTickets.filter(
                (ticket) =>
                  isTicketUnassigned(ticket) &&
                  ticket.status !== "Closed"
              ).length,
      };
    }, [
      tickets,
      session,
      brandFilter,
      departmentFilter,
      assigneeFilter,
    ]);

  const dashboardScopedTickets = useMemo(() => {
    const visible = tickets.filter(isVisibleMarketingTicket);
    const ownerEmail =
      assigneeFilter === "all"
        ? ""
        : assigneeFilter === "mine"
          ? String(session?.user?.email || "").trim().toLowerCase()
          : String(assigneeFilter || "").trim().toLowerCase();

    return ownerEmail
      ? visible.filter(
          (ticket) =>
            String(getTicketOwnerEmail(ticket) || "").trim().toLowerCase() === ownerEmail
        )
      : visible;
  }, [tickets, assigneeFilter, session?.user?.email]);

  async function deleteSelectedTicket() {
    if (!selected || deleteBusy) return;
    const ticket = selected;
    if (!window.confirm(`Move ticket #${ticket.ticket_number} to Zoho's Recycle Bin and remove it from the Hub?`)) return;
    setDeleteBusy(true); setDeleteNotice("");
    try {
      const {data,error}=await supabase.functions.invoke("delete-zoho-ticket",{body:{ticket_key:ticket.ticket_key,confirm:true}});
      if(error || !data?.success) throw new Error(data?.error || error?.message || "Deletion failed. Check the function logs.");
      setTickets(current=>current.filter(t=>t.ticket_key!==ticket.ticket_key));setSelectedKey(null);
      await loadTickets();
    } catch(error) { setDeleteNotice(error.message); }
    finally { setDeleteBusy(false); }
  }

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

  if (!session || passwordSetupRequired) {
    return (
      <Login
        passwordSetupRequired={passwordSetupRequired}
        onSignedIn={(nextSession) => {
          rememberPasswordSetup(false);
          const url = new URL(window.location.href);
          url.searchParams.delete("hub_auth");
          if (["recovery", "invite"].includes(url.searchParams.get("type"))) url.searchParams.delete("type");
          if (new URLSearchParams(url.hash.slice(1)).has("access_token")) url.hash = "";
          window.history.replaceState({}, "", url.pathname + url.search + url.hash);
          setPasswordSetupRequired(false);
          setSession(nextSession);
        }}
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
          <TicketEmailBody html={thread.content_html} />
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
    <div className={`app-shell ${selected && !showDashboard && !opsPage ? `ticket-reading-mode ${ticketDetailsOpen ? "ticket-details-open" : ""}` : ""} ${showDashboard ? "dashboard-mode" : ""} ${ticketViewMode === "classic" && !showDashboard ? "classic-mode" : ""} ${ticketViewMode === "board" && !showDashboard ? "board-mode" : ""}`}>

      <CompletionCelebration session={session} />
      {showSignatures && <MySignatures session={session} signatures={signatures} ready={signatureReady} loadError={signatureError} onClose={()=>setShowSignatures(false)}
        onSaved={(brand,signature)=>setSignatures(current=>({...current,[brand]:signature}))} />}

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

        <HubTicketSearch session={session} isVisible={isVisibleMarketingTicket} onOpen={ticket => {
          setTickets(current => current.some(t => t.ticket_key === ticket.ticket_key) ? current : [...current, ticket]);
          setFilter(HUB_CLOSED(ticket) ? "closed" : "all"); setBrandFilter("all"); setDepartmentFilter("all"); setAssigneeFilter("all"); setSearch("");
          setTicketViewMode("compact"); setOpsPage(null); setShowDashboard(false); setShowNotifications(false); setShowReminders(false); setSelectedKey(ticket.ticket_key);
        }} />
        <div className="hub-dashboard-entry">
          <button type="button" className={`hub-dashboard-nav ${showDashboard && !opsPage ? "active" : ""}`}
            aria-current={showDashboard && !opsPage ? "page" : undefined}
            onClick={() => { setOpsPage(null); setShowDashboard(true); setShowNotifications(false); setShowReminders(false); }}>
            <span className="hub-dashboard-symbol"><HubNavIcon name="dashboard" /></span>
            <span className="hub-dashboard-copy"><strong>Dashboard</strong><small>Marketing overview</small></span>
            <span className="hub-dashboard-arrow" aria-hidden="true">›</span>
          </button>
        </div>

        <div className="sidebar-section hub-nav-section">
          <div className="sidebar-label">MY WORK</div>
          <button type="button" className={`nav-item ${opsPage === "My Week" ? "active" : ""}`} aria-current={opsPage === "My Week" ? "page" : undefined}
            onClick={() => { setOpsPage("My Week"); setShowDashboard(true); setShowNotifications(false); setShowReminders(false); }}>
            <span className="hub-nav-label"><HubNavIcon name="week" />My Week</span>
          </button>
          <button type="button" className={`nav-item ${filter === "mine" && !showDashboard ? "active" : ""}`}
            onClick={() => { setShowDashboard(false); setOpsPage(null); setFilter("mine"); setAssigneeFilter("all"); }}>
            <span className="hub-nav-label"><HubNavIcon name="tickets" />My Tickets</span><span className="nav-count">{counts.mine}</span>
          </button>
          <button type="button" className={`nav-item ${filter === "favorites" && !showDashboard ? "active" : ""}`}
            onClick={() => { setShowDashboard(false); setOpsPage(null); setFilter("favorites"); setAssigneeFilter("all"); }}>
            <span className="hub-nav-label"><HubNavIcon name="star" />Favorites</span><span className="nav-count">{favoriteCount}</span>
          </button>
          <button type="button" className={`nav-item ${filter === "mentions" && !showDashboard ? "active" : ""}`}
            onClick={() => { setShowDashboard(false); setOpsPage(null); setShowNotifications(false); setFilter("mentions"); setAssigneeFilter("all"); }}>
            <span className="hub-nav-label"><HubNavIcon name="mention" />Mentions</span><span className={`nav-count ${unreadMentionCount ? "hub-unread-count" : ""}`}>{unreadMentionCount}</span>
          </button>
          <button type="button" className={`nav-item ${showNotifications ? "active" : ""}`} aria-expanded={showNotifications}
            onClick={() => { setShowNotifications(current => !current); setShowReminders(false); }}>
            <span className="hub-nav-label"><HubNavIcon name="bell" />Notifications</span><span className={`nav-count ${unreadNotificationCount ? "hub-unread-count" : ""}`}>{unreadNotificationCount}</span>
          </button>
          <button type="button" className={`nav-item ${showReminders ? "active" : ""}`} aria-expanded={showReminders}
            onClick={() => { setShowReminders(current => !current); setShowNotifications(false); }}>
            <span className="hub-nav-label"><HubNavIcon name="clock" />Reminders</span><span className="nav-count">{activeReminderCount}</span>
          </button>
        </div>

        <div className="sidebar-section hub-nav-section">
          <div className="sidebar-label">PLANNING</div>
          {[["Calendar", "calendar"]].map(([page, icon]) => (
            <button type="button" key={page} className={`nav-item ${opsPage === page ? "active" : ""}`}
              aria-current={opsPage === page ? "page" : undefined}
              onClick={() => { setOpsPage(page); setShowDashboard(true); setShowNotifications(false); setShowReminders(false); }}>
              <span className="hub-nav-label"><HubNavIcon name={icon} />{page}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-section hub-nav-section">
          <div className="sidebar-label">TICKETS</div>
          {[
            ["all", "Active Tickets", counts.active, "tickets"],
            ...(assigneeFilter === "all" ? [["unassigned", "Unassigned", counts.unassigned, "unassigned"]] : []),
            ["overdue", "Overdue", counts.overdue, "clock"],
          ].map(([id, label, count, icon]) => (
            <button type="button" key={id} className={`nav-item ${filter === id && !showDashboard ? "active" : ""}`}
              onClick={() => { setShowDashboard(false); setOpsPage(null); setFilter(id); }}>
              <span className="hub-nav-label"><HubNavIcon name={icon} />{label}</span>
              <span className={`nav-count ${id === "overdue" && count ? "hub-overdue-count" : ""}`}>{count}</span>
            </button>
          ))}
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
                  filter === id && !showDashboard
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setShowDashboard(false); setOpsPage(null);
                  setFilter(id);
                }}
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
          <div className="sidebar-label">TEAM MEMBER</div>
          <select
            className="team-member-select"
            value={assigneeFilter}
            onChange={(event) => {
              const value = event.target.value;
              setShowDashboard(false); setOpsPage(null);
              setAssigneeFilter(value);
              if (value !== "all" && filter === "unassigned") {
                setFilter("all");
              }
            }}
          >
            <option value="all">View all combined</option>
            <option value="mine">Mine</option>
            {teamMemberOptions.map((member) => (
              <option key={member.email} value={member.email}>{member.name}</option>
            ))}
          </select>
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
                  setShowDashboard(false); setOpsPage(null);
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

        <HubSyncHealth session={session} />

        <button type="button" className="hub-my-signatures" onClick={()=>setShowSignatures(true)}>✍️ My Signatures</button>
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

      {showReminders && (
        <div
          style={{
            position: "fixed",
            left: "248px",
            top: "16px",
            width: "390px",
            maxHeight: "calc(100vh - 32px)",
            overflowY: "auto",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "14px",
            boxShadow: "0 18px 45px rgba(15, 23, 42, 0.18)",
            zIndex: 1001,
          }}
        >
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px",borderBottom:"1px solid #e5e7eb"}}>
            <div>
              <div style={{fontWeight:700,fontSize:"16px"}}>Reminders</div>
              <div style={{fontSize:"12px",color:"#6b7280",marginTop:"2px"}}>{activeReminderCount} active</div>
            </div>
            <button type="button" onClick={() => setShowReminders(false)} style={{border:0,background:"transparent",fontSize:"20px",cursor:"pointer",color:"#64748b"}}>×</button>
          </div>

          {selected && (
            <div style={{padding:"14px 16px",borderBottom:"1px solid #e5e7eb",background:"#f8fafc"}}>
              <div style={{fontSize:"11px",fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".04em"}}>Set reminder for</div>
              <div style={{fontSize:"13px",fontWeight:650,color:"#172033",marginTop:"4px"}}>#{selected.ticket_number} · {selected.subject || "Untitled ticket"}</div>
              <input type="datetime-local" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} style={{width:"100%",marginTop:"10px",padding:"9px",border:"1px solid #dbe3ec",borderRadius:"7px",boxSizing:"border-box"}} />
              <input type="text" placeholder="Optional note" value={reminderNote} onChange={(e) => setReminderNote(e.target.value)} style={{width:"100%",marginTop:"8px",padding:"9px",border:"1px solid #dbe3ec",borderRadius:"7px",boxSizing:"border-box"}} />
              <button type="button" onClick={createReminder} disabled={reminderBusy} className="primary-button" style={{marginTop:"8px",width:"100%"}}>{reminderBusy ? "Saving…" : "Set reminder"}</button>
              {reminderNotice && <div style={{fontSize:"12px",color:"#475569",marginTop:"8px"}}>{reminderNotice}</div>}
            </div>
          )}

          {reminders.length === 0 ? (
            <div style={{padding:"24px 18px",color:"#64748b",fontSize:"13px"}}>No active reminders.</div>
          ) : (
            reminders.map((reminder) => (
              <div key={reminder.id} style={{padding:"13px 16px",borderBottom:"1px solid #f1f5f9"}}>
                <button type="button" onClick={() => {setSelectedKey(reminder.ticket_key);setShowReminders(false);}} style={{display:"block",width:"100%",textAlign:"left",border:0,background:"transparent",padding:0,cursor:"pointer"}}>
                  <div style={{fontSize:"11px",fontWeight:700,color:"#64748b"}}>{reminder.source || "Ticket"} {reminder.ticket_number ? `#${reminder.ticket_number}` : ""}</div>
                  <div style={{fontSize:"13px",fontWeight:650,color:"#172033",marginTop:"4px"}}>{reminder.subject || "Untitled ticket"}</div>
                  <div style={{fontSize:"12px",color:"#2563eb",marginTop:"5px"}}>{reminder.reminder_at ? new Date(reminder.reminder_at).toLocaleString() : ""}</div>
                  {reminder.note && <div style={{fontSize:"12px",color:"#64748b",marginTop:"4px"}}>{reminder.note}</div>}
                </button>
                <button type="button" onClick={() => completeReminder(reminder)} style={{marginTop:"7px",border:0,background:"transparent",padding:0,color:"#64748b",fontSize:"11px",fontWeight:650,cursor:"pointer"}}>✓ Mark complete</button>
              </div>
            ))
          )}
        </div>
      )}

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
                Notifications
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

          <div className="notification-filter-tabs">
            <button type="button" className={notificationFilter === "all" ? "active" : ""} onClick={() => setNotificationFilter("all")}>All</button>
            <button type="button" className={notificationFilter === "mentions" ? "active" : ""} onClick={() => setNotificationFilter("mentions")}>@ Mentions</button>
            <button type="button" className={notificationFilter === "unread" ? "active" : ""} onClick={() => setNotificationFilter("unread")}>Unread</button>
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
              Loading notifications…
            </div>
          ) : notifications.filter((notification) => {
              if (notificationFilter === "mentions") return String(notification.notification_type || "").toLowerCase() === "mention";
              if (notificationFilter === "unread") return !notification.is_read;
              return true;
            }).length === 0 ? (
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
              No notifications yet.
            </div>
          ) : (
            notifications.filter((notification) => {
              if (notificationFilter === "mentions") return String(notification.notification_type || "").toLowerCase() === "mention";
              if (notificationFilter === "unread") return !notification.is_read;
              return true;
            }).map(
              (notification
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
                    {notification.notification_type === "assignment" ? "assigned this ticket to you" : "mentioned you"}
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
                        (
                          department
                        ) =>
                          department.value ===
                          departmentFilter
                      )?.label ||
                      departmentFilter
                    }`
                  : brandFilter}
            </h1>

            <p>
              {
                filteredTickets.length
              }{" "}
              ticket
              {filteredTickets.length ===
              1
                ? ""
                : "s"}{" "}
              in this view
            </p>
          </div>
        </div>

        <div className="ticket-list-toolbar">
          <div className="search-wrap">
            <input
              className="search-input"
              type="search"
              placeholder="Search tickets…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="ticket-view-switcher" aria-label="Ticket view">
            <span className="ticket-view-label">View</span>
            <button
              type="button"
              className={ticketViewMode === "compact" ? "active" : ""}
              onClick={() => setTicketViewMode("compact")}
            >
              Compact
            </button>
            <button
              type="button"
              className={ticketViewMode === "classic" ? "active" : ""}
              onClick={() => {
                setTicketViewMode("classic");
                setSelectedKey(null);
              }}
            >
              Classic
            </button>
            <button
              type="button"
              className={ticketViewMode === "board" ? "active" : ""}
              onClick={() => {
                setTicketViewMode("board");
                setSelectedKey(null);
              }}
            >
              Board
            </button>
          </div>
        </div>

        <div className={`ticket-list ${ticketViewMode === "classic" ? "ticket-list-classic" : ""}`}>

          {loadingTickets &&
            tickets.length ===
              0 && (
              <div className="empty-state">
                Loading tickets…
              </div>
            )}

          {!loadingTickets &&
            filteredTickets.length ===
              0 && (
              <div className="empty-state">
                No tickets match this view.
              </div>
            )}

          {ticketViewMode === "board" && filteredTickets.length > 0 && (
            <div className="ticket-board">
              {[
                { key: "Open", label: "Open" },
                { key: "Other Status", label: "Other Status", statuses: ["In Progress", "On Hold"] },
                { key: "Escalated", label: "Escalated" },
                { key: "Waiting", label: "Waiting" },
                ...(filter === "closed" ? [{ key: "Closed", label: "Closed", statuses: ["Closed"] }] : []),
              ].map((column) => {
                const columnTickets = filteredTickets.filter((ticket) =>
                  column.statuses
                    ? column.statuses.includes(ticket.status)
                    : ticket.status === column.key
                );
                return (
                  <section key={column.key} className={`ticket-board-column ${statusClass(column.key)}`}>
                    <header className="ticket-board-column-header">
                      <strong>{column.label}</strong>
                      <span>{columnTickets.length}</span>
                    </header>
                    <div className="ticket-board-column-body">
                      {columnTickets.length === 0 ? (
                        <div className="ticket-board-empty">No tickets in this queue</div>
                      ) : columnTickets.map((ticket) => {
                        const ownerName = getTicketOwnerName(ticket) || "Unassigned";
                        const initials = ownerName === "Unassigned" ? "—" : ownerName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
                        const isFavorite = favoriteKeys.includes(ticket.ticket_key);
                        return (
                          <article
                            key={ticket.ticket_key}
                            className={`ticket-board-card ${brandClass(ticket.source)}`}
                            onClick={() => {
                              // Board is full-width until a ticket is intentionally opened.
                              setTicketViewMode("compact");
                              setSelectedKey(ticket.ticket_key);
                            }}
                          >
                            <div className="ticket-board-card-top">
                              <div className="ticket-board-card-subject">{ticket.subject || "Untitled ticket"}</div>
                              <button
                                type="button"
                                className={`ticket-board-owner ${classicAssignmentKey === ticket.ticket_key ? "active" : ""}`}
                                title="Change ticket owner"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setClassicAssignmentKey((current) => current === ticket.ticket_key ? null : ticket.ticket_key);
                                  setStatusEditKey(null);
                                }}
                              >
                                {initials}
                              </button>
                            </div>
                            <div className="ticket-board-card-meta">
                              <span>#{ticket.ticket_number || "—"}</span>
                              <span>·</span>
                              <span>{ticket.contact_name || ticket.contact_email || "Unknown requester"}</span>
                            </div>
                            <div className="ticket-board-card-date">{formatDateTime(ticket.updated_at || ticket.created_at)}</div>
                            <div className="ticket-board-card-footer">
                              <div className="list-status-control">
                                <button
                                  type="button"
                                  className={`list-status-trigger ${statusEditKey === ticket.ticket_key ? "active" : ""}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setStatusEditKey((current) => current === ticket.ticket_key ? null : ticket.ticket_key);
                                    setClassicAssignmentKey(null);
                                  }}
                                  title="Change ticket status"
                                >
                                  <StatusBadge status={ticket.status} />
                                  <span className="list-status-chevron">⌄</span>
                                </button>
                                {statusEditKey === ticket.ticket_key && (
                                  <div className="list-status-menu" onClick={(event) => event.stopPropagation()}>
                                    <div className="list-status-menu-title">Change status</div>
                                    {(BRAND_STATUSES[ticket.source] || ["Open", "On Hold", "Closed"]).map((status) => (
                                      <button
                                        key={status}
                                        type="button"
                                        className={`list-status-option ${ticket.status === status ? "selected" : ""}`}
                                        disabled={statusEditBusy}
                                        onClick={() => updateListTicketStatus(ticket, status)}
                                      >
                                        <StatusBadge status={status} />
                                        {ticket.status === status && <span>✓</span>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className="ticket-board-activity">☰ {ticket.comment_count || ticket.thread_count || 0}</span>
                              <button type="button" className={`ticket-board-star ${isFavorite ? "active" : ""}`} onClick={(event) => { event.stopPropagation(); toggleFavorite(ticket.ticket_key); }}>{isFavorite ? "★" : "☆"}</button>
                            </div>
                            <div className="ticket-board-assignee">
                              <span>Assigned</span>
                              <strong>{ownerName}</strong>
                            </div>
                            {classicAssignmentKey === ticket.ticket_key && (
                              <div className="classic-assignment-menu board-assignment-menu" onClick={(event) => event.stopPropagation()}>
                                <div className="classic-assignment-title">Assign ticket</div>
                                <button type="button" className={`classic-assignment-option ${isTicketUnassigned(ticket) ? "selected" : ""}`} disabled={classicAssignmentBusy} onClick={() => assignClassicTicket(ticket, null)}>
                                  <span className="classic-assignment-avatar">—</span>
                                  <span><strong>Unassigned</strong><small>Remove current owner</small></span>
                                </button>
                                {(ticket.source === "Code Wiz" ? CODEWIZ_TICKET_OWNERS : classicAgentOptions.filter((agent) => agent.source === ticket.source)).map((person) => {
                                  const personEmail = String(person.email || "").trim().toLowerCase();
                                  const currentEmail = String(getTicketOwnerEmail(ticket) || "").trim().toLowerCase();
                                  const currentName = String(getTicketOwnerName(ticket) || "").trim().toLowerCase();
                                  const selectedOwner = ticket.source === "Code Wiz" ? currentName === String(person.name || "").trim().toLowerCase() : currentEmail === personEmail;
                                  return (
                                    <button key={person.zoho_agent_id || person.email} type="button" className={`classic-assignment-option ${selectedOwner ? "selected" : ""}`} disabled={classicAssignmentBusy} onClick={() => assignClassicTicket(ticket, person)}>
                                      <span className="classic-assignment-avatar">{String(person.name || person.email || "?").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                                      <span><strong>{person.name || person.email}</strong><small>{person.email || ""}</small></span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {ticketViewMode === "classic" && filteredTickets.length > 0 && (
            <div className="classic-ticket-header" aria-hidden="true">
              <span></span>
              <span></span>
              <span>SUBJECT / REQUESTER</span>
              <span>STATUS</span>
              <span>ACTIVITY</span>
              <span></span>
              <span>FAVORITE</span>
              <span>ASSIGNED TO</span>
            </div>
          )}

          {filteredTickets.map((ticket) => {
            const isSelected = selectedKey === ticket.ticket_key;
            const isFavorite = favoriteKeys.includes(ticket.ticket_key);
            const ownerName = getTicketOwnerName(ticket) || "Unassigned";
            const initials = ownerName === "Unassigned" ? "—" : ownerName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

            if (ticketViewMode === "board") {
              return null;
            }

            if (ticketViewMode === "classic") {
              return (
                <div
                  key={ticket.ticket_key}
                  className={`ticket-row-classic ${brandClass(ticket.source)}`}
                  onClick={() => {
                    // Classic is list-first, but clicking a ticket should still
                    // open the normal ticket workspace.
                    setTicketViewMode("compact");
                    setSelectedKey(ticket.ticket_key);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setTicketViewMode("compact");
                      setSelectedKey(ticket.ticket_key);
                    }
                  }}
                >
                  <div className="classic-ticket-check">
                    <input type="checkbox" onClick={(event) => event.stopPropagation()} aria-label={`Select ticket ${ticket.ticket_number || ""}`} />
                  </div>
                  <div className="classic-ticket-icon">✉</div>
                  <div className="classic-ticket-main">
                    <div className="classic-ticket-subject">{ticket.subject || "Untitled ticket"}</div>
                    <div className="classic-ticket-meta">
                      <span>#{ticket.ticket_number || "—"}</span>
                      <span>·</span>
                      <BrandBadge source={ticket.source} />
                      <span>·</span>
                      <span>{ticket.contact_name || ticket.contact_email || "Unknown requester"}</span>
                      <span>·</span>
                      <span>{formatDateTime(ticket.updated_at || ticket.created_at)}</span>
                    </div>
                  </div>
                  <div className="classic-ticket-status">
                    <div className="list-status-control">
                      <button
                        type="button"
                        className={`list-status-trigger ${statusEditKey === ticket.ticket_key ? "active" : ""}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setStatusEditKey((current) => current === ticket.ticket_key ? null : ticket.ticket_key);
                          setClassicAssignmentKey(null);
                        }}
                        title="Change ticket status"
                      >
                        <StatusBadge status={ticket.status} />
                        <span className="list-status-chevron">⌄</span>
                      </button>
                      {statusEditKey === ticket.ticket_key && (
                        <div className="list-status-menu" onClick={(event) => event.stopPropagation()}>
                          <div className="list-status-menu-title">Change status</div>
                          {(BRAND_STATUSES[ticket.source] || ["Open", "On Hold", "Closed"]).map((status) => (
                            <button
                              key={status}
                              type="button"
                              className={`list-status-option ${ticket.status === status ? "selected" : ""}`}
                              disabled={statusEditBusy}
                              onClick={() => updateListTicketStatus(ticket, status)}
                            >
                              <StatusBadge status={status} />
                              {ticket.status === status && <span>✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="classic-ticket-activity">
                    <span title="Comments">☰</span>
                    <span>{ticket.comment_count || ticket.thread_count || ""}</span>
                  </div>
                  <div className="classic-ticket-comment">💬</div>
                  <button
                    type="button"
                    className={`classic-ticket-star ${isFavorite ? "active" : ""}`}
                    onClick={(event) => { event.stopPropagation(); toggleFavorite(ticket.ticket_key); }}
                    title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    {isFavorite ? "★" : "☆"}
                  </button>
                  <div className="classic-ticket-owner-wrap">
                    <button
                      type="button"
                      className={`classic-ticket-owner ${classicAssignmentKey === ticket.ticket_key ? "active" : ""}`}
                      title="Change ticket owner"
                      aria-label={`Change owner for ticket ${ticket.ticket_number || ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setClassicAssignmentKey((current) =>
                          current === ticket.ticket_key ? null : ticket.ticket_key
                        );
                        setStatusEditKey(null);
                      }}
                    >
                      <span className="classic-ticket-owner-avatar">{initials}</span>
                      <span className="classic-ticket-owner-name">{ownerName}</span>
                    </button>

                    {classicAssignmentKey === ticket.ticket_key && (
                      <div
                        className="classic-assignment-menu"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="classic-assignment-title">Assign ticket</div>
                        <button
                            type="button"
                            className={`classic-assignment-option ${isTicketUnassigned(ticket) ? "selected" : ""}`}
                            disabled={classicAssignmentBusy}
                            onClick={() => assignClassicTicket(ticket, null)}
                          >
                            <span className="classic-assignment-avatar">—</span>
                            <span><strong>Unassigned</strong><small>Remove current owner</small></span>
                        </button>
                        {(ticket.source === "Code Wiz"
                          ? CODEWIZ_TICKET_OWNERS
                          : classicAgentOptions.filter((agent) => agent.source === ticket.source))
                          .map((person) => {
                            const personEmail = String(person.email || "").trim().toLowerCase();
                            const currentEmail = String(getTicketOwnerEmail(ticket) || "").trim().toLowerCase();
                            const currentName = String(getTicketOwnerName(ticket) || "").trim().toLowerCase();
                            const selectedOwner =
                              ticket.source === "Code Wiz"
                                ? currentName === String(person.name || "").trim().toLowerCase()
                                : currentEmail === personEmail;
                            return (
                              <button
                                key={person.zoho_agent_id || person.email}
                                type="button"
                                className={`classic-assignment-option ${selectedOwner ? "selected" : ""}`}
                                disabled={classicAssignmentBusy}
                                onClick={() => assignClassicTicket(ticket, person)}
                              >
                                <span className="classic-assignment-avatar">{String(person.name || person.email || "?").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                                <span><strong>{person.name || person.email}</strong><small>{person.email || ""}</small></span>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <button
                key={ticket.ticket_key}
                className={`ticket-row ${brandClass(ticket.source)} ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedKey(ticket.ticket_key)}
              >
                <div className="ticket-row-top">
                  <BrandBadge source={ticket.source} />
                  <span className="ticket-number">#{ticket.ticket_number}</span>
                </div>
                <div className="ticket-subject">{ticket.subject || "Untitled ticket"}</div>
                <div className="ticket-summary">{getTicketSummary(ticket) || "No preview available"}</div>
                <div className="ticket-requester">{ticket.contact_name || ticket.contact_email || "Unknown requester"}</div>
                <div className="ticket-row-bottom">
                  <div className="list-status-control compact-status-control">
                    <button
                      type="button"
                      className={`list-status-trigger ${statusEditKey === ticket.ticket_key ? "active" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setStatusEditKey((current) => current === ticket.ticket_key ? null : ticket.ticket_key);
                        setClassicAssignmentKey(null);
                      }}
                      title="Change ticket status"
                    >
                      <StatusBadge status={ticket.status} />
                      <span className="list-status-chevron">⌄</span>
                    </button>
                    {statusEditKey === ticket.ticket_key && (
                      <div className="list-status-menu compact-status-menu" onClick={(event) => event.stopPropagation()}>
                        <div className="list-status-menu-title">Change status</div>
                        {(BRAND_STATUSES[ticket.source] || ["Open", "On Hold", "Closed"]).map((status) => (
                          <button
                            key={status}
                            type="button"
                            className={`list-status-option ${ticket.status === status ? "selected" : ""}`}
                            disabled={statusEditBusy}
                            onClick={() => updateListTicketStatus(ticket, status)}
                          >
                            <StatusBadge status={status} />
                            {ticket.status === status && <span>✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="ticket-assignee">{ownerName}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

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

        {opsPage ? (
          <HubOperations page={opsPage} tickets={tickets.filter(isVisibleMarketingTicket)} session={session}
            filters={{filter, brandFilter, departmentFilter, assigneeFilter, search, ticketViewMode}}
            onView={v => { setFilter(v.filter || "all"); setBrandFilter(v.brandFilter || "all"); setDepartmentFilter(v.departmentFilter || "all"); setAssigneeFilter(v.assigneeFilter || "all"); setSearch(v.search || ""); setTicketViewMode(v.ticketViewMode || "compact"); setOpsPage(null); setShowDashboard(false); }}
            onOpen={t => { setTickets(current => current.some(row => row.ticket_key === t.ticket_key) ? current : [...current, t]); setBrandFilter("all"); setDepartmentFilter("all"); setAssigneeFilter("all"); setSearch(""); setFilter(t.status === "Closed" ? "closed" : "all"); setTicketViewMode("compact"); setSelectedKey(t.ticket_key); setOpsPage(null); setShowDashboard(false); }}
            onDue={async (t, due) => { const {data,error} = await supabase.functions.invoke("update-zoho-ticket", {body:{ticket_key:t.ticket_key,changes:{dueDate:due}}}); if(error || !data?.success) throw new Error(data?.error || error?.message || "Due date update failed"); await loadTickets(); }} />
        ) : showDashboard ? (
          <MarketingDashboard tickets={tickets.filter(isVisibleMarketingTicket)} session={session}
            onOpen={t => { setTickets(current => current.some(row => row.ticket_key === t.ticket_key) ? current : [...current, t]); setBrandFilter("all"); setDepartmentFilter("all"); setAssigneeFilter("all"); setSearch(""); setFilter(t.status === "Closed" ? "closed" : "all"); setTicketViewMode("compact"); setSelectedKey(t.ticket_key); setOpsPage(null); setShowDashboard(false); }}
            onNavigate={page => { setOpsPage(page); setShowDashboard(true); setShowNotifications(false); setShowReminders(false); }}
            onFind={() => document.dispatchEvent(new KeyboardEvent("keydown", {key:"k", ctrlKey:true, bubbles:true}))} />
        ) : !selected ? (
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

            <div className="hub-ticket-reading-bar">
              <button type="button" onClick={returnToTicketList}>← Back to tickets</button>
              <div><button type="button" onClick={()=>{const editor=document.getElementById("hub-internal-comment-editor");if(editor){editor.open=true;editor.scrollIntoView({behavior:"smooth",block:"start"});commentInputRef.current?.focus({preventScroll:true});}}}>Add comment</button><button type="button" className="hub-details-toggle" onClick={()=>setTicketDetailsOpen(value=>!value)} aria-expanded={ticketDetailsOpen}>Ticket details</button><button type="button" className="hub-primary-reply" onClick={()=>configureComposer("reply")}>Reply</button><button type="button" onClick={()=>configureComposer("reply_all")}>Reply All</button><button type="button" onClick={()=>configureComposer("forward")}>Forward</button></div>
            </div>
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

              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <button type="button" className="hub-delete-ticket" disabled={deleteBusy} onClick={deleteSelectedTicket}>{deleteBusy?"Deleting…":"Delete ticket"}</button>
                <button type="button" onClick={() => openReminderForTicket(selected)} style={{border:"1px solid #dbe3ec",background:"#fff",color:"#334155",borderRadius:"7px",padding:"8px 10px",fontSize:"11px",fontWeight:650,cursor:"pointer"}}>⏰ Remind me</button>
                <button type="button" onClick={() => toggleFavorite(selected.ticket_key)} aria-label={favoriteKeys.includes(selected.ticket_key) ? "Remove from favorites" : "Add to favorites"} title={favoriteKeys.includes(selected.ticket_key) ? "Remove from favorites" : "Add to favorites"} className="favorite-button">{favoriteKeys.includes(selected.ticket_key) ? "★" : "☆"}</button>
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
              </div>
            </header>

            {deleteNotice && <p className="hub-delete-error" role="alert">{deleteNotice}</p>}

            {/* REPLY COMPOSER */}

            <div
              ref={
                composerRef
              }
              className="composer-area"
              hidden={!composerOpen}
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
                <button type="button" className="hub-cancel-reply" disabled={composerBusy} onClick={()=>setComposerOpen(false)}>Cancel · keep draft</button>
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
                  <button type="button" disabled={composerBusy || !signatureReady} onMouseDown={event=>{event.preventDefault();insertBrandSignature();}}>✍️ Insert signature</button>

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

            <details className="hub-internal-notes" id="hub-internal-comment-editor"><summary>Add an internal note</summary>
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

            </details>

            {/* UNIFIED TIMELINE */}

            <section className="timeline-section">

              <div className="conversation-section-heading">

                <div>
                  <h3>
                    Conversation
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

                    <TicketEmailBody html={selected.description} />
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

      {ticketDetailsOpen && selected && !showDashboard && !opsPage && <button className="hub-details-overlay" aria-label="Close ticket details" onClick={()=>setTicketDetailsOpen(false)} />}
      <aside className="details-column">
        {selected && !showDashboard && !opsPage && <button type="button" className="hub-close-details" onClick={()=>setTicketDetailsOpen(false)}>Close details ✕</button>}

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
                              <div className="tag-suggestions-header">
                                <span>Tags</span>
                                <button
                                  type="button"
                                  className="tag-suggestions-close"
                                  onClick={() =>
                                    setShowTagSuggestions(false)
                                  }
                                  aria-label="Close tag list"
                                >
                                  ×
                                </button>
                              </div>

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

              <TicketOperations key={selected.ticket_key} ticket={selected} tickets={tickets.filter(isVisibleMarketingTicket)} session={session} threads={threads} comments={comments}
                onOpen={t => { setFilter(t.status === "Closed" ? "closed" : "all"); setBrandFilter("all"); setAssigneeFilter("all"); setDepartmentFilter("all"); setSearch(""); setTicketViewMode("compact"); setSelectedKey(t.ticket_key); }}
                onDue={async due => { const {data,error} = await supabase.functions.invoke("update-zoho-ticket", {body:{ticket_key:selected.ticket_key,changes:{dueDate:due}}}); if(error || !data?.success) throw new Error(data?.error || error?.message || "Due date update failed"); await loadTickets(selected.ticket_key); }} />
              <TicketKudos key={`kudos-${selected.ticket_key}`} ticket={selected} session={session} people={teamMemberOptions} />

              <Detail label="Due date">

                <input
                  className="detail-control"
                  type="datetime-local"
                  value={hubLocalInput(selected.due_date)}
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
    </div>
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
