import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ReactDOM from "react-dom/client";

import {
  createClient,
} from "@supabase/supabase-js";

import "./styles.css";

// ======================================================
// SUPABASE
// ======================================================

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  createClient(
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
  if (!value) {
    return "—";
  }

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
  if (!value) {
    return "";
  }

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
  if (!value) {
    return "";
  }

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
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function isOverdue(ticket) {
  if (
    !ticket?.due_date
  ) {
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

function brandClass(source) {
  if (
    source === "Qualicare"
  ) {
    return "brand-qualicare";
  }

  if (
    source ===
    "Tutor Doctor"
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

function extractEmail(value) {
  if (!value) {
    return "";
  }

  const text =
    String(value)
      .trim();

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
      seen.has(
        email
      )
    ) {
      continue;
    }

    seen.add(
      email
    );

    output.push(
      value
    );
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
      bytes /
      1024
    ).toFixed(
      1
    )} KB`;
  }

  return `${(
    bytes /
    (
      1024 *
      1024
    )
  ).toFixed(
    1
  )} MB`;
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

  const fileInputRef =
    useRef(null);

  const imageInputRef =
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
  // TAG STATE
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
  // COMPOSER STATE
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
        if (
          !session
        ) {
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

        if (
          error
        ) {
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
      [
        session,
      ]
    );

  useEffect(() => {
    if (
      session
    ) {
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

        if (
          error
        ) {
          console.error(
            "Thread load error:",
            error
          );

          setThreads(
            []
          );
        } else {
          setThreads(
            data ||
            []
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

        if (
          error
        ) {
          console.error(
            "Agent load error:",
            error
          );

          setAgents(
            []
          );
        } else {
          setAgents(
            data ||
            []
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
          setTags(
            []
          );

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

        if (
          error
        ) {
          console.error(
            "Tag load error:",
            error
          );

          setTags(
            []
          );
        } else {
          setTags(
            data ||
            []
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
          setTagCatalog(
            []
          );

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

        if (
          error
        ) {
          console.error(
            "Tag catalog error:",
            error
          );

          setTagCatalog(
            []
          );
        } else {
          setTagCatalog(
            data ||
            []
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
      setAgents(
        []
      );

      setTagCatalog(
        []
      );
    }
  }, [
    selected?.source,
    loadAgents,
    loadTagCatalog,
  ]);

  useEffect(() => {
    if (
      selectedKey
    ) {
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

  // ====================================================
  // REALTIME
  // ====================================================

  useEffect(() => {
    if (
      !session
    ) {
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
            event:
              "*",

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
            event:
              "*",

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
            event:
              "*",

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
    loadTags,
  ]);

  // ====================================================
  // COMPOSER RECIPIENTS
  // ====================================================

  const latestThread =
    useMemo(() => {
      if (
        threads.length ===
        0
      ) {
        return null;
      }

      return (
        threads[
          threads.length -
          1
        ] ||
        null
      );
    }, [
      threads,
    ]);

  const detectedFromEmail =
    useMemo(() => {
      const outbound =
        [...threads]
          .reverse()
          .find(
            (
              thread
            ) =>
              String(
                thread.direction ||
                  ""
              )
                .toLowerCase()
                .includes(
                  "out"
                ) &&
              thread.from_email
          );

      return (
        outbound
          ?.from_email ||
        "Configured Zoho support address"
      );
    }, [
      threads,
    ]);

  function calculateReplyAllCc() {
    if (
      !selected
    ) {
      return "";
    }

    const candidates =
      [
        ...splitAddresses(
          latestThread
            ?.from_email
        ),

        ...splitAddresses(
          latestThread
            ?.to_email
        ),

        ...splitAddresses(
          latestThread
            ?.cc
        ),
      ];

    const excluded =
      new Set(
        [
          selected
            .contact_email,
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
      .join(
        ", "
      );
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

      setRecipientCc(
        ""
      );

      setRecipientBcc(
        ""
      );

      setShowCc(
        false
      );

      setShowBcc(
        false
      );

      setEditorHtml(
        ""
      );

      setPendingFiles(
        []
      );

      setComposerNotice(
        ""
      );

      setUploadProgress(
        ""
      );

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

  function changeReplyMode(
    mode
  ) {
    setReplyMode(
      mode
    );

    setShowReplyModeMenu(
      false
    );

    setComposerNotice(
      ""
    );

    if (
      mode ===
      "reply"
    ) {
      setRecipientTo(
        selected
          ?.contact_email ||
        ""
      );

      setRecipientCc(
        ""
      );

      setRecipientBcc(
        ""
      );

      setShowCc(
        false
      );

      setShowBcc(
        false
      );
    }

    if (
      mode ===
      "reply_all"
    ) {
      setRecipientTo(
        selected
          ?.contact_email ||
        ""
      );

      const replyAllCc =
        calculateReplyAllCc();

      setRecipientCc(
        replyAllCc
      );

      setShowCc(
        true
      );
    }

    if (
      mode ===
      "forward"
    ) {
      setRecipientTo(
        ""
      );

      setRecipientCc(
        ""
      );

      setRecipientBcc(
        ""
      );

      setShowCc(
        false
      );

      setShowBcc(
        false
      );
    }
  }

  // ====================================================
  // RICH TEXT COMMANDS
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

    if (
      !url
    ) {
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
      files.length ===
      0
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

    if (
      !token
    ) {
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
          method:
            "POST",

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

    let data =
      {};

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
  // SEND MESSAGE
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

    const plainText =
      stripHtml(
        html
      );

    if (
      !plainText
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

    setComposerBusy(
      true
    );

    setComposerNotice(
      ""
    );

    setShowSendMenu(
      false
    );

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

      setEditorHtml(
        ""
      );

      if (
        editorRef.current
      ) {
        editorRef.current.innerHTML =
          "";
      }

      setPendingFiles(
        []
      );

      setUploadProgress(
        ""
      );

      await loadThreads(
        selected.ticket_key
      );

      await loadTickets(
        selected.ticket_key
      );

      setTimeout(
        () => {
          setComposerNotice(
            ""
          );
        },
        2500
      );
    } catch (
      error
    ) {
      setUploadProgress(
        ""
      );

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
  // TAG AUTOCOMPLETE
  // ====================================================

  const suggestedTags =
    useMemo(() => {
      const needle =
        tagInput
          .trim()
          .toLowerCase();

      if (
        !needle
      ) {
        return [];
      }

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

      if (
        !needle
      ) {
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
          )
            .toLowerCase() ===
          cleanName
            .toLowerCase()
      );

    if (
      duplicate
    ) {
      setTagNotice(
        "This ticket already has that tag."
      );

      return;
    }

    setTagBusy(
      true
    );

    setTagNotice(
      ""
    );

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

    setTagInput(
      ""
    );

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

    setTimeout(
      () => {
        setTagNotice(
          ""
        );
      },
      1800
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

    setTimeout(
      () => {
        setTagNotice(
          ""
        );
      },
      1800
    );

    setTagBusy(
      false
    );
  }

  // ====================================================
  // FILTERS
  // ====================================================

  const filteredTickets =
    useMemo(() => {
      let rows =
        [
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
              !ticket.assignee_id &&
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
                  ticket.status,
                  ticket.source,
                  ticket.description,
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    " "
                  )
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
              ticket.assignee_email ||
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
            !ticket.assignee_id &&
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

  if (
    !session
  ) {
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

      {/* ================================================= */}
      {/* SIDEBAR */}
      {/* ================================================= */}

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

      {/* ================================================= */}
      {/* TICKET LIST */}
      {/* ================================================= */}

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
            value={
              search
            }
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

      {/* ================================================= */}
      {/* CONVERSATION */}
      {/* ================================================= */}

      <main className="conversation-column">

        {!selected ? (
          <div className="conversation-empty">

            <div>
              <h2>
                Select a ticket
              </h2>

              <p>
                Choose a ticket to view its conversation.
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

                    const attachments =
                      Array.isArray(
                        thread.attachments
                      )
                        ? thread.attachments
                        : [];

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
                                  <span className="attachment-icon">
                                    📎
                                  </span>

                                  <span className="existing-attachment-name">
                                    {attachment.name ||
                                      "Attachment"}
                                  </span>

                                  {attachment.size && (
                                    <span className="existing-attachment-size">
                                      {formatFileSize(
                                        attachment.size
                                      )}
                                    </span>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </article>
                    );
                  }
                )}
            </div>

            {/* ================================================= */}
            {/* RICH COMPOSER */}
            {/* ================================================= */}

            <div className="rich-composer">

              {/* MODE */}

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
                    {replyMode ===
                    "reply"
                      ? "Reply"
                      : replyMode ===
                        "reply_all"
                      ? "Reply All"
                      : "Forward"}

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
                          Include other participants
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
                          Send this conversation to someone else
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
                      Cc
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
                      Bcc
                    </button>
                  )}
                </div>
              </div>

              {/* RECIPIENTS */}

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
                    placeholder={
                      replyMode ===
                      "forward"
                        ? "Enter recipient email…"
                        : "Recipient"
                    }
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
                      placeholder="Add CC recipients…"
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
                      placeholder="Add BCC recipients…"
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

              {/* TOOLBAR */}

              <div className="rich-toolbar">

                <button
                  type="button"
                  title="Undo"
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
                  title="Redo"
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
                  title="Bold"
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
                  title="Italic"
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
                  title="Underline"
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
                  title="Strikethrough"
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
                  title="Font size"
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

                <label
                  className="toolbar-color"
                  title="Text color"
                >
                  A

                  <input
                    type="color"
                    defaultValue="#333333"
                    onChange={(
                      event
                    ) =>
                      runEditorCommand(
                        "foreColor",
                        event
                          .target
                          .value
                      )
                    }
                  />
                </label>

                <label
                  className="toolbar-highlight"
                  title="Highlight"
                >
                  ▬

                  <input
                    type="color"
                    defaultValue="#fff2a8"
                    onChange={(
                      event
                    ) =>
                      runEditorCommand(
                        "hiliteColor",
                        event
                          .target
                          .value
                      )
                    }
                  />
                </label>

                <div className="toolbar-divider" />

                <button
                  type="button"
                  title="Align left"
                  onMouseDown={(
                    event
                  ) => {
                    event.preventDefault();

                    runEditorCommand(
                      "justifyLeft"
                    );
                  }}
                >
                  ≡
                </button>

                <button
                  type="button"
                  title="Align center"
                  onMouseDown={(
                    event
                  ) => {
                    event.preventDefault();

                    runEditorCommand(
                      "justifyCenter"
                    );
                  }}
                >
                  ≣
                </button>

                <button
                  type="button"
                  title="Align right"
                  onMouseDown={(
                    event
                  ) => {
                    event.preventDefault();

                    runEditorCommand(
                      "justifyRight"
                    );
                  }}
                >
                  ☷
                </button>

                <div className="toolbar-divider" />

                <button
                  type="button"
                  title="Bulleted list"
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
                  title="Numbered list"
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
                  title="Outdent"
                  onMouseDown={(
                    event
                  ) => {
                    event.preventDefault();

                    runEditorCommand(
                      "outdent"
                    );
                  }}
                >
                  ⇤
                </button>

                <button
                  type="button"
                  title="Indent"
                  onMouseDown={(
                    event
                  ) => {
                    event.preventDefault();

                    runEditorCommand(
                      "indent"
                    );
                  }}
                >
                  ⇥
                </button>

                <div className="toolbar-divider" />

                <button
                  type="button"
                  title="Insert link"
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
                  title="Remove formatting"
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

              {/* EDITOR */}

              <div
                ref={
                  editorRef
                }
                className="rich-editor"
                contentEditable={
                  !composerBusy
                }
                suppressContentEditableWarning
                data-placeholder={
                  replyMode ===
                  "forward"
                    ? "Add a message to your forwarded email…"
                    : "Write your reply…"
                }
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

              {/* ATTACHMENTS */}

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

                        <div className="pending-file-icon">
                          {file.type
                            ?.startsWith(
                              "image/"
                            )
                            ? "🖼"
                            : "📎"}
                        </div>

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
                          disabled={
                            composerBusy
                          }
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

              {/* FOOTER */}

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
                    title="Attach files"
                    disabled={
                      composerBusy
                    }
                    onClick={() =>
                      fileInputRef
                        .current
                        ?.click()
                    }
                  >
                    📎
                  </button>

                  <button
                    type="button"
                    className="composer-icon-button"
                    title="Attach images"
                    disabled={
                      composerBusy
                    }
                    onClick={() =>
                      imageInputRef
                        .current
                        ?.click()
                    }
                  >
                    🖼
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
                    <div
                      className={`composer-status ${
                        composerNotice
                          ?.toLowerCase()
                          .includes(
                            "could"
                          ) ||
                        composerNotice
                          ?.toLowerCase()
                          .includes(
                            "required"
                          ) ||
                        composerNotice
                          ?.toLowerCase()
                          .includes(
                            "expired"
                          )
                          ? "error"
                          : ""
                      }`}
                    >
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
                            Send and keep current status
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

                          <span>
                            Send reply and close ticket
                          </span>
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

                          <span>
                            Send reply and set status to Waiting
                          </span>
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

                          <span>
                            Send reply and set status to On Hold
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ================================================= */}
      {/* DETAILS */}
      {/* ================================================= */}

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
              </Detail>

              {/* TAGS */}

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
                              event
                                .target
                                .value
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
