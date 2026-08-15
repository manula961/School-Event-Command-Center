import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { logActivity } from "../utils/activityLogger";

import AdminLayout from "../components/layout/AdminLayout";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";


const STATUS_LABELS = {
  teacher_review: "Teacher Review",
  vp_review: "Vice Principal Review",
  changes_requested: "Changes Requested",
  rejected: "Rejected",
};


function ApprovalQueue() {
  const {
    user,
    profile,
    role,
  } = useAuth();

  const [
    events,
    setEvents,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoadingId,
    setActionLoadingId,
  ] = useState(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");


  async function fetchPendingEvents() {
    if (!role) {
      return;
    }

    if (
      role === "teacher" &&
      !profile?.society_id
    ) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    let query = supabase
      .from("events")
      .select(`
        id,
        title,
        category,
        description,
        event_date,
        event_time,
        location,
        status,
        approval_status,
        society_id,
        created_by,
        submitted_at,
        teacher_approved_at
      `)
      .order(
        "submitted_at",
        {
          ascending: true,
          nullsFirst: false,
        }
      );

    if (
      role === "teacher"
    ) {
      query = query
        .eq(
          "society_id",
          profile.society_id
        )
        .eq(
          "approval_status",
          "teacher_review"
        );
    } else if (
      role ===
      "vice_principal"
    ) {
      query = query.eq(
        "approval_status",
        "vp_review"
      );
    } else if (
      role ===
      "principal"
    ) {
      query = query.in(
        "approval_status",
        [
          "teacher_review",
          "vp_review",
        ]
      );
    } else {
      setEvents([]);
      setLoading(false);
      return;
    }

    const {
      data,
      error:
        fetchError,
    } = await query;

    if (
      fetchError
    ) {
      console.error(
        "Could not load pending approvals:",
        fetchError
      );

      setError(
        "Could not load pending approvals."
      );

      setEvents([]);
      setLoading(false);

      return;
    }

    setEvents(
      data || []
    );

    setLoading(false);
  }


  useEffect(() => {
    fetchPendingEvents();
  }, [
    role,
    profile?.society_id,
  ]);


  async function recordApproval(
    eventId,
    action,
    comment
  ) {
    if (
      !user?.id
    ) {
      return false;
    }

    const {
      error:
        approvalError,
    } = await supabase
      .from("event_approvals")
      .insert({
        event_id:
          eventId,

        user_id:
          user.id,

        action,

        comment,
      });

    if (
      approvalError
    ) {
      console.error(
        "Could not record approval:",
        approvalError
      );

      return false;
    }

    return true;
  }


  async function changeStatus({
    eventId,
    status,
    action,
    comment,
    extraData = {},
  }) {
    if (
      !user?.id
    ) {
      setError(
        "Could not identify the current CMS user."
      );

      return false;
    }

    if (
      actionLoadingId
    ) {
      return false;
    }

    const currentEvent =
      events.find(
        (event) =>
          String(
            event.id
          ) ===
          String(
            eventId
          )
      );

    if (
      !currentEvent
    ) {
      setError(
        "This event is no longer available in the approval queue."
      );

      return false;
    }

    setActionLoadingId(
      eventId
    );

    setError("");
    setSuccess("");

    const previousStatus =
      currentEvent
        .approval_status ||
      null;

    const {
      data:
        updatedEvent,
      error:
        updateError,
    } = await supabase
      .from("events")
      .update({
        approval_status:
          status,

        ...extraData,
      })
      .eq(
        "id",
        eventId
      )
      .eq(
        "approval_status",
        previousStatus
      )
      .select(`
        id,
        title,
        category,
        society_id,
        approval_status
      `)
      .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "Could not update event approval:",
        updateError
      );

      setError(
        getActionError(
          updateError,
          "Could not update event approval."
        )
      );

      setActionLoadingId(
        null
      );

      return false;
    }

    if (
      !updatedEvent
    ) {
      setError(
        "This event was already updated by another CMS user. The queue has been refreshed."
      );

      setActionLoadingId(
        null
      );

      await fetchPendingEvents();

      return false;
    }

    await recordApproval(
      eventId,
      action,
      comment
    );

    await logActivity({
      action:
        getActivityAction(
          action,
          status
        ),

      entityType:
        "event",

      entityId:
        String(
          eventId
        ),

      details: {
        title:
          currentEvent.title ||
          "Unknown event",

        category:
          currentEvent.category ||
          null,

        previous_status:
          previousStatus,

        new_status:
          status,

        workflow_action:
          action,

        comment,

        performed_as:
          role,

        society_id:
          currentEvent
            .society_id ||
          null,
      },
    });

    setSuccess(
      getSuccessMessage(
        action,
        status
      )
    );

    setActionLoadingId(
      null
    );

    await fetchPendingEvents();

    return true;
  }


  async function approveByTeacher(
    eventId
  ) {
    await changeStatus({
      eventId,

      status:
        "vp_review",

      action:
        "approved",

      comment:
        "Approved by Teacher-in-Charge and forwarded to Vice Principal.",

      extraData: {
        teacher_approved_at:
          new Date()
            .toISOString(),
      },
    });
  }


  async function publishEvent(
    eventId
  ) {
    const currentEvent =
      events.find(
        (event) =>
          String(
            event.id
          ) ===
          String(
            eventId
          )
      );

    const confirmed =
      window.confirm(
        `Approve and publish ${
          currentEvent?.title ||
          "this event"
        }?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    if (
      !user?.id
    ) {
      setError(
        "Could not identify the current CMS user."
      );

      return;
    }

    const now =
      new Date()
        .toISOString();

    await changeStatus({
      eventId,

      status:
        "published",

      action:
        "published",

      comment:
        role ===
        "principal"
          ? "Published by Principal override."
          : "Final publication approved by Vice Principal.",

      extraData: {
        vp_approved_at:
          now,

        published_at:
          now,

        published_by:
          user.id,
      },
    });
  }


  async function requestChanges(
    eventId
  ) {
    const currentEvent =
      events.find(
        (event) =>
          String(
            event.id
          ) ===
          String(
            eventId
          )
      );

    const confirmed =
      window.confirm(
        `Return ${
          currentEvent?.title ||
          "this event"
        } for changes?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    let comment =
      "Changes requested by Teacher-in-Charge.";

    if (
      role ===
      "vice_principal"
    ) {
      comment =
        "Changes requested by Vice Principal.";
    }

    if (
      role ===
      "principal"
    ) {
      comment =
        "Changes requested by Principal.";
    }

    await changeStatus({
      eventId,

      status:
        "changes_requested",

      action:
        "changes_requested",

      comment,
    });
  }


  async function rejectEvent(
    eventId
  ) {
    const currentEvent =
      events.find(
        (event) =>
          String(
            event.id
          ) ===
          String(
            eventId
          )
      );

    const confirmed =
      window.confirm(
        `Reject ${
          currentEvent?.title ||
          "this event"
        }?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    await changeStatus({
      eventId,

      status:
        "rejected",

      action:
        "rejected",

      comment:
        role ===
        "principal"
          ? "Rejected by Principal."
          : "Rejected by Vice Principal.",
    });
  }


  async function principalSendToVP(
    eventId
  ) {
    const currentEvent =
      events.find(
        (event) =>
          String(
            event.id
          ) ===
          String(
            eventId
          )
      );

    const confirmed =
      window.confirm(
        `Override Teacher review and send ${
          currentEvent?.title ||
          "this event"
        } to Vice Principal review?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    await changeStatus({
      eventId,

      status:
        "vp_review",

      action:
        "approved",

      comment:
        "Teacher review stage overridden by Principal.",

      extraData: {
        teacher_approved_at:
          new Date()
            .toISOString(),
      },
    });
  }


  const filteredEvents =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (
        !query
      ) {
        return events;
      }

      return events.filter(
        (event) => {
          const statusLabel =
            STATUS_LABELS[
              event.approval_status
            ] ||
            event.approval_status ||
            "";

          const searchableText = [
            event.title,
            event.category,
            event.location,
            event.description,
            statusLabel,
          ]
            .filter(
              Boolean
            )
            .join(" ")
            .toLowerCase();

          return searchableText
            .includes(
              query
            );
        }
      );
    }, [
      events,
      search,
    ]);


  function renderActions(
    event
  ) {
    const processing =
      actionLoadingId ===
      event.id;

    const anotherProcessing =
      Boolean(
        actionLoadingId
      ) &&
      !processing;

    if (
      role ===
        "teacher" &&
      event.approval_status ===
        "teacher_review"
    ) {
      return (
        <>
          <button
            type="button"
            className="admin-action-button"
            disabled={
              processing ||
              anotherProcessing
            }
            onClick={() =>
              approveByTeacher(
                event.id
              )
            }
          >
            {processing
              ? "Processing..."
              : "Approve to VP"}
          </button>

          <button
            type="button"
            className="admin-action-button"
            disabled={
              processing ||
              anotherProcessing
            }
            onClick={() =>
              requestChanges(
                event.id
              )
            }
          >
            Request changes
          </button>
        </>
      );
    }

    if (
      (
        role ===
          "vice_principal" ||
        role ===
          "principal"
      ) &&
      event.approval_status ===
        "vp_review"
    ) {
      return (
        <>
          <button
            type="button"
            className="admin-action-button"
            disabled={
              processing ||
              anotherProcessing
            }
            onClick={() =>
              publishEvent(
                event.id
              )
            }
          >
            {processing
              ? "Processing..."
              : "Publish"}
          </button>

          <button
            type="button"
            className="admin-action-button"
            disabled={
              processing ||
              anotherProcessing
            }
            onClick={() =>
              requestChanges(
                event.id
              )
            }
          >
            Request changes
          </button>

          <button
            type="button"
            className="admin-action-button danger"
            disabled={
              processing ||
              anotherProcessing
            }
            onClick={() =>
              rejectEvent(
                event.id
              )
            }
          >
            Reject
          </button>
        </>
      );
    }

    if (
      role ===
        "principal" &&
      event.approval_status ===
        "teacher_review"
    ) {
      return (
        <>
          <button
            type="button"
            className="admin-action-button"
            disabled={
              processing ||
              anotherProcessing
            }
            onClick={() =>
              principalSendToVP(
                event.id
              )
            }
          >
            {processing
              ? "Processing..."
              : "Send to VP"}
          </button>

          <button
            type="button"
            className="admin-action-button"
            disabled={
              processing ||
              anotherProcessing
            }
            onClick={() =>
              requestChanges(
                event.id
              )
            }
          >
            Request changes
          </button>
        </>
      );
    }

    return null;
  }


  return (
    <AdminLayout>

      <div className="admin-page-heading">

        <div>

          <span className="admin-eyebrow">
            Approval Workflow
          </span>

          <h1>
            Approval Queue
          </h1>

          <p>
            Review pending event submissions
            and move them through the EventHub
            approval process.
          </p>

        </div>


        <div className="admin-page-count">

          <strong>
            {events.length}
          </strong>

          <span>
            Pending
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


      {success && (
        <div className="admin-inline-success">

          <span>
            ✓
          </span>

          <p>
            {success}
          </p>

        </div>
      )}


      <section className="admin-events-panel">

        <div className="admin-events-panel-header">

          <div>

            <span>
              Pending submissions
            </span>

            <h2>
              Events awaiting action
            </h2>

          </div>


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
                  event.target
                    .value
                )
              }
              placeholder="Search approvals..."
            />

          </div>

        </div>


        <div className="admin-events-results">

          <span>
            Showing{" "}
            {
              filteredEvents.length
            }{" "}
            of{" "}
            {
              events.length
            }{" "}
            pending
          </span>

        </div>


        {loading ? (
          <LoadingState
            label="Loading approval queue..."
          />
        ) : filteredEvents
            .length ===
          0 ? (
          <EmptyState
            title={
              search
                ? "No matching approvals"
                : "Approval queue is clear"
            }
            description={
              search
                ? "Try searching with a different event title, category, venue or status."
                : role ===
                    "teacher" &&
                  !profile?.society_id
                  ? "Your Teacher account is not assigned to a society."
                  : "There are no pending events requiring your attention."
            }
          />
        ) : (
          <div className="admin-event-list-new">

            {filteredEvents.map(
              (event) => {
                const approvalStatus =
                  event
                    .approval_status ||
                  "teacher_review";

                return (
                  <article
                    key={
                      event.id
                    }
                    className="admin-event-row-new"
                  >

                    <div className="admin-event-date-block">

                      <strong>
                        {getDay(
                          event.event_date
                        )}
                      </strong>

                      <span>
                        {getMonth(
                          event.event_date
                        )}
                      </span>

                    </div>


                    <div className="admin-event-row-main">

                      <div className="admin-event-row-top">

                        <span className="admin-event-category">
                          {event.category ||
                            "School Event"}
                        </span>


                        <span
                          className={
                            `admin-event-status admin-event-status--${approvalStatus}`
                          }
                        >
                          {STATUS_LABELS[
                            approvalStatus
                          ] ||
                            approvalStatus}
                        </span>


                        <span className="admin-event-id">
                          #
                          {String(
                            event.id
                          ).slice(
                            0,
                            8
                          )}
                        </span>

                      </div>


                      <h3>
                        {event.title}
                      </h3>


                      <div className="admin-event-row-meta">

                        <span>
                          ◷{" "}
                          {formatEventTime(
                            event.event_time
                          )}
                        </span>

                        <span>
                          ⌖{" "}
                          {event.location ||
                            "Venue TBA"}
                        </span>

                        {event.submitted_at && (
                          <span>
                            Submitted{" "}
                            {formatSubmittedDate(
                              event.submitted_at
                            )}
                          </span>
                        )}

                      </div>


                      {event.description && (
                        <p className="admin-approval-description">
                          {event.description}
                        </p>
                      )}

                    </div>


                    <div className="admin-event-row-actions">

                      {renderActions(
                        event
                      )}

                    </div>

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


function getActivityAction(
  action,
  status
) {
  if (
    action ===
      "approved" &&
    status ===
      "vp_review"
  ) {
    return "approved_event";
  }

  if (
    action ===
    "published"
  ) {
    return "published_event";
  }

  if (
    action ===
    "changes_requested"
  ) {
    return "changes_requested_event";
  }

  if (
    action ===
    "rejected"
  ) {
    return "rejected_event";
  }

  if (
    action ===
    "submitted"
  ) {
    return "submitted_event";
  }

  return "updated_event_workflow";
}


function getSuccessMessage(
  action,
  status
) {
  if (
    action ===
      "approved" &&
    status ===
      "vp_review"
  ) {
    return "Event approved and sent to the Vice Principal.";
  }

  if (
    action ===
    "published"
  ) {
    return "Event approved and published successfully.";
  }

  if (
    action ===
    "changes_requested"
  ) {
    return "Event returned for changes.";
  }

  if (
    action ===
    "rejected"
  ) {
    return "Event rejected.";
  }

  return "Event workflow updated successfully.";
}


function getActionError(
  error,
  fallback
) {
  const message =
    String(
      error?.message ||
      ""
    ).toLowerCase();

  if (
    message.includes(
      "permission"
    )
  ) {
    return "You do not have permission to perform this approval action.";
  }

  if (
    message.includes(
      "authentication"
    ) ||
    message.includes(
      "unauthorized"
    )
  ) {
    return "Your session is not authorized. Sign in again.";
  }

  if (
    message.includes(
      "disabled"
    )
  ) {
    return "Your CMS account is disabled.";
  }

  return fallback;
}


function formatEventTime(
  time
) {
  if (
    !time
  ) {
    return "Time TBA";
  }

  const match =
    String(
      time
    ).match(
      /^(\d{2}):(\d{2})/
    );

  if (
    !match
  ) {
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
    hours >= 12
      ? "PM"
      : "AM";

  hours =
    hours % 12 ||
    12;

  return `${hours}:${minutes} ${modifier}`;
}


function formatSubmittedDate(
  value
) {
  if (
    !value
  ) {
    return "";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleString(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",
    }
  );
}


function getDay(
  date
) {
  if (
    !date
  ) {
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
  if (
    !date
  ) {
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


export default ApprovalQueue;