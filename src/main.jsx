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
}) {
  return (
    <span
      className={`brand-badge ${brandClass(
        source
      )}`}
    >
      {source ||
        "Unknown"}
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

function Login({
  onSignedIn,
}) {
  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  async function signIn(
    event
  ) {
    event.preventDefault();

    if (
      !email.trim()
    ) {
      return;
    }

    setBusy(true);
    setMessage("");

    const {
      error,
    } =
      await supabase.auth.signInWithOtp(
        {
          email:
            email.trim(),

          options: {
            emailRedirectTo:
              window.location.origin,
          },
        }
      );

    if (error) {
      setMessage(
        error.message
      );
    } else {
      setMessage(
        "Check your email for the sign-in link."
      );
    }

    setBusy(false);
  }

  useEffect(() => {
    const {
      data:
        listener,
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          nextSession
        ) => {
          if (
            nextSession &&
            (
              event ===
                "SIGNED_IN" ||
              event ===
                "INITIAL_SESSION"
            )
          ) {
            onSignedIn(
              nextSession
            );
          }
        }
      );

    return () => {
      listener
        .subscription
        .unsubscribe();
    };
  }, [
    onSignedIn,
  ]);

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="login-logo">
          <span className="login-logo-mountain">
            ▲
          </span>

          <span>
            CSG
          </span>
        </div>

        <h1>
          Marketing Ticket Hub
        </h1>

        <p>
          One workspace for Qualicare,
          Tutor Doctor and Code Wiz.
        </p>

        <form
          onSubmit={
            signIn
          }
        >
          <label>
            Work email
          </label>

          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(
              event
            ) =>
              setEmail(
                event
                  .target
                  .value
              )
            }
          />

          <button
            type="submit"
            className="primary-button"
            disabled={
              busy
            }
          >
            {busy
              ? "Sending…"
              : "Sign in with email"}
          </button>

          {message && (
            <div className="login-message">
              {message}
            </div>
          )}
        </form>
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
        let detail =
          data?.error ||
          error?.message ||
          "Could not send the message.";

        // Supabase's FunctionsHttpError intentionally exposes only a
        // generic message. The actual Edge Function response is available
        // on error.context, so surface it here for actionable diagnostics.
        try {
          const response =
            error?.context ||
            error?.response;

          if (response) {
            const status =
              response.status;

            let body = null;

            if (typeof response.clone === "function") {
              const cloned =
                response.clone();

              const contentType =
                cloned.headers?.get(
                  "content-type"
                ) ||
                "";

              if (contentType.includes("application/json")) {
                body = await cloned.json();
              } else {
                body = await cloned.text();
              }
            }

            const serverMessage =
              typeof body === "string"
                ? body
                : body?.error ||
                  body?.message ||
                  body?.detail ||
                  body?.error_description ||
                  body?.raw ||
                  "";

            if (serverMessage) {
              detail = `HTTP ${status || "?"}: ${serverMessage}`;
            } else if (status) {
              detail = `HTTP ${status}: ${detail}`;
            }

            const errorCode =
              response.headers?.get(
                "sb-error-code"
              );

            if (errorCode) {
              detail += ` [Supabase: ${errorCode}]`;
            }
          }
        } catch (diagnosticError) {
          console.error(
            "Could not read Edge Function error response:",
            diagnosticError
          );
        }

        console.error(
          "reply-to-zoho-ticket failed:",
          {
            error,
            data,
            detail,
          }
        );

        throw new Error(
          detail
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

      return agents
        .filter(
          (
            agent
          ) =>
            agent.zuid
        )
        .filter(
          (
            agent
          ) => {
            if (!needle) {
              return true;
            }

            return `${agent.name || ""} ${agent.email || ""}`
              .toLowerCase()
              .includes(
                needle
              );
          }
        )
        .slice(
          0,
          8
        );
    }, [
      agents,
      mentionQuery,
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
      "Agent";

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
        if (
          current.some(
            (
              item
            ) =>
              item.zoho_agent_id ===
              agent.zoho_agent_id
          )
        ) {
          return current;
        }

        return [
          ...current,
          {
            zoho_agent_id:
              agent.zoho_agent_id,

            name:
              display,

            email:
              agent.email,

            zuid:
              agent.zuid,
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

        transformed =
          transformed
            .split(
              visible
            )
            .join(
              `[[MENTION:${mention.zoho_agent_id}]]`
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
                      zoho_agent_id:
                        mention.zoho_agent_id,
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

  const filteredTickets =
    useMemo(() => {
      let rows =
        [...tickets];

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
      search,
      session,
    ]);

  /*
    Keep selected ticket aligned with
    CURRENT filtered list.
  */
  useEffect(() => {
    if (
      filteredTickets.length ===
      0
    ) {
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

      const countTickets =
        brandFilter ===
        "all"
          ? tickets
          : tickets.filter(
              (
                ticket
              ) =>
                ticket.source ===
                brandFilter
            );

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

        <div className="sidebar-section">

          <div className="sidebar-label">
            MY WORK
          </div>

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
                  setFilter(id)
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
                  setFilter(id)
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

      {/* TICKETS */}

      <section className="ticket-column">

        <div className="ticket-column-header">

          <div>
            <h1>
              {brandFilter ===
              "all"
                ? "Tickets"
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

        <div className="search-wrap">

          <input
            className="search-input"
            type="search"
            placeholder="Search tickets…"
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event
                  .target
                  .value
              )
            }
          />
        </div>

        <div className="ticket-list">

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

          {filteredTickets.map(
            (
              ticket
            ) => (
              <button
                key={
                  ticket.ticket_key
                }
                className={`ticket-row ${brandClass(
                  ticket.source
                )} ${
                  selectedKey ===
                  ticket.ticket_key
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setSelectedKey(
                    ticket.ticket_key
                  )
                }
              >
                <div className="ticket-row-top">

                  <BrandBadge
                    source={
                      ticket.source
                    }
                  />

                  <span className="ticket-number">
                    #
                    {
                      ticket.ticket_number
                    }
                  </span>
                </div>

                <div className="ticket-subject">
                  {ticket.subject ||
                    "Untitled ticket"}
                </div>

                <div className="ticket-summary">
                  {getTicketSummary(
                    ticket
                  ) ||
                    "No preview available"}
                </div>

                <div className="ticket-requester">
                  {ticket.contact_name ||
                    ticket.contact_email ||
                    "Unknown requester"}
                </div>

                <div className="ticket-row-bottom">

                  <StatusBadge
                    status={
                      ticket.status
                    }
                  />

                  <span className="ticket-assignee">
                    {getTicketOwnerName(
                      ticket
                    ) ||
                      "Unassigned"}
                  </span>
                </div>
              </button>
            )
          )}
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
                    placeholder="Add a comment… Type @ to mention an agent."
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
                                agent.zoho_agent_id
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
                            mention.zoho_agent_id
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
                                      item.zoho_agent_id !==
                                      mention.zoho_agent_id
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
