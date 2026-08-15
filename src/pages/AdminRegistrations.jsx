import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../services/supabase";

import AdminLayout from "../components/layout/AdminLayout";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";


function AdminRegistrations() {
  const [
    registrations,
    setRegistrations,
  ] = useState([]);

  const [
    events,
    setEvents,
  ] = useState([]);

  const [
    waitlist,
    setWaitlist,
  ] = useState([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedEvent,
    setSelectedEvent,
  ] = useState("all");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    exporting,
    setExporting,
  ] = useState(false);

  const [
    waitlistActionId,
    setWaitlistActionId,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");


  async function fetchData() {
    setLoading(true);
    setError("");

    const [
      registrationResult,
      eventResult,
      waitlistResult,
    ] = await Promise.all([
      supabase
        .from("registrations")
        .select(`
          id,
          created_at,
          name,
          email,
          event_id,
          ticket_code,
          checked_in,
          checked_in_at,
          student_user_id
        `)
        .order(
          "created_at",
          {
            ascending: false,
          }
        ),

      supabase
        .from("events")
        .select(`
          id,
          title,
          event_date,
          capacity,
          registration_enabled
        `)
        .order(
          "event_date",
          {
            ascending: true,
          }
        ),

      supabase
        .from("event_waitlist")
        .select(`
          id,
          event_id,
          name,
          email,
          student_user_id,
          status,
          promoted_at,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending: true,
          }
        ),
    ]);

    const errors = [];

    if (
      registrationResult.error
    ) {
      console.error(
        "Could not load registrations:",
        registrationResult.error
      );

      errors.push(
        "registrations"
      );

      setRegistrations([]);
    } else {
      setRegistrations(
        registrationResult.data ||
        []
      );
    }

    if (
      eventResult.error
    ) {
      console.error(
        "Could not load event information:",
        eventResult.error
      );

      errors.push(
        "event information"
      );

      setEvents([]);
    } else {
      setEvents(
        eventResult.data ||
        []
      );
    }

    if (
      waitlistResult.error
    ) {
      console.error(
        "Could not load waitlist:",
        waitlistResult.error
      );

      errors.push(
        "waitlist"
      );

      setWaitlist([]);
    } else {
      setWaitlist(
        waitlistResult.data ||
        []
      );
    }

    if (
      errors.length > 0
    ) {
      setError(
        `Could not load ${errors.join(
          ", "
        )}.`
      );
    }

    setLoading(false);
  }


  useEffect(() => {
    fetchData();
  }, []);


  const eventMap =
    useMemo(() => {
      return new Map(
        events.map(
          (event) => [
            String(
              event.id
            ),
            event,
          ]
        )
      );
    }, [
      events,
    ]);


  function getEvent(
    eventId
  ) {
    return (
      eventMap.get(
        String(
          eventId
        )
      ) ||
      null
    );
  }


  function getEventName(
    eventId
  ) {
    return (
      getEvent(
        eventId
      )?.title ||
      "Unknown Event"
    );
  }


  const filteredRegistrations =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return registrations.filter(
        (
          registration
        ) => {
          const eventName =
            getEventName(
              registration.event_id
            );

          const matchesSearch =
            !query ||
            registration.name
              ?.toLowerCase()
              .includes(
                query
              ) ||
            registration.email
              ?.toLowerCase()
              .includes(
                query
              ) ||
            registration.ticket_code
              ?.toLowerCase()
              .includes(
                query
              ) ||
            eventName
              .toLowerCase()
              .includes(
                query
              );

          const matchesEvent =
            selectedEvent ===
              "all" ||
            String(
              registration.event_id
            ) ===
              String(
                selectedEvent
              );

          return (
            matchesSearch &&
            matchesEvent
          );
        }
      );
    }, [
      search,
      registrations,
      eventMap,
      selectedEvent,
    ]);


  const filteredWaitlist =
    useMemo(() => {
      return waitlist.filter(
        (item) =>
          selectedEvent ===
            "all" ||
          String(
            item.event_id
          ) ===
            String(
              selectedEvent
            )
      );
    }, [
      waitlist,
      selectedEvent,
    ]);


  const checkedInCount =
    useMemo(() => {
      return filteredRegistrations
        .filter(
          (
            registration
          ) =>
            registration
              .checked_in
        )
        .length;
    }, [
      filteredRegistrations,
    ]);


  const waitingCount =
    useMemo(() => {
      return filteredWaitlist
        .filter(
          (item) =>
            item.status ===
            "waiting"
        )
        .length;
    }, [
      filteredWaitlist,
    ]);


  async function exportAttendance() {
    if (
      selectedEvent ===
      "all"
    ) {
      setError(
        "Select an event before exporting attendance."
      );

      return;
    }

    setExporting(true);
    setError("");
    setSuccess("");

    const {
      data,
      error:
        exportError,
    } = await supabase
      .rpc(
        "export_event_attendance",
        {
          p_event_id:
            Number(
              selectedEvent
            ),
        }
      );

    if (
      exportError
    ) {
      console.error(
        "Attendance export failed:",
        exportError
      );

      setError(
        getActionError(
          exportError,
          "Could not export attendance."
        )
      );

      setExporting(false);

      return;
    }

    const rows =
      Array.isArray(
        data
      )
        ? data
        : [];

    const csv =
      createCsv(
        rows
      );

    const eventName =
      getEventName(
        selectedEvent
      );

    downloadCsv(
      csv,
      `${cleanFileName(
        eventName
      )}-attendance.csv`
    );

    setSuccess(
      `Attendance exported for ${eventName}.`
    );

    setExporting(false);
  }


  async function promoteWaitlist(
    item
  ) {
    if (
      item.status !==
      "waiting"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Promote ${item.name || "this attendee"} from the waitlist?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setWaitlistActionId(
      item.id
    );

    setError("");
    setSuccess("");

    const {
      data,
      error:
        promotionError,
    } = await supabase
      .rpc(
        "promote_waitlist_entry",
        {
          p_waitlist_id:
            item.id,
        }
      );

    if (
      promotionError
    ) {
      console.error(
        "Waitlist promotion failed:",
        promotionError
      );

      const message =
        String(
          promotionError.message ||
          ""
        ).toLowerCase();

      if (
        message.includes(
          "full capacity"
        ) ||
        message.includes(
          "at capacity"
        )
      ) {
        setError(
          "This event is still at full capacity."
        );
      } else if (
        message.includes(
          "already registered"
        ) ||
        message.includes(
          "duplicate"
        )
      ) {
        setError(
          "This attendee is already registered for the event."
        );
      } else if (
        message.includes(
          "no longer waiting"
        ) ||
        message.includes(
          "already processed"
        )
      ) {
        setError(
          "This waitlist entry has already been processed."
        );
      } else if (
        message.includes(
          "not found"
        )
      ) {
        setError(
          "This waitlist entry could not be found."
        );
      } else if (
        message.includes(
          "permission"
        )
      ) {
        setError(
          "You do not have permission to promote waitlist entries."
        );
      } else if (
        message.includes(
          "authentication"
        ) ||
        message.includes(
          "unauthorized"
        )
      ) {
        setError(
          "Your session is not authorized. Sign in again."
        );
      } else {
        setError(
          "Could not promote this waitlist entry."
        );
      }

      setWaitlistActionId(
        null
      );

      return;
    }

    if (
      !data ||
      data.success !==
        true
    ) {
      setError(
        "Could not promote this waitlist entry."
      );

      setWaitlistActionId(
        null
      );

      return;
    }

    const ticketText =
      data.ticket_code
        ? ` Ticket ${data.ticket_code} is ready.`
        : "";

    setSuccess(
      `${data.name || item.name || "Attendee"} was promoted successfully.${ticketText}`
    );

    setWaitlistActionId(
      null
    );

    await fetchData();
  }


  async function cancelWaitlist(
    item
  ) {
    if (
      item.status !==
      "waiting"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Remove ${item.name || "this attendee"} from the waitlist?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setWaitlistActionId(
      item.id
    );

    setError("");
    setSuccess("");

    const {
      error:
        updateError,
    } = await supabase
      .from(
        "event_waitlist"
      )
      .update({
        status:
          "cancelled",
      })
      .eq(
        "id",
        item.id
      )
      .eq(
        "status",
        "waiting"
      );

    if (
      updateError
    ) {
      console.error(
        "Could not remove waitlist entry:",
        updateError
      );

      setError(
        getActionError(
          updateError,
          "Could not update the waitlist entry."
        )
      );

      setWaitlistActionId(
        null
      );

      return;
    }

    setSuccess(
      `${item.name || "Attendee"} was removed from the waitlist.`
    );

    setWaitlistActionId(
      null
    );

    await fetchData();
  }


  return (
    <AdminLayout>

      <div className="admin-page-heading">

        <div>

          <span className="admin-eyebrow">
            Attendee Management
          </span>

          <h1>
            Registrations
          </h1>

          <p>
            Review attendees, attendance,
            waitlists and issued digital
            tickets.
          </p>

        </div>


        <div className="admin-page-count">

          <strong>
            {
              registrations
                .length
            }
          </strong>

          <span>
            Total registrations
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


      <section className="admin-registration-stats">

        <div>

          <span>
            Showing
          </span>

          <strong>
            {
              filteredRegistrations
                .length
            }
          </strong>

        </div>


        <div>

          <span>
            Checked in
          </span>

          <strong>
            {
              checkedInCount
            }
          </strong>

        </div>


        <div>

          <span>
            Waiting
          </span>

          <strong>
            {
              waitingCount
            }
          </strong>

        </div>

      </section>


      <section className="admin-registration-panel">

        <div className="admin-registration-toolbar">

          <div>

            <span>
              Registration directory
            </span>

            <h2>
              Attendees
            </h2>

          </div>


          <div className="admin-registration-toolbar-actions">

            <select
              value={
                selectedEvent
              }
              onChange={(
                event
              ) => {
                setSelectedEvent(
                  event.target
                    .value
                );

                setError("");
                setSuccess("");
              }}
              aria-label="Filter registrations by event"
            >

              <option value="all">
                All events
              </option>


              {events.map(
                (event) => (
                  <option
                    key={
                      event.id
                    }
                    value={
                      event.id
                    }
                  >
                    {
                      event.title
                    }
                  </option>
                )
              )}

            </select>


            <button
              type="button"
              className="btn btn-outline"
              onClick={
                exportAttendance
              }
              disabled={
                exporting ||
                selectedEvent ===
                  "all"
              }
            >
              {exporting
                ? "Exporting..."
                : "Export CSV"}
            </button>


            <div className="admin-registration-search">

              <span>
                ⌕
              </span>

              <input
                type="search"
                placeholder="Search name, email, event or ticket..."
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
              />

            </div>

          </div>

        </div>


        <div className="admin-registration-summary">

          <span>
            Showing{" "}
            {
              filteredRegistrations
                .length
            }{" "}
            of{" "}
            {
              registrations
                .length
            }{" "}
            registrations
          </span>

        </div>


        {loading ? (
          <LoadingState
            label="Loading registrations..."
          />
        ) : filteredRegistrations
            .length ===
          0 ? (
          <EmptyState
            title={
              search ||
              selectedEvent !==
                "all"
                ? "No matching registrations"
                : "No registrations yet"
            }
            description={
              search ||
              selectedEvent !==
                "all"
                ? "Try another search or event filter."
                : "Registrations submitted through EventHub will appear here."
            }
          />
        ) : (
          <div className="admin-registration-table-wrap">

            <table className="admin-registration-table">

              <thead>

                <tr>

                  <th>
                    Attendee
                  </th>

                  <th>
                    Event
                  </th>

                  <th>
                    Ticket ID
                  </th>

                  <th>
                    Attendance
                  </th>

                  <th>
                    Registered
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredRegistrations.map(
                  (
                    registration
                  ) => (
                    <tr
                      key={
                        registration.id
                      }
                    >

                      <td>

                        <div className="admin-attendee-cell">

                          <div className="admin-attendee-avatar">
                            {getInitial(
                              registration.name
                            )}
                          </div>


                          <div>

                            <strong>
                              {registration.name ||
                                "Unknown attendee"}
                            </strong>

                            <span>
                              {registration.email ||
                                "No email"}
                            </span>

                          </div>

                        </div>

                      </td>


                      <td>

                        <span className="admin-event-chip">
                          {getEventName(
                            registration.event_id
                          )}
                        </span>

                      </td>


                      <td>

                        <code className="admin-ticket-code">
                          {registration.ticket_code ||
                            "Pending"}
                        </code>

                      </td>


                      <td>

                        <div className="admin-registration-attendance">

                          <span
                            className={
                              registration
                                .checked_in
                                ? "admin-registration-status checked-in"
                                : "admin-registration-status pending"
                            }
                          >
                            {registration
                              .checked_in
                              ? "Checked in"
                              : "Not checked in"}
                          </span>


                          {registration
                            .checked_in_at && (
                            <small>
                              {formatDate(
                                registration
                                  .checked_in_at
                              )}
                            </small>
                          )}

                        </div>

                      </td>


                      <td>

                        <span className="admin-registration-date">
                          {formatDate(
                            registration
                              .created_at
                          )}
                        </span>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>


      <section className="admin-registration-panel admin-waitlist-panel">

        <div className="admin-registration-toolbar">

          <div>

            <span>
              Capacity Management
            </span>

            <h2>
              Event Waitlist
            </h2>

          </div>


          <div className="admin-waitlist-count">

            <strong>
              {
                waitingCount
              }
            </strong>

            <span>
              Waiting
            </span>

          </div>

        </div>


        {loading ? (
          <LoadingState
            label="Loading waitlist..."
          />
        ) : filteredWaitlist
            .length ===
          0 ? (
          <EmptyState
            title="No waitlist entries"
            description={
              selectedEvent ===
                "all"
                ? "Waitlisted attendees will appear here."
                : "There are no waitlist entries for this event."
            }
          />
        ) : (
          <div className="admin-waitlist-list">

            {filteredWaitlist.map(
              (
                item
              ) => {
                const processing =
                  String(
                    waitlistActionId
                  ) ===
                  String(
                    item.id
                  );

                const status =
                  item.status ||
                  "waiting";

                return (
                  <article
                    key={
                      item.id
                    }
                    className="admin-waitlist-row"
                  >

                    <div className="admin-attendee-avatar">
                      {getInitial(
                        item.name
                      )}
                    </div>


                    <div className="admin-waitlist-main">

                      <div className="admin-waitlist-heading">

                        <strong>
                          {item.name ||
                            "Unknown attendee"}
                        </strong>


                        <span
                          className={
                            `admin-waitlist-status admin-waitlist-status--${status}`
                          }
                        >
                          {formatWaitlistStatus(
                            status
                          )}
                        </span>

                      </div>


                      <span>
                        {item.email ||
                          "No email"}
                      </span>


                      <small>
                        {getEventName(
                          item.event_id
                        )}
                        {" · "}
                        Joined{" "}
                        {formatDate(
                          item.created_at
                        )}
                      </small>


                      {item.promoted_at && (
                        <small>
                          Promoted{" "}
                          {formatDate(
                            item.promoted_at
                          )}
                        </small>
                      )}

                    </div>


                    <div className="admin-waitlist-actions">

                      {status ===
                        "waiting" && (
                        <>
                          <button
                            type="button"
                            className="admin-action-button"
                            disabled={
                              processing
                            }
                            onClick={() =>
                              promoteWaitlist(
                                item
                              )
                            }
                          >
                            {processing
                              ? "Processing..."
                              : "Promote"}
                          </button>


                          <button
                            type="button"
                            className="admin-action-button danger"
                            disabled={
                              processing
                            }
                            onClick={() =>
                              cancelWaitlist(
                                item
                              )
                            }
                          >
                            {processing
                              ? "Processing..."
                              : "Remove"}
                          </button>
                        </>
                      )}


                      {status ===
                        "promoted" && (
                        <span className="admin-registration-status checked-in">
                          Promoted
                        </span>
                      )}


                      {status ===
                        "cancelled" && (
                        <span className="admin-registration-status pending">
                          Removed
                        </span>
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


function createCsv(
  rows
) {
  const headers = [
    "Attendee",
    "Email",
    "Ticket ID",
    "Checked In",
    "Checked In At",
    "Event",
  ];

  const values =
    rows.map(
      (row) => [
        row.attendee_name,
        row.attendee_email,
        row.ticket_code,
        row.checked_in
          ? "Yes"
          : "No",
        row.checked_in_at ||
          "",
        row.event_title,
      ]
    );

  return [
    headers,
    ...values,
  ]
    .map(
      (row) =>
        row
          .map(
            escapeCsvValue
          )
          .join(",")
    )
    .join("\r\n");
}


function escapeCsvValue(
  value
) {
  const text =
    String(
      value ??
      ""
    );

  return `"${text.replace(
    /"/g,
    '""'
  )}"`;
}


function downloadCsv(
  csv,
  fileName
) {
  const blob =
    new Blob(
      [
        "\uFEFF",
        csv,
      ],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href =
    url;

  link.download =
    fileName;

  link.style.display =
    "none";

  document.body
    .appendChild(
      link
    );

  link.click();

  link.remove();

  URL.revokeObjectURL(
    url
  );
}


function cleanFileName(
  value
) {
  const result =
    String(
      value ||
      "event"
    )
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  return (
    result ||
    "event"
  );
}


function formatDate(
  value
) {
  if (!value) {
    return "Unknown";
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
    return "Unknown";
  }

  return date.toLocaleString(
    "en-US",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}


function getInitial(
  name
) {
  const value =
    String(
      name ||
      ""
    ).trim();

  return value
    ? value
        .charAt(0)
        .toUpperCase()
    : "?";
}


function formatWaitlistStatus(
  status
) {
  const labels = {
    waiting:
      "Waiting",

    promoted:
      "Promoted",

    cancelled:
      "Cancelled",
  };

  return (
    labels[status] ||
    "Waiting"
  );
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
    return "You do not have permission to perform this action.";
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

  return fallback;
}


export default AdminRegistrations;