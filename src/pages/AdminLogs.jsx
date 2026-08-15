import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../services/supabase";

import AdminLayout from "../components/layout/AdminLayout";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";


const ACTION_LABELS = {
  created_cms_user: "Created CMS User",
  updated_cms_user: "Updated CMS User",

  created_user: "Created CMS User",
  updated_user: "Updated CMS User",
  activated_user: "Activated User",
  disabled_user: "Disabled User",
  deleted_user: "Deleted User",

  created_society: "Created Society",
  updated_society: "Updated Society",
  deleted_society: "Deleted Society",
  assigned_teacher: "Assigned Teacher",

  created_event: "Created Event",
  updated_event: "Updated Event",
  submitted_event: "Submitted Event",
  approved_event: "Approved Event",
  published_event: "Published Event",
  changes_requested_event: "Requested Changes",
  rejected_event: "Rejected Event",
  deleted_event: "Deleted Event",
};


function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [
    actionFilter,
    setActionFilter,
  ] = useState("all");

  const [
    expandedLogId,
    setExpandedLogId,
  ] = useState(null);

  const [error, setError] =
    useState("");


  // =========================================================
  // LOAD ACTIVITY LOGS
  // =========================================================

  async function fetchLogs() {
    setLoading(true);
    setError("");


    const {
      data: logData,
      error: logError,
    } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", {
        ascending: false,
      });


    if (logError) {
      console.error(
        "ACTIVITY LOG ERROR:",
        logError
      );

      setError(
        logError.message ||
          "Could not load activity logs."
      );

      setLogs([]);
      setLoading(false);

      return;
    }


    const rawLogs =
      logData || [];


    if (
      rawLogs.length === 0
    ) {
      setLogs([]);
      setLoading(false);

      return;
    }


    // =======================================================
    // LOAD CURRENT ACTOR PROFILES
    // =======================================================

    const userIds = [
      ...new Set(
        rawLogs
          .map(
            (log) =>
              log.user_id
          )
          .filter(Boolean)
      ),
    ];


    let profiles = [];


    if (
      userIds.length > 0
    ) {
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          role
        `)
        .in(
          "id",
          userIds
        );


      if (profileError) {
        console.error(
          "ACTIVITY LOG PROFILE ERROR:",
          profileError
        );
      } else {
        profiles =
          profileData || [];
      }
    }


    const profileMap =
      new Map(
        profiles.map(
          (profile) => [
            profile.id,
            profile,
          ]
        )
      );


    const combinedLogs =
      rawLogs.map(
        (log) => ({
          ...log,

          actor:
            profileMap.get(
              log.user_id
            ) || null,
        })
      );


    setLogs(
      combinedLogs
    );

    setLoading(false);
  }


  useEffect(() => {
    fetchLogs();
  }, []);


  // =========================================================
  // FILTERING
  // =========================================================

  const filteredLogs =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();


      return logs.filter(
        (log) => {
          const actionLabel =
            ACTION_LABELS[
              log.action
            ] ||
            formatText(
              log.action
            );


          const activityTitle =
            getActivityTitle(
              log.action,
              log.details
            );


          const detailsText =
            log.details
              ? JSON.stringify(
                  log.details
                )
              : "";


          const searchableText = [
            actionLabel,
            activityTitle,
            log.action,
            log.entity_type,
            log.entity_id,
            log.actor?.full_name,
            log.actor?.email,
            log.actor?.role,
            detailsText,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();


          const matchesSearch =
            !query ||
            searchableText.includes(
              query
            );


          const matchesAction =
            actionFilter === "all" ||
            log.action ===
              actionFilter;


          return (
            matchesSearch &&
            matchesAction
          );
        }
      );
    }, [
      logs,
      search,
      actionFilter,
    ]);


  const uniqueActions =
    useMemo(() => {
      return [
        ...new Set(
          logs
            .map(
              (log) =>
                log.action
            )
            .filter(Boolean)
        ),
      ].sort();
    }, [logs]);


  // =========================================================
  // UI
  // =========================================================

  return (
    <AdminLayout>

      <div className="admin-page-heading">

        <div>
          <span className="admin-eyebrow">
            System Oversight
          </span>

          <h1>
            Activity Logs
          </h1>

          <p>
            Review important actions performed
            across the EventHub CMS.
          </p>
        </div>


        <div className="admin-page-count">

          <strong>
            {logs.length}
          </strong>

          <span>
            Log entries
          </span>

        </div>

      </div>


      {error && (
        <div className="admin-inline-error">

          <span>
            !
          </span>

          <p>
            {error}
          </p>

        </div>
      )}


      <section className="admin-logs-panel">

        {/* ===================================================
            TOOLBAR
        =================================================== */}

        <div className="admin-logs-toolbar">

          <div className="admin-events-search">

            <span>
              ⌕
            </span>

            <input
              type="search"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search activity..."
            />

          </div>


          <select
            value={
              actionFilter
            }
            onChange={(
              event
            ) =>
              setActionFilter(
                event.target.value
              )
            }
          >

            <option value="all">
              All actions
            </option>


            {uniqueActions.map(
              (action) => (
                <option
                  key={
                    action
                  }
                  value={
                    action
                  }
                >
                  {ACTION_LABELS[
                    action
                  ] ||
                    formatText(
                      action
                    )}
                </option>
              )
            )}

          </select>

        </div>


        <div className="admin-events-results">

          <span>
            Showing{" "}
            {filteredLogs.length} of{" "}
            {logs.length}
          </span>

        </div>


        {/* ===================================================
            RESULTS
        =================================================== */}

        {loading ? (

          <LoadingState
            label="Loading activity logs..."
          />

        ) : filteredLogs.length ===
          0 ? (

          <EmptyState
            title={
              search ||
              actionFilter !==
                "all"
                ? "No matching activity"
                : "No activity logs yet"
            }
            description={
              search ||
              actionFilter !==
                "all"
                ? "Try changing the search or filter."
                : "CMS activity will appear here once actions are recorded."
            }
          />

        ) : (

          <div className="admin-log-list">

            {filteredLogs.map(
              (log) => {

                const actorName =
                  log.actor
                    ?.full_name ||
                  log.actor
                    ?.email ||
                  getStoredActorName(
                    log.details
                  ) ||
                  "System User";


                const actionLabel =
                  ACTION_LABELS[
                    log.action
                  ] ||
                  formatText(
                    log.action
                  );


                const activityTitle =
                  getActivityTitle(
                    log.action,
                    log.details
                  );


                const expanded =
                  expandedLogId ===
                  log.id;


                return (
                  <article
                    key={
                      log.id
                    }
                    className="admin-log-row admin-log-row--compact"
                  >

                    {/* =========================================
                        ONE-LINE TOPIC
                    ========================================= */}

                    <div className="admin-log-summary">

                      <div className="admin-log-summary-left">

                        <div className="admin-log-icon">
                          {getLogIcon(
                            log.action
                          )}
                        </div>


                        <div className="admin-log-summary-text">

                          <span className="admin-log-action">
                            {
                              actionLabel
                            }
                          </span>


                          <strong>
                            {
                              activityTitle
                            }
                          </strong>

                        </div>

                      </div>


                      <button
                        type="button"
                        className="admin-action-button"
                        onClick={() =>
                          setExpandedLogId(
                            expanded
                              ? null
                              : log.id
                          )
                        }
                      >
                        {expanded
                          ? "Hide details"
                          : "More details"}
                      </button>

                    </div>


                    {/* =========================================
                        ALL OTHER DETAILS
                    ========================================= */}

                    {expanded && (
                      <div className="admin-log-expanded">

                        <div className="admin-log-expanded-grid">

                          <LogInfo
                            label="Performed by"
                            value={
                              actorName
                            }
                          />


                          <LogInfo
                            label="Role"
                            value={
                              log.actor
                                ?.role
                                ? formatRole(
                                    log.actor
                                      .role
                                  )
                                : "Unknown"
                            }
                          />


                          <LogInfo
                            label="Action"
                            value={
                              actionLabel
                            }
                          />


                          <LogInfo
                            label="Entity"
                            value={
                              log.entity_type
                                ? formatText(
                                    log.entity_type
                                  )
                                : "—"
                            }
                          />


                          <LogInfo
                            label="Entity ID"
                            value={
                              log.entity_id ||
                              "—"
                            }
                          />


                          <LogInfo
                            label="Date & Time"
                            value={
                              formatDateTime(
                                log.created_at
                              )
                            }
                          />


                          {log.actor
                            ?.email && (
                            <LogInfo
                              label="Actor Email"
                              value={
                                log.actor
                                  .email
                              }
                            />
                          )}

                        </div>


                        <LogDetails
                          details={
                            log.details
                          }
                        />

                      </div>
                    )}

                  </article>
                );
              }
            )}

          </div>

        )}

      </section>

    </AdminLayout>
  );
}


// =========================================================
// LOG INFO
// =========================================================

function LogInfo({
  label,
  value,
}) {
  return (
    <div className="admin-log-info">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


// =========================================================
// STORED DETAILS
// =========================================================

function LogDetails({
  details,
}) {
  if (
    !details ||
    typeof details !==
      "object"
  ) {
    return null;
  }


  const entries =
    Object.entries(
      details
    )
      .filter(
        ([, value]) =>
          value !== null &&
          value !== undefined &&
          value !== ""
      );


  if (
    entries.length === 0
  ) {
    return null;
  }


  return (
    <div className="admin-log-details">

      {entries.map(
        ([key, value]) => (
          <div
            key={
              key
            }
          >

            <span>
              {formatText(
                key
              )}
            </span>


            <strong>
              {formatDetailValue(
                value
              )}
            </strong>

          </div>
        )
      )}

    </div>
  );
}


// =========================================================
// ACTIVITY TITLE
// =========================================================

function getActivityTitle(
  action,
  details
) {
  const targetName =
    details?.title ||
    details?.full_name ||
    details?.name ||
    null;


  switch (action) {

    case "created_cms_user":
    case "created_user":
      return targetName
        ? `Created CMS user: ${targetName}`
        : "Created a CMS user";


    case "updated_cms_user":
    case "updated_user":
      return targetName
        ? `Updated CMS user: ${targetName}`
        : "Updated a CMS user";


    case "activated_user":
      return targetName
        ? `Activated CMS user: ${targetName}`
        : "Activated a CMS user";


    case "disabled_user":
      return targetName
        ? `Disabled CMS user: ${targetName}`
        : "Disabled a CMS user";


    case "deleted_user":
      return targetName
        ? `Deleted CMS user: ${targetName}`
        : "Deleted a CMS user";


    case "created_society":
      return targetName
        ? `Created society: ${targetName}`
        : "Created a society";


    case "updated_society":
      return targetName
        ? `Updated society: ${targetName}`
        : "Updated a society";


    case "deleted_society":
      return targetName
        ? `Deleted society: ${targetName}`
        : "Deleted a society";


    case "assigned_teacher":
      if (
        details?.teacher_name &&
        details?.society_name
      ) {
        return `Assigned ${details.teacher_name} to ${details.society_name}`;
      }

      return "Assigned a Teacher-in-Charge";


    case "created_event":
      return targetName
        ? `Created event: ${targetName}`
        : "Created a new event";


    case "updated_event":
      return targetName
        ? `Updated event: ${targetName}`
        : "Updated an event";


    case "submitted_event":
      return targetName
        ? `Submitted event: ${targetName}`
        : "Submitted an event for review";


    case "approved_event":
      return targetName
        ? `Approved event: ${targetName}`
        : "Approved an event";


    case "published_event":
      return targetName
        ? `Published event: ${targetName}`
        : "Published an event";


    case "changes_requested_event":
      return targetName
        ? `Requested changes: ${targetName}`
        : "Requested changes to an event";


    case "rejected_event":
      return targetName
        ? `Rejected event: ${targetName}`
        : "Rejected an event";


    case "deleted_event":
      return targetName
        ? `Deleted event: ${targetName}`
        : "Deleted an event";


    default:
      return (
        ACTION_LABELS[
          action
        ] ||
        formatText(
          action
        )
      );
  }
}


// =========================================================
// STORED ACTOR
// =========================================================

function getStoredActorName(
  details
) {
  return (
    details?.performed_by_name ||
    details?.actor_name ||
    null
  );
}


// =========================================================
// DETAIL VALUE
// =========================================================

function formatDetailValue(
  value
) {
  if (
    typeof value ===
    "boolean"
  ) {
    return value
      ? "Yes"
      : "No";
  }


  if (
    Array.isArray(
      value
    )
  ) {
    return value.join(
      ", "
    );
  }


  if (
    typeof value ===
    "object"
  ) {
    return JSON.stringify(
      value
    );
  }


  return String(
    value
  );
}


// =========================================================
// TEXT FORMATTER
// =========================================================

function formatText(
  value
) {
  if (!value) {
    return "Unknown";
  }


  return String(
    value
  )
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter
          .toUpperCase()
    );
}


// =========================================================
// ROLE FORMATTER
// =========================================================

function formatRole(
  role
) {
  const labels = {
    principal:
      "Principal",

    vice_principal:
      "Vice Principal",

    teacher:
      "Teacher-in-Charge",

    student_admin:
      "Student Admin",
  };


  return (
    labels[
      role
    ] ||
    formatText(
      role
    )
  );
}


// =========================================================
// ICON
// =========================================================

function getLogIcon(
  action
) {
  if (
    action?.includes(
      "created"
    )
  ) {
    return "+";
  }


  if (
    action?.includes(
      "updated"
    )
  ) {
    return "↻";
  }


  if (
    action?.includes(
      "approved"
    )
  ) {
    return "✓";
  }


  if (
    action?.includes(
      "published"
    )
  ) {
    return "↑";
  }


  if (
    action?.includes(
      "rejected"
    ) ||
    action?.includes(
      "deleted"
    )
  ) {
    return "×";
  }


  if (
    action?.includes(
      "disabled"
    )
  ) {
    return "−";
  }


  if (
    action?.includes(
      "activated"
    )
  ) {
    return "✓";
  }


  if (
    action?.includes(
      "assigned"
    )
  ) {
    return "→";
  }


  return "•";
}


// =========================================================
// DATE / TIME
// =========================================================

function formatDateTime(
  value
) {
  if (!value) {
    return "Unknown time";
  }


  return new Date(
    value
  ).toLocaleString(
    "en-US",
    {
      year:
        "numeric",

      month:
        "short",

      day:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}


export default AdminLogs;