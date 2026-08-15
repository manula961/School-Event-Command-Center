import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  supabase,
} from "../services/supabase";

import {
  refreshEventLifecycle,
} from "../utils/eventLifecycle";

import {
  useAuth,
} from "../contexts/AuthContext";

import AdminLayout from "../components/layout/AdminLayout";
import LoadingState from "../components/common/LoadingState";


const STATUS_LABELS = {
  draft: "Draft",
  teacher_review: "Teacher Review",
  vp_review: "Vice Principal Review",
  approved: "Approved",
  published: "Published",
  changes_requested: "Changes Requested",
  rejected: "Rejected",
};


const ACTION_LABELS = {
  created_cms_user: "Created CMS User",
  updated_cms_user: "Updated CMS User",
  deleted_cms_user: "Deleted CMS User",

  created_society: "Created Society",
  updated_society: "Updated Society",
  deleted_society: "Deleted Society",

  assigned_teacher: "Assigned Teacher",
  assigned_event_staff: "Assigned Event Staff",
  removed_event_staff: "Removed Event Staff",

  created_event: "Created Event",
  updated_event: "Updated Event",
  submitted_event: "Submitted Event",
  approved_event: "Approved Event",
  published_event: "Published Event",
  rejected_event: "Rejected Event",

  checked_in_attendee: "Checked In Attendee",
};


function Admin() {
  const {
    profile,
    role,
  } = useAuth();


  const [
    events,
    setEvents,
  ] = useState([]);

  const [
    registrations,
    setRegistrations,
  ] = useState([]);

  const [
    users,
    setUsers,
  ] = useState([]);

  const [
    societies,
    setSocieties,
  ] = useState([]);

  const [
    logs,
    setLogs,
  ] = useState([]);

  const [
    analytics,
    setAnalytics,
  ] = useState(null);

  const [
    analyticsLoading,
    setAnalyticsLoading,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  async function loadAnalytics() {
    setAnalyticsLoading(
      true
    );


    const {
      data,
      error,
    } = await supabase.rpc(
      "get_eventhub_analytics"
    );


    if (error) {
      const message =
        (
          error.message ||
          ""
        ).toLowerCase();


      if (
        !message.includes(
          "permission"
        )
      ) {
        console.error(
          "Dashboard analytics:",
          error
        );
      }


      setAnalytics(
        null
      );

      setAnalyticsLoading(
        false
      );

      return;
    }


    setAnalytics(
      data ||
      null
    );

    setAnalyticsLoading(
      false
    );
  }


  async function loadDashboard() {
    setLoading(
      true
    );

    setError("");


    try {
      await refreshEventLifecycle();
    } catch (
      lifecycleError
    ) {
      console.error(
        "Could not refresh event lifecycle:",
        lifecycleError
      );
    }


    const [
      eventsResult,
      registrationsResult,
      usersResult,
      societiesResult,
      logsResult,
    ] = await Promise.all([

      supabase
        .from("events")
        .select(`
          id,
          title,
          category,
          event_date,
          event_time,
          location,
          approval_status,
          status,
          capacity,
          registration_enabled,
          society_id,
          created_by
        `)
        .order(
          "event_date",
          {
            ascending:
              true,
          }
        ),


      supabase
        .from("registrations")
        .select(`
          id,
          event_id,
          checked_in
        `),


      supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          role,
          is_active
        `),


      supabase
        .from("societies")
        .select(`
          id,
          name,
          code
        `),


      supabase
        .from("activity_logs")
        .select(`
          id,
          user_id,
          action,
          entity_type,
          entity_id,
          details,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(6),

    ]);


    if (
      eventsResult.error
    ) {
      console.error(
        "Dashboard events:",
        eventsResult.error
      );

      setError(
        "Some dashboard information could not be loaded."
      );

      setEvents([]);
    } else {
      setEvents(
        eventsResult.data ||
        []
      );
    }


    if (
      registrationsResult.error
    ) {
      console.error(
        "Dashboard registrations:",
        registrationsResult.error
      );

      setRegistrations([]);
    } else {
      setRegistrations(
        registrationsResult.data ||
        []
      );
    }


    if (
      usersResult.error
    ) {
      console.error(
        "Dashboard users:",
        usersResult.error
      );

      setUsers([]);
    } else {
      setUsers(
        usersResult.data ||
        []
      );
    }


    if (
      societiesResult.error
    ) {
      console.error(
        "Dashboard societies:",
        societiesResult.error
      );

      setSocieties([]);
    } else {
      setSocieties(
        societiesResult.data ||
        []
      );
    }


    if (
      logsResult.error
    ) {
      console.error(
        "Dashboard logs:",
        logsResult.error
      );

      setLogs([]);
    } else {
      const rawLogs =
        logsResult.data ||
        [];


      const userIds = [
        ...new Set(
          rawLogs
            .map(
              (log) =>
                log.user_id
            )
            .filter(
              Boolean
            )
        ),
      ];


      let actorProfiles =
        [];


      if (
        userIds.length >
        0
      ) {
        const {
          data,
          error,
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


        if (error) {
          console.error(
            "Dashboard log profiles:",
            error
          );
        } else {
          actorProfiles =
            data ||
            [];
        }
      }


      const actorMap =
        new Map(
          actorProfiles.map(
            (actor) => [
              actor.id,
              actor,
            ]
          )
        );


      setLogs(
        rawLogs.map(
          (log) => ({
            ...log,

            actor:
              actorMap.get(
                log.user_id
              ) ||
              null,
          })
        )
      );
    }


    await loadAnalytics();


    setLoading(
      false
    );
  }


  useEffect(() => {
    loadDashboard();
  }, []);


  const stats =
    useMemo(() => {
      const published =
        events.filter(
          (event) =>
            event
              .approval_status ===
            "published"
        ).length;


      const pending =
        events.filter(
          (event) =>
            [
              "teacher_review",
              "vp_review",
            ].includes(
              event
                .approval_status
            )
        ).length;


      const activeUsers =
        users.filter(
          (user) =>
            user.is_active
        ).length;


      const localCheckedIn =
        registrations.filter(
          (registration) =>
            registration
              .checked_in
        ).length;


      return {
        totalEvents:
          analytics
            ?.total_events ??
          events.length,

        published:
          analytics
            ?.published_events ??
          published,

        pending:
          analytics
            ?.pending_approvals ??
          pending,

        registrations:
          analytics
            ?.total_registrations ??
          registrations.length,

        checkedIn:
          analytics
            ?.checked_in ??
          localCheckedIn,

        attendanceRate:
          Number(
            analytics
              ?.attendance_rate ??
            (
              registrations.length >
              0
                ? (
                    localCheckedIn /
                    registrations.length
                  ) *
                  100
                : 0
            )
          ),

        activeUsers,

        societies:
          societies.length,
      };
    }, [
      events,
      registrations,
      users,
      societies,
      analytics,
    ]);


  const upcomingEvents =
    useMemo(() => {
      const today =
        new Date();


      today.setHours(
        0,
        0,
        0,
        0
      );


      return events
        .filter(
          (event) => {
            if (
              !event.event_date
            ) {
              return false;
            }


            const eventDate =
              new Date(
                `${event.event_date}T00:00:00`
              );


            return (
              eventDate >=
                today &&
              event
                .approval_status ===
                "published" &&
              ![
                "completed",
                "cancelled",
              ].includes(
                event.status
              )
            );
          }
        )
        .slice(
          0,
          5
        );
    }, [
      events,
    ]);


  const pendingEvents =
    useMemo(() => {
      return events
        .filter(
          (event) =>
            [
              "teacher_review",
              "vp_review",
            ].includes(
              event
                .approval_status
            )
        )
        .slice(
          0,
          5
        );
    }, [
      events,
    ]);


  const todayEventCount =
    useMemo(() => {
      const today =
        new Date()
          .toISOString()
          .slice(
            0,
            10
          );


      return events.filter(
        (event) =>
          event.event_date ===
            today &&
          event
            .approval_status ===
            "published" &&
          ![
            "completed",
            "cancelled",
          ].includes(
            event.status
          )
      ).length;
    }, [
      events,
    ]);


  const soldOutCount =
    useMemo(() => {
      return events.filter(
        (event) =>
          event.status ===
          "sold_out"
      ).length;
    }, [
      events,
    ]);


  const liveEventCount =
    useMemo(() => {
      return events.filter(
        (event) =>
          event.status ===
            "live" &&
          event
            .approval_status ===
            "published"
      ).length;
    }, [
      events,
    ]);


  const topEvent =
    analytics
      ?.top_event ||
    null;


  if (
    loading
  ) {
    return (
      <AdminLayout>

        <LoadingState
          label="Loading command center..."
        />

      </AdminLayout>
    );
  }


  return (
    <AdminLayout>

      <div className="admin-page-heading">

        <div>

          <span className="admin-eyebrow">
            EventHub Command Center
          </span>


          <h1>
            Welcome back
            {profile?.full_name
              ? `, ${getFirstName(
                  profile.full_name
                )}`
              : ""}
          </h1>


          <p>
            Monitor school events,
            registrations, approvals,
            attendance and CMS activity
            from one place.
          </p>

        </div>


        <div className="admin-dashboard-role">

          <span>
            Signed in as
          </span>

          <strong>
            {profile?.title ||
              formatRole(
                role
              )}
          </strong>


          {profile?.title && (
            <small>
              {formatRole(
                role
              )}
            </small>
          )}

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


      <section className="admin-dashboard-alerts">

        <DashboardAlert
          label="Events Today"
          value={
            todayEventCount
          }
          text="Scheduled today"
        />


        <DashboardAlert
          label="Live Events"
          value={
            liveEventCount
          }
          text="Currently active"
        />


        <DashboardAlert
          label="Pending Approvals"
          value={
            stats.pending
          }
          text="Need review"
        />


        <DashboardAlert
          label="Sold Out"
          value={
            soldOutCount
          }
          text="Capacity reached"
        />

      </section>


      <section className="admin-dashboard-stats">

        <DashboardStat
          label="Total Events"
          value={
            stats.totalEvents
          }
          description="Events in the CMS"
          icon="◫"
        />


        <DashboardStat
          label="Published"
          value={
            stats.published
          }
          description="Public events"
          icon="↑"
        />


        <DashboardStat
          label="Pending"
          value={
            stats.pending
          }
          description="Awaiting approval"
          icon="✓"
          highlight={
            stats.pending >
            0
          }
        />


        <DashboardStat
          label="Registrations"
          value={
            stats.registrations
          }
          description="Event registrations"
          icon="◇"
        />


        <DashboardStat
          label="Checked In"
          value={
            stats.checkedIn
          }
          description="Recorded attendance"
          icon="⌁"
        />


        <DashboardStat
          label="Attendance"
          value={
            `${formatPercentage(
              stats.attendanceRate
            )}%`
          }
          description="Overall attendance rate"
          icon="%"
        />


        <DashboardStat
          label="Active Users"
          value={
            stats.activeUsers
          }
          description="CMS accounts"
          icon="♙"
        />


        <DashboardStat
          label="Societies"
          value={
            stats.societies
          }
          description="School societies"
          icon="◎"
        />

      </section>


      {analytics && (
        <section className="admin-dashboard-section">

          <div className="admin-dashboard-section-heading">

            <div>

              <span className="admin-eyebrow">
                Event Intelligence
              </span>

              <h2>
                Attendance analytics
              </h2>

            </div>


            <button
              type="button"
              className="btn btn-outline"
              onClick={
                loadAnalytics
              }
              disabled={
                analyticsLoading
              }
            >
              {analyticsLoading
                ? "Refreshing..."
                : "Refresh analytics"}
            </button>

          </div>


          <div className="admin-analytics-grid">

            <article className="admin-analytics-card">

              <div className="admin-analytics-card-top">

                <span>
                  Attendance Rate
                </span>

                <strong>
                  {formatPercentage(
                    stats
                      .attendanceRate
                  )}
                  %
                </strong>

              </div>


              <div className="admin-analytics-progress">

                <span
                  style={{
                    width: `${Math.min(
                      Math.max(
                        stats
                          .attendanceRate,
                        0
                      ),
                      100
                    )}%`,
                  }}
                />

              </div>


              <p>
                {stats.checkedIn} of{" "}
                {stats.registrations}{" "}
                registered attendees have
                checked in.
              </p>

            </article>


            <article className="admin-analytics-card">

              <div className="admin-analytics-card-top">

                <span>
                  Approval Pipeline
                </span>

                <strong>
                  {
                    stats.pending
                  }
                </strong>

              </div>


              <p>
                {stats.pending ===
                1
                  ? "1 event is currently waiting for approval."
                  : `${stats.pending} events are currently waiting for approval.`}
              </p>


              {(role ===
                "principal" ||
                role ===
                  "vice_principal" ||
                role ===
                  "teacher") && (
                <Link
                  to="/admin/approvals"
                  className="admin-analytics-link"
                >
                  Review queue

                  <span>
                    →
                  </span>
                </Link>
              )}

            </article>


            <article className="admin-analytics-card admin-analytics-card-featured">

              <div className="admin-analytics-card-top">

                <span>
                  Most Registered Event
                </span>

                <strong>
                  {topEvent
                    ?.registrations ??
                    0}
                </strong>

              </div>


              <h3>
                {topEvent?.title ||
                  "No registration data"}
              </h3>


              <p>
                {topEvent
                  ? "Highest registration count across EventHub."
                  : "Registration activity will appear here once events receive attendees."}
              </p>


              {topEvent?.event_id && (
                <Link
                  to={`/events/${topEvent.event_id}`}
                  className="admin-analytics-link"
                >
                  View event

                  <span>
                    →
                  </span>
                </Link>
              )}

            </article>

          </div>

        </section>
      )}


      <section className="admin-dashboard-section">

        <div className="admin-dashboard-section-heading">

          <div>

            <span className="admin-eyebrow">
              Quick Access
            </span>

            <h2>
              Management
            </h2>

          </div>

        </div>


        <div className="admin-dashboard-actions">

          <Link
            to="/admin/events"
            className="admin-dashboard-action"
          >

            <span className="admin-dashboard-action-icon">
              +
            </span>

            <div>

              <strong>
                Manage Events
              </strong>

              <span>
                Create and edit events
              </span>

            </div>

            <b>
              →
            </b>

          </Link>


          {(role ===
            "principal" ||
            role ===
              "vice_principal" ||
            role ===
              "teacher") && (
            <Link
              to="/admin/approvals"
              className="admin-dashboard-action"
            >

              <span className="admin-dashboard-action-icon">
                ✓
              </span>

              <div>

                <strong>
                  Approval Queue
                </strong>

                <span>
                  {stats.pending} pending
                  submissions
                </span>

              </div>

              <b>
                →
              </b>

            </Link>
          )}


          {(role ===
            "principal" ||
            role ===
              "vice_principal") && (
            <Link
              to="/admin/announcements"
              className="admin-dashboard-action"
            >

              <span className="admin-dashboard-action-icon">
                ◉
              </span>

              <div>

                <strong>
                  Announcements
                </strong>

                <span>
                  Manage school notices
                </span>

              </div>

              <b>
                →
              </b>

            </Link>
          )}


          {(role ===
            "principal" ||
            role ===
              "teacher") && (
            <Link
              to="/admin/registrations"
              className="admin-dashboard-action"
            >

              <span className="admin-dashboard-action-icon">
                ◇
              </span>

              <div>

                <strong>
                  Registrations
                </strong>

                <span>
                  View event registrations
                </span>

              </div>

              <b>
                →
              </b>

            </Link>
          )}


          {(role ===
            "principal" ||
            role ===
              "event_staff") && (
            <Link
              to="/admin/check-in"
              className="admin-dashboard-action"
            >

              <span className="admin-dashboard-action-icon">
                ⌁
              </span>

              <div>

                <strong>
                  Event Check-in
                </strong>

                <span>
                  Scan attendee tickets
                </span>

              </div>

              <b>
                →
              </b>

            </Link>
          )}

        </div>

      </section>


      <div className="admin-dashboard-grid">

        <section className="admin-dashboard-card">

          <div className="admin-dashboard-card-header">

            <div>

              <span>
                Schedule
              </span>

              <h2>
                Upcoming Events
              </h2>

            </div>


            <Link
              to="/admin/events"
            >
              View all →
            </Link>

          </div>


          {upcomingEvents.length ===
          0 ? (
            <DashboardEmpty
              title="No upcoming events"
              description="Published upcoming events will appear here."
            />
          ) : (
            <div className="admin-dashboard-event-list">

              {upcomingEvents.map(
                (event) => (
                  <article
                    key={
                      event.id
                    }
                    className="admin-dashboard-event"
                  >

                    <div className="admin-dashboard-event-date">

                      <strong>
                        {getDay(
                          event
                            .event_date
                        )}
                      </strong>

                      <span>
                        {getMonth(
                          event
                            .event_date
                        )}
                      </span>

                    </div>


                    <div className="admin-dashboard-event-main">

                      <span>
                        {event.category ||
                          "School Event"}
                      </span>

                      <h3>
                        {event.title}
                      </h3>

                      <p>
                        {formatEventTime(
                          event
                            .event_time
                        )}
                        {" · "}
                        {event.location ||
                          "Venue TBA"}
                      </p>

                    </div>


                    <span
                      className={
                        `admin-event-status admin-event-status--${event.approval_status}`
                      }
                    >
                      {STATUS_LABELS[
                        event
                          .approval_status
                      ] ||
                        event
                          .approval_status}
                    </span>

                  </article>
                )
              )}

            </div>
          )}

        </section>


        <section className="admin-dashboard-card">

          <div className="admin-dashboard-card-header">

            <div>

              <span>
                Workflow
              </span>

              <h2>
                Pending Approvals
              </h2>

            </div>


            {(role ===
              "principal" ||
              role ===
                "vice_principal" ||
              role ===
                "teacher") && (
              <Link
                to="/admin/approvals"
              >
                Review →
              </Link>
            )}

          </div>


          {pendingEvents.length ===
          0 ? (
            <DashboardEmpty
              title="Approval queue is clear"
              description="There are no events awaiting approval."
            />
          ) : (
            <div className="admin-dashboard-approval-list">

              {pendingEvents.map(
                (event) => (
                  <article
                    key={
                      event.id
                    }
                    className="admin-dashboard-approval"
                  >

                    <div>

                      <span>
                        {event.category ||
                          "School Event"}
                      </span>

                      <h3>
                        {event.title}
                      </h3>

                      <p>
                        {formatEventDate(
                          event
                            .event_date
                        )}
                      </p>

                    </div>


                    <span
                      className={
                        `admin-event-status admin-event-status--${event.approval_status}`
                      }
                    >
                      {STATUS_LABELS[
                        event
                          .approval_status
                      ] ||
                        event
                          .approval_status}
                    </span>

                  </article>
                )
              )}

            </div>
          )}

        </section>

      </div>


      {role ===
        "principal" && (
        <section className="admin-dashboard-section">

          <div className="admin-dashboard-section-heading">

            <div>

              <span className="admin-eyebrow">
                System Oversight
              </span>

              <h2>
                Recent Activity
              </h2>

            </div>


            <Link
              to="/admin/logs"
              className="admin-dashboard-view-link"
            >
              View activity logs →
            </Link>

          </div>


          <div className="admin-dashboard-activity">

            {logs.length ===
            0 ? (
              <DashboardEmpty
                title="No recent activity"
                description="Recent CMS actions will appear here."
              />
            ) : (
              logs.map(
                (log) => {
                  const actor =
                    log.actor
                      ?.full_name ||
                    log.actor
                      ?.email ||
                    "System User";


                  return (
                    <article
                      key={
                        log.id
                      }
                      className="admin-dashboard-log"
                    >

                      <div className="admin-dashboard-log-icon">
                        {getLogIcon(
                          log.action
                        )}
                      </div>


                      <div className="admin-dashboard-log-main">

                        <strong>
                          {ACTION_LABELS[
                            log.action
                          ] ||
                            formatText(
                              log.action
                            )}
                        </strong>

                        <span>
                          {actor}
                        </span>

                      </div>


                      <time
                        dateTime={
                          log.created_at
                        }
                      >
                        {formatRelativeTime(
                          log
                            .created_at
                        )}
                      </time>

                    </article>
                  );
                }
              )
            )}

          </div>

        </section>
      )}

    </AdminLayout>
  );
}


function DashboardStat({
  label,
  value,
  description,
  icon,
  highlight = false,
}) {
  return (
    <article
      className={
        highlight
          ? "admin-dashboard-stat highlight"
          : "admin-dashboard-stat"
      }
    >

      <div className="admin-dashboard-stat-top">

        <span>
          {label}
        </span>

        <div>
          {icon}
        </div>

      </div>


      <strong>
        {value}
      </strong>


      <p>
        {description}
      </p>

    </article>
  );
}


function DashboardAlert({
  label,
  value,
  text,
}) {
  return (
    <article className="admin-dashboard-alert">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

      <small>
        {text}
      </small>

    </article>
  );
}


function DashboardEmpty({
  title,
  description,
}) {
  return (
    <div className="admin-dashboard-empty">

      <strong>
        {title}
      </strong>

      <span>
        {description}
      </span>

    </div>
  );
}


function getFirstName(
  name
) {
  if (!name) {
    return "";
  }


  return name
    .trim()
    .split(/\s+/)[0];
}


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

    event_staff:
      "Event Staff",
  };


  return (
    labels[role] ||
    formatText(
      role
    )
  );
}


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
        letter.toUpperCase()
    );
}


function formatPercentage(
  value
) {
  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {
    return "0";
  }


  return number
    .toFixed(1)
    .replace(
      /\.0$/,
      ""
    );
}


function formatEventTime(
  time
) {
  if (!time) {
    return "Time TBA";
  }


  const match =
    String(
      time
    ).match(
      /^(\d{2}):(\d{2})/
    );


  if (!match) {
    return String(
      time
    );
  }


  let hours =
    Number(
      match[1]
    );


  const minutes =
    match[2];


  const modifier =
    hours >=
    12
      ? "PM"
      : "AM";


  hours =
    hours %
      12 ||
    12;


  return `${hours}:${minutes} ${modifier}`;
}


function formatEventDate(
  date
) {
  if (!date) {
    return "Date TBA";
  }


  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",
    }
  );
}


function getDay(
  date
) {
  if (!date) {
    return "--";
  }


  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString(
    "en-US",
    {
      day:
        "2-digit",
    }
  );
}


function getMonth(
  date
) {
  if (!date) {
    return "TBA";
  }


  return new Date(
    `${date}T00:00:00`
  )
    .toLocaleDateString(
      "en-US",
      {
        month:
          "short",
      }
    )
    .toUpperCase();
}


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
      "deleted"
    ) ||
    action?.includes(
      "removed"
    )
  ) {
    return "×";
  }


  if (
    action?.includes(
      "approved"
    ) ||
    action?.includes(
      "checked_in"
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
    )
  ) {
    return "×";
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


function formatRelativeTime(
  value
) {
  if (!value) {
    return "";
  }


  const date =
    new Date(
      value
    );


  const now =
    new Date();


  const difference =
    now.getTime() -
    date.getTime();


  const minutes =
    Math.floor(
      difference /
      60000
    );


  if (
    minutes <
    1
  ) {
    return "Just now";
  }


  if (
    minutes <
    60
  ) {
    return `${minutes}m ago`;
  }


  const hours =
    Math.floor(
      minutes /
      60
    );


  if (
    hours <
    24
  ) {
    return `${hours}h ago`;
  }


  const days =
    Math.floor(
      hours /
      24
    );


  if (
    days <
    7
  ) {
    return `${days}d ago`;
  }


  return date
    .toLocaleDateString(
      "en-US",
      {
        month:
          "short",

        day:
          "numeric",
      }
    );
}


export default Admin;