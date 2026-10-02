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
  if (
    source === "Qualicare"
  ) {
    return "brand-qualicare";
  }

  if (
    source === "Tutor Doctor"
  ) {
    return "brand-tutordoctor";
  }

  if (
    source === "Code Wiz"
  ) {
    return "brand-codewiz";
  }

  return "";
}

function statusClass(status) {
  return `status-${String(
    status || ""
  )
    .toLowerCase()
    .replaceAll(" ", "-")}`;
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
      data:
        listener,
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
          Marketing Ticket Hub
        </h1>

        <p>
          Qualicare, Tutor Doctor and Code Wiz tickets in one place.
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
    loadingTags,
    setLoadingTags,
  ] =
    useState(false);

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
      data:
        listener,
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

        setThreads(
          data || []
        );

        setLoadingThreads(
          false
        );
      },
      [
        session,
      ]
    );

  useEffect(() => {
    if (selectedKey) {
      loadThreads(
        selectedKey
      );
    }
  }, [
    selectedKey,
    loadThreads,
  ]);

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

        setAgents(
          data || []
        );

        setLoadingAgents(
          false
        );
      },
      [
        session,
      ]
    );

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

        setTags(
          data || []
        );

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
    } else {
      setAgents([]);
      setTagCatalog([]);
    }
  }, [
    selected?.source,
    loadAgents,
    loadTagCatalog,
  ]);

  useEffect(() => {
    if (selectedKey) {
      loadTags(
        selectedKey
      );
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
          () =>
            loadTickets()
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
            schema:
              "public",
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
      supabase.removeChannel(
        channel
      );
    };
  }, [
    session,
    selectedKey,
    loadTickets,
    loadThreads,
    loadTags,
  ]);

  const suggestedTags =
    useMemo(() => {
      const needle =
        tagInput
          .trim()
          .toLowerCase();

      if (!needle) {
        return [];
      }

      const attachedNames =
        new Set(
          tags.map(
            (
              tag
            ) =>
              String(
                tag.name ||
                  ""
              ).toLowerCase()
          )
        );

      return tagCatalog
        .filter(
          (
            tag
          ) =>
            !attachedNames.has(
              String(
                tag.name ||
                  ""
              ).toLowerCase()
            )
        )
        .filter(
          (
            tag
          ) =>
            String(
              tag.name ||
                ""
            )
              .toLowerCase()
              .includes(
                needle
              )
        )
        .slice(
          0,
          8
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
          ).toLowerCase() ===
          needle
      );
    }, [
      tagCatalog,
      tagInput,
    ]);

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
            (
              ticket
            ) =>
              ticket.source ===
              brandFilter
          );
      }

      if (
        filter === "all"
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
        filter === "open"
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
        filter === "onhold"
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
        filter === "closed"
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
              !ticket.assignee_id &&
              ticket.status !==
                "Closed"
          );
      }

      if (
        filter === "mine"
      ) {
        const email =
          session?.user?.email
            ?.toLowerCase();

        rows =
          rows.filter(
            (
              ticket
            ) =>
              String(
                ticket.assignee_email ||
                  ""
              ).toLowerCase() ===
                email &&
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
            ) =>
              [
                ticket.subject,
                ticket.ticket_number,
                ticket.contact_name,
                ticket.contact_email,
                ticket.assignee_name,
                ticket.status,
                ticket.source,
              ]
                .filter(
                  Boolean
                )
                .join(" ")
                .toLowerCase()
                .includes(
                  needle
                )
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

  const counts =
    useMemo(() => {
      const email =
        session?.user?.email
          ?.toLowerCase();

      return {
        active:
          tickets.filter(
            (
              ticket
            ) =>
              ticket.status !==
              "Closed"
          ).length,

        mine:
          tickets.filter(
            (
              ticket
            ) =>
              ticket.status !==
                "Closed" &&
              String(
                ticket.assignee_email ||
                  ""
              ).toLowerCase() ===
                email
          ).length,

        open:
          tickets.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "Open"
          ).length,

        inprogress:
          tickets.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "In Progress"
          ).length,

        onhold:
          tickets.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "On Hold"
          ).length,

        waiting:
          tickets.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "Waiting"
          ).length,

        escalated:
          tickets.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "Escalated"
          ).length,

        closed:
          tickets.filter(
            (
              ticket
            ) =>
              ticket.status ===
              "Closed"
          ).length,

        overdue:
          tickets.filter(
            isOverdue
          ).length,

        unassigned:
          tickets.filter(
            (
              ticket
            ) =>
              !ticket.assignee_id &&
              ticket.status !==
                "Closed"
          ).length,
      };
    }, [
      tickets,
      session,
    ]);

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

    setUpdateBusy(true);
    setUpdateNotice("");

    let finalValue =
      value;

    if (
      field === "dueDate"
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
      setUpdateNotice(
        `Could not update: ${
          data?.error ||
          error?.message ||
          "Unknown error"
        }`
      );

      setUpdateBusy(false);
      return;
    }

    setUpdateNotice("Saved");

    await loadTickets(
      selected.ticket_key
    );

    setTimeout(
      () =>
        setUpdateNotice(
          ""
        ),
      1800
    );

    setUpdateBusy(false);
  }

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

    setTagBusy(true);
    setTagNotice("");
    setShowTagSuggestions(
      false
    );

    const {
      data,
      error,
    } =
      await supabase.functions.invoke(
        "manage-zoho-ticket-tags",
        {
          body: {
            ticket_key:
              selected.ticket_key,

            action: "add",

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

      setTagBusy(false);
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

    /*
      Also add the newly-created/associated tag
      to our autocomplete catalog.
    */
    const {
      data:
        refreshedTicketTags,
    } =
      await supabase
        .from(
          "ticket_tags"
        )
        .select(
          "zoho_tag_id, name, tag_type"
        )
        .eq(
          "ticket_key",
          selected.ticket_key
        );

    const matched =
      (
        refreshedTicketTags ||
        []
      ).find(
        (
          tag
        ) =>
          String(
            tag.name
          ).toLowerCase() ===
          cleanName.toLowerCase()
      );

    /*
      We cannot write to zoho_tags from the browser because
      RLS is intentionally read-only. The catalog will be
      refreshed server-side as more tickets sync. We do,
      however, temporarily add it to local suggestions so
      the UI knows about it immediately.
    */
    if (
      matched &&
      !tagCatalog.some(
        (
          tag
        ) =>
          tag.zoho_tag_id ===
          matched.zoho_tag_id
      )
    ) {
      setTagCatalog(
        (
          current
        ) => [
          ...current,
          matched,
        ].sort(
          (
            a,
            b
          ) =>
            String(
              a.name
            ).localeCompare(
              String(
                b.name
              )
            )
        )
      );
    }

    setTimeout(
      () =>
        setTagNotice(
          ""
        ),
      1800
    );

    setTagBusy(false);
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

    setTagBusy(true);
    setTagNotice("");

    const {
      data,
      error,
    } =
      await supabase.functions.invoke(
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

      setTagBusy(false);
      return;
    }

    setTagNotice(
      "Tag removed"
    );

    await loadTags(
      selected.ticket_key
    );

    setTimeout(
      () =>
        setTagNotice(
          ""
        ),
      1800
    );

    setTagBusy(false);
  }

  async function sendReply() {
    if (
      !selected ||
      !replyText.trim() ||
      replyBusy
    ) {
      return;
    }

    setReplyBusy(true);
    setReplyNotice("");

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

      setReplyBusy(false);
      return;
    }

    setReplyText("");
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
      () =>
        setReplyNotice(
          ""
        ),
      1800
    );

    setReplyBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (authLoading) {
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

  return (
    <div className="app-shell">

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
                key={
                  id
                }
                className={`nav-item ${
                  filter === id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setFilter(
                    id
                  )
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
                key={
                  id
                }
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
                  setFilter(
                    id
                  )
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
              "all-dot",
            ],
            [
              "Qualicare",
              "Qualicare",
              "qualicare-dot",
            ],
            [
              "Tutor Doctor",
              "Tutor Doctor",
              "tutordoctor-dot",
            ],
            [
              "Code Wiz",
              "Code Wiz",
              "codewiz-dot",
            ],
          ].map(
            (
              [
                value,
                label,
                dot,
              ]
            ) => (
              <button
                key={
                  value
                }
                className={`brand-nav ${
                  brandFilter ===
                  value
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setBrandFilter(
                    value
                  )
                }
              >
                <span
                  className={`brand-dot ${dot}`}
                />

                {label}
              </button>
            )
          )}
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
            placeholder="Search tickets…"
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
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

          {filteredTickets.map(
            (
              ticket
            ) => (
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

      <main className="conversation-column">

        {!selected ? (
          <div className="conversation-empty">
            Select a ticket
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

              {threads.map(
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
                              "Message"}
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
                    event.target.value
                  )
                }
              />

              <div className="composer-footer">
                <div className="composer-notice">
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
                      event.target.value
                    )
                  }
                >
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
                        event.target.value ||
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
                          {agent.name}
                          {agent.email
                            ? ` — ${agent.email}`
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                )}
              </Detail>

              <Detail label="Tags">

                {loadingTags ? (
                  <div className="tag-loading">
                    Loading tags…
                  </div>
                ) : (
                  <>
                    <div className="tag-list">
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
                              disabled={
                                tagBusy
                              }
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

                      {tags.length ===
                        0 && (
                        <div className="no-tags">
                          No tags yet
                        </div>
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
                          disabled={
                            tagBusy
                          }
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
                              event.target.value
                            );

                            setShowTagSuggestions(
                              true
                            );
                          }}
                        />

                        {showTagSuggestions &&
                          tagInput.trim() && (
                            <div className="tag-suggestions">

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
                                    onMouseDown={(
                                      event
                                    ) =>
                                      event.preventDefault()
                                    }
                                    onClick={() =>
                                      addTagByName(
                                        tag.name
                                      )
                                    }
                                  >
                                    <span className="tag-suggestion-icon">
                                      #
                                    </span>

                                    <span>
                                      {
                                        tag.name
                                      }
                                    </span>

                                    <span className="existing-tag-label">
                                      Existing
                                    </span>
                                  </button>
                                )
                              )}

                              {!exactTagMatch && (
                                <button
                                  type="button"
                                  className="tag-suggestion create-tag-option"
                                  onMouseDown={(
                                    event
                                  ) =>
                                    event.preventDefault()
                                  }
                                  onClick={() =>
                                    addTagByName(
                                      tagInput
                                    )
                                  }
                                >
                                  <span className="tag-create-plus">
                                    +
                                  </span>

                                  <span>
                                    Create new tag{" "}
                                    <strong>
                                      “
                                      {
                                        tagInput.trim()
                                      }
                                      ”
                                    </strong>
                                  </span>
                                </button>
                              )}

                              {suggestedTags.length ===
                                0 &&
                                exactTagMatch && (
                                  <div className="tag-no-results">
                                    Press Enter to add this existing tag.
                                  </div>
                                )}
                            </div>
                          )}
                      </div>

                      <button
                        type="submit"
                        className="tag-add-button"
                        disabled={
                          tagBusy ||
                          !tagInput.trim()
                        }
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
                {selected.tier_level ||
                  "—"}
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
                      event.target.value ||
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
                      event.target.value
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

                  <span>
                    {selected.contact_email ||
                      ""}
                  </span>
                </div>
              </Detail>

              <Detail label="Department">
                {selected.department ||
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

ReactDOM.createRoot(
  document.getElementById(
    "root"
  )
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
