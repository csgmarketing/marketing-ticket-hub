import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import ReactDOM from "react-dom/client";

import {
  createClient,
} from "@supabase/supabase-js";

import "./styles.css";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ======================================================
// BRAND STATUS CONFIG
// ======================================================

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

// ======================================================
// HELPERS
// ======================================================

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

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

  const date = new Date(value);

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
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}

function dateInputValue(value) {
  if (!value) return "";

  const date = new Date(value);

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
    ticket.status === "Closed"
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

function brandClass(source) {
  switch (source) {
    case "Qualicare":
      return "brand-qualicare";

    case "Tutor Doctor":
      return "brand-tutordoctor";

    case "Code Wiz":
      return "brand-codewiz";

    default:
      return "";
  }
}

function statusClass(status) {
  const value =
    String(
      status || ""
    )
      .toLowerCase()
      .replaceAll(
        " ",
        "-"
      );

  return `status-${value}`;
}

function getTicketSummary(
  ticket
) {
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

// ======================================================
// LOGIN
// ======================================================

function Login({
  onSignedIn,
}) {
  const [email, setEmail] =
    useState("");

  const [busy, setBusy] =
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

    if (!email.trim()) {
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
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          session
        ) => {
          if (
            session &&
            (
              event ===
                "SIGNED_IN" ||
              event ===
                "INITIAL_SESSION"
            )
          ) {
            onSignedIn(
              session
            );
          }
        }
      );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [
    onSignedIn,
  ]);

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          CSG
        </div>

        <h1>
          Marketing Ticket
          Hub
        </h1>

        <p>
          Qualicare, Tutor
          Doctor and Code
          Wiz tickets in one
          place.
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
                event.target.value
              )
            }
          />

          <button
            type="submit"
            className="primary-button"
            disabled={busy}
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
    agents,
    setAgents,
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
    loadingAgents,
    setLoadingAgents,
  ] =
    useState(false);

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
    replyText,
    setReplyText,
  ] =
    useState("");

  const [
    replyBusy,
    setReplyBusy,
  ] =
    useState(false);

  const [
    replyNotice,
    setReplyNotice,
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
  // AUTH
  // ====================================================

  useEffect(() => {
    async function loadSession() {
      const {
        data,
      } =
        await supabase.auth.getSession();

      setSession(
        data.session
      );

      setAuthLoading(
        false
      );
    }

    loadSession();

    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
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
      listener.subscription.unsubscribe();
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
            .from("tickets")
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
      [session]
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
          (ticket) =>
            ticket.ticket_key ===
            selectedKey
        ) || null,
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
          setThreads(
            []
          );
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

          setThreads(
            []
          );
        } else {
          setThreads(
            data || []
          );
        }

        setLoadingThreads(
          false
        );
      },
      [session]
    );

  useEffect(() => {
    if (
      selectedKey
    ) {
      loadThreads(
        selectedKey
      );
    }
  }, [
    selectedKey,
    loadThreads,
  ]);

  // ====================================================
  // LOAD AGENTS FOR SELECTED BRAND
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
          setAgents(
            []
          );
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
              "zoho_agent_id, name, email, active, source"
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

          setAgents(
            []
          );
        } else {
          setAgents(
            data || []
          );
        }

        setLoadingAgents(
          false
        );
      },
      [session]
    );

  useEffect(() => {
    if (
      selected?.source
    ) {
      loadAgents(
        selected.source
      );
    } else {
      setAgents(
        []
      );
    }
  }, [
    selected?.source,
    loadAgents,
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
            schema:
              "public",
            table:
              "tickets",
          },
          () => {
            loadTickets();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "ticket_threads",
          },
          (
            payload
          ) => {
            const ticketKey =
              payload.new
                ?.ticket_key ||
              payload.old
                ?.ticket_key;

            if (
              ticketKey &&
              ticketKey ===
                selectedKey
            ) {
              loadThreads(
                selectedKey
              );
            }
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    session,
    selectedKey,
    loadTickets,
    loadThreads,
  ]);

  // ====================================================
  // FILTERS
  // ====================================================

  const filteredTickets =
    useMemo(() => {
      let rows = [
        ...tickets,
      ];

      if (
        brandFilter !==
        "all"
      ) {
        rows =
          rows.filter(
            (ticket) =>
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
            (ticket) =>
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
            (ticket) =>
              ticket.status ===
              "Open"
          );
      }

      if (
        filter ===
        "waiting"
      ) {
        rows =
          rows.filter(
            (ticket) =>
              ticket.status ===
              "Waiting"
          );
      }

      if (
        filter ===
        "onhold"
      ) {
        rows =
          rows.filter(
            (ticket) =>
              ticket.status ===
              "On Hold"
          );
      }

      if (
        filter ===
        "escalated"
      ) {
        rows =
          rows.filter(
            (ticket) =>
              ticket.status ===
              "Escalated"
          );
      }

      if (
        filter ===
        "inprogress"
      ) {
        rows =
          rows.filter(
            (ticket) =>
              ticket.status ===
              "In Progress"
          );
      }

      if (
        filter ===
        "closed"
      ) {
        rows =
          rows.filter(
            (ticket) =>
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
            (ticket) =>
              !ticket.assignee_id
          );
      }

      if (
        filter ===
        "mine"
      ) {
        const userEmail =
          session?.user?.email
            ?.toLowerCase();

        rows =
          rows.filter(
            (ticket) =>
              String(
                ticket.assignee_email ||
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
            (ticket) => {
              const haystack =
                [
                  ticket.subject,
                  ticket.ticket_number,
                  ticket.contact_name,
                  ticket.contact_email,
                  ticket.assignee_name,
                  ticket.assignee_email,
                  ticket.status,
                  ticket.source,
                  ticket.description,
                ]
                  .filter(
                    Boolean
                  )
                  .join(" ")
                  .toLowerCase();

              return haystack.includes(
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

  // ====================================================
  // COUNTS
  // ====================================================

  const counts =
    useMemo(() => {
      const userEmail =
        session?.user?.email
          ?.toLowerCase();

      return {
        active:
          tickets.filter(
            (ticket) =>
              ticket.status !==
              "Closed"
          ).length,

        mine:
          tickets.filter(
            (ticket) =>
              ticket.status !==
                "Closed" &&
              String(
                ticket.assignee_email ||
                  ""
              ).toLowerCase() ===
                userEmail
          ).length,

        open:
          tickets.filter(
            (ticket) =>
              ticket.status ===
              "Open"
          ).length,

        onhold:
          tickets.filter(
            (ticket) =>
              ticket.status ===
              "On Hold"
          ).length,

        waiting:
          tickets.filter(
            (ticket) =>
              ticket.status ===
              "Waiting"
          ).length,

        escalated:
          tickets.filter(
            (ticket) =>
              ticket.status ===
              "Escalated"
          ).length,

        inprogress:
          tickets.filter(
            (ticket) =>
              ticket.status ===
              "In Progress"
          ).length,

        closed:
          tickets.filter(
            (ticket) =>
              ticket.status ===
              "Closed"
          ).length,

        overdue:
          tickets.filter(
            isOverdue
          ).length,

        unassigned:
          tickets.filter(
            (ticket) =>
              !ticket.assignee_id &&
              ticket.status !==
                "Closed"
          ).length,
      };
    }, [
      tickets,
      session,
    ]);

  // ====================================================
  // UPDATE TICKET FIELD
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
      if (!value) {
        finalValue =
          null;
      } else {
        finalValue =
          new Date(
            `${value}T12:00:00`
          ).toISOString();
      }
    }

    const {
      data,
      error,
    } =
      await supabase.functions.invoke(
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
      console.error(
        "Ticket update error:",
        error ||
          data
      );

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

    window.setTimeout(
      () => {
        setUpdateNotice(
          ""
        );
      },
      1800
    );

    setUpdateBusy(
      false
    );
  }

  // ====================================================
  // REPLY
  // ====================================================

  async function sendReply() {
    if (
      !selected ||
      !replyText.trim() ||
      replyBusy
    ) {
      return;
    }

    setReplyBusy(
      true
    );

    setReplyNotice(
      ""
    );

    const {
      data,
      error,
    } =
      await supabase.functions.invoke(
        "reply-to-zoho-ticket",
        {
          body: {
            ticket_key:
              selected.ticket_key,

            content:
              replyText.trim(),
          },
        }
      );

    if (
      error ||
      !data?.success
    ) {
      setReplyNotice(
        `Could not send: ${
          data?.error ||
          error?.message ||
          "Unknown error"
        }`
      );

      setReplyBusy(
        false
      );

      return;
    }

    setReplyText(
      ""
    );

    setReplyNotice(
      "Reply sent"
    );

    await loadThreads(
      selected.ticket_key
    );

    await loadTickets(
      selected.ticket_key
    );

    setTimeout(
      () => {
        setReplyNotice(
          ""
        );
      },
      1800
    );

    setReplyBusy(
      false
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // ====================================================
  // AUTH UI
  // ====================================================

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
  // UI
  // ====================================================

  return (
    <div className="app-shell">

      {/* LEFT NAV */}

      <aside className="sidebar">

        <div className="sidebar-header">
          <div className="app-mark">
            CSG
          </div>

          <div>
            <div className="app-title">
              Ticket Hub
            </div>

            <div className="app-subtitle">
              Marketing
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">
            MY WORK
          </div>

          <button
            className={`nav-item ${
              filter ===
              "mine"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter(
                "mine"
              )
            }
          >
            <span>
              My Tickets
            </span>

            <span className="nav-count">
              {
                counts.mine
              }
            </span>
          </button>

          <button
            className={`nav-item ${
              filter ===
              "all"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter(
                "all"
              )
            }
          >
            <span>
              Active Tickets
            </span>

            <span className="nav-count">
              {
                counts.active
              }
            </span>
          </button>

          <button
            className={`nav-item ${
              filter ===
              "unassigned"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter(
                "unassigned"
              )
            }
          >
            <span>
              Unassigned
            </span>

            <span className="nav-count">
              {
                counts.unassigned
              }
            </span>
          </button>

          <button
            className={`nav-item ${
              filter ===
              "overdue"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter(
                "overdue"
              )
            }
          >
            <span>
              Overdue
            </span>

            <span className="nav-count">
              {
                counts.overdue
              }
            </span>
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">
            STATUS
          </div>

          <button
            className={`nav-item ${
              filter ===
              "open"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter(
                "open"
              )
            }
          >
            <span>
              Open
            </span>

            <span className="nav-count">
              {
                counts.open
              }
            </span>
          </button>

          <button
            className={`nav-item ${
              filter ===
              "inprogress"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter(
                "inprogress"
              )
            }
          >
            <span>
              In Progress
            </span>

            <span className="nav-count">
              {
                counts.inprogress
              }
            </span>
          </button>

          <button
            className={`nav-item ${
              filter ===
              "onhold"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter(
                "onhold"
              )
            }
          >
            <span>
              On Hold
            </span>

            <span className="nav-count">
              {
                counts.onhold
              }
            </span>
          </button>

          <button
            className={`nav-item ${
              filter ===
              "waiting"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter(
                "waiting"
              )
            }
          >
            <span>
              Waiting
            </span>

            <span className="nav-count">
              {
                counts.waiting
              }
            </span>
          </button>

          <button
            className={`nav-item ${
              filter ===
              "escalated"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter(
                "escalated"
              )
            }
          >
            <span>
              Escalated
            </span>

            <span className="nav-count">
              {
                counts.escalated
              }
            </span>
          </button>

          <button
            className={`nav-item closed-nav ${
              filter ===
              "closed"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter(
                "closed"
              )
            }
          >
            <span>
              Closed Tickets
            </span>

            <span className="nav-count">
              {
                counts.closed
              }
            </span>
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">
            BRANDS
          </div>

          <button
            className={`brand-nav ${
              brandFilter ===
              "all"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setBrandFilter(
                "all"
              )
            }
          >
            <span className="brand-dot all-dot" />
            All brands
          </button>

          <button
            className={`brand-nav ${
              brandFilter ===
              "Qualicare"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setBrandFilter(
                "Qualicare"
              )
            }
          >
            <span className="brand-dot qualicare-dot" />
            Qualicare
          </button>

          <button
            className={`brand-nav ${
              brandFilter ===
              "Tutor Doctor"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setBrandFilter(
                "Tutor Doctor"
              )
            }
          >
            <span className="brand-dot tutordoctor-dot" />
            Tutor Doctor
          </button>

          <button
            className={`brand-nav ${
              brandFilter ===
              "Code Wiz"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setBrandFilter(
                "Code Wiz"
              )
            }
          >
            <span className="brand-dot codewiz-dot" />
            Code Wiz
          </button>
        </div>

        <div className="sidebar-footer">
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
      </aside>

      {/* TICKET LIST */}

      <section className="ticket-column">

        <div className="ticket-column-header">
          <div>
            <h1>
              Tickets
            </h1>

            <p>
              {
                filteredTickets.length
              }{" "}
              tickets
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
                No tickets match
                this view.
              </div>
            )}

          {filteredTickets.map(
            (ticket) => (
              <button
                key={
                  ticket.ticket_key
                }
                className={`ticket-row ${
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
                    {ticket.assignee_name ||
                      "Unassigned"}
                  </span>
                </div>

                {isOverdue(
                  ticket
                ) && (
                  <div className="overdue-label">
                    Overdue
                  </div>
                )}
              </button>
            )
          )}
        </div>
      </section>

      {/* CONVERSATION */}

      <main className="conversation-column">

        {!selected ? (
          <div className="conversation-empty">
            <div>
              <h2>
                Select a ticket
              </h2>

              <p>
                Choose a ticket
                to view its
                conversation.
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className="conversation-header">
              <div className="conversation-heading">
                <div className="conversation-meta">
                  <BrandBadge
                    source={
                      selected.source
                    }
                  />

                  <span>
                    #
                    {
                      selected.ticket_number
                    }
                  </span>
                </div>

                <h2>
                  {selected.subject ||
                    "Untitled ticket"}
                </h2>

                <div className="conversation-requester">
                  {selected.contact_name ||
                    "Unknown requester"}

                  {selected.contact_email &&
                    ` · ${selected.contact_email}`}
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
                  Open in Zoho ↗
                </a>
              )}
            </header>

            <div className="conversation-scroll">

              {selected.description && (
                <article className="original-message">

                  <div className="message-header">
                    <div>
                      <div className="message-author">
                        {selected.contact_name ||
                          selected.contact_email ||
                          "Requester"}
                      </div>

                      <div className="message-type">
                        Original request
                      </div>
                    </div>

                    <span className="message-time">
                      {formatDateTime(
                        selected.created_at_zoho
                      )}
                    </span>
                  </div>

                  <div
                    className="message-body"
                    dangerouslySetInnerHTML={{
                      __html:
                        selected.description,
                    }}
                  />
                </article>
              )}

              {loadingThreads && (
                <div className="loading-threads">
                  Loading conversation…
                </div>
              )}

              {!loadingThreads &&
                threads.map(
                  (
                    thread
                  ) => {
                    const outbound =
                      String(
                        thread.direction ||
                          ""
                      )
                        .toLowerCase()
                        .includes(
                          "out"
                        );

                    return (
                      <article
                        key={
                          thread.thread_key ||
                          thread.id
                        }
                        className={`thread-message ${
                          outbound
                            ? "outbound"
                            : "inbound"
                        }`}
                      >
                        <div className="message-header">
                          <div>
                            <div className="message-author">
                              {thread.author_name ||
                                thread.author_email ||
                                (outbound
                                  ? "Team"
                                  : "Requester")}
                            </div>

                            {thread.author_email && (
                              <div className="message-email">
                                {
                                  thread.author_email
                                }
                              </div>
                            )}
                          </div>

                          <span className="message-time">
                            {formatDateTime(
                              thread.created_at_zoho
                            )}
                          </span>
                        </div>

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
                      </article>
                    );
                  }
                )}
            </div>

            <div className="composer">

              <div className="composer-toolbar">
                <button className="composer-mode">
                  Reply
                </button>
              </div>

              <textarea
                placeholder="Write a reply…"
                value={
                  replyText
                }
                onChange={(
                  event
                ) =>
                  setReplyText(
                    event
                      .target
                      .value
                  )
                }
                disabled={
                  replyBusy
                }
              />

              <div className="composer-footer">

                <div
                  className={`composer-notice ${
                    replyNotice.startsWith(
                      "Could"
                    )
                      ? "error"
                      : ""
                  }`}
                >
                  {
                    replyNotice
                  }
                </div>

                <button
                  className="send-button"
                  disabled={
                    replyBusy ||
                    !replyText.trim()
                  }
                  onClick={
                    sendReply
                  }
                >
                  {replyBusy
                    ? "Sending…"
                    : "Send reply"}
                </button>
              </div>
            </div>
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
              <h3>
                Ticket details
              </h3>
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

              {/* TICKET OWNER */}

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

                {!loadingAgents &&
                  agents.length ===
                    0 && (
                    <div className="field-help error-help">
                      No active agents have been synced for this brand yet.
                    </div>
                  )}

              </Detail>

              <Detail label="Tier">
                <div className="read-only-detail">
                  {selected.tier_level ||
                    "—"}
                </div>
              </Detail>

              <Detail label="Priority">
                <select
                  className="detail-control"
                  value={
                    selected.priority ||
                    ""
                  }
                  disabled={
                    updateBusy
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
                  disabled={
                    updateBusy
                  }
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
                <div
                  className={`update-notice ${
                    updateNotice.startsWith(
                      "Could"
                    )
                      ? "error"
                      : ""
                  }`}
                >
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

              <Detail label="Ticket ID">
                <span className="technical-value">
                  {
                    selected.zoho_ticket_id
                  }
                </span>
              </Detail>

            </div>
          </>
        )}
      </aside>
    </div>
  );
}

// ======================================================
// RENDER
// ======================================================

ReactDOM.createRoot(
  document.getElementById(
    "root"
  )
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
