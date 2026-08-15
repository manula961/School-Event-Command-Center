import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useLocation,
} from "react-router-dom";

import {
  QRCodeSVG,
} from "qrcode.react";

import { supabase } from "../services/supabase";
import { useStudentAuth } from "../contexts/StudentAuthContext";

import LoadingState from "../components/common/LoadingState";


function StudentTickets() {
  const location =
    useLocation();

  const {
    student,
    profile,
    loading: authLoading,
  } = useStudentAuth();


  const [
    registrations,
    setRegistrations,
  ] = useState([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState(
    location.state
      ?.registrationId ||
      null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  useEffect(() => {
    if (authLoading) {
      return;
    }


    async function fetchTickets() {
      if (!student?.id) {
        setRegistrations([]);
        setSelectedId(null);
        setLoading(false);

        return;
      }


      setLoading(true);
      setError("");


      const {
        data:
          registrationData,
        error:
          registrationError,
      } = await supabase
        .from("registrations")
        .select(`
          id,
          created_at,
          name,
          email,
          event_id,
          ticket_code,
          student_user_id,
          checked_in,
          checked_in_at
        `)
        .eq(
          "student_user_id",
          student.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );


      if (
        registrationError
      ) {
        console.error(
          "Could not load student tickets:",
          registrationError
        );

        setError(
          registrationError.message ||
          "Could not load your digital tickets."
        );

        setRegistrations([]);
        setSelectedId(null);
        setLoading(false);

        return;
      }


      const rows =
        registrationData ||
        [];


      const eventIds = [
        ...new Set(
          rows
            .map(
              (registration) =>
                registration
                  .event_id
            )
            .filter(
              (eventId) =>
                eventId !==
                  null &&
                eventId !==
                  undefined
            )
        ),
      ];


      let eventData =
        [];


      if (
        eventIds.length >
        0
      ) {
        const {
          data: events,
          error:
            eventError,
        } = await supabase
          .from("events")
          .select(`
            id,
            title,
            category,
            event_date,
            event_time,
            location,
            approval_status,
            status
          `)
          .in(
            "id",
            eventIds
          );


        if (
          eventError
        ) {
          console.error(
            "Could not load ticket events:",
            eventError
          );
        } else {
          eventData =
            events ||
            [];
        }
      }


      const eventMap =
        new Map(
          eventData.map(
            (event) => [
              String(
                event.id
              ),
              event,
            ]
          )
        );


      const combined =
        rows.map(
          (
            registration
          ) => ({
            ...registration,

            event:
              eventMap.get(
                String(
                  registration
                    .event_id
                )
              ) ||
              null,
          })
        );


      setRegistrations(
        combined
      );


      if (
        combined.length ===
        0
      ) {
        setSelectedId(
          null
        );

        setLoading(false);

        return;
      }


      const requestedId =
        location.state
          ?.registrationId;


      const requestedExists =
        requestedId &&
        combined.some(
          (
            registration
          ) =>
            String(
              registration.id
            ) ===
            String(
              requestedId
            )
        );


      setSelectedId(
        requestedExists
          ? requestedId
          : combined[0].id
      );


      setLoading(false);
    }


    fetchTickets();
  }, [
    student?.id,
    authLoading,
    location.state
      ?.registrationId,
  ]);


  const selectedRegistration =
    useMemo(() => {
      if (
        registrations.length ===
        0
      ) {
        return null;
      }


      return (
        registrations.find(
          (
            registration
          ) =>
            String(
              registration.id
            ) ===
            String(
              selectedId
            )
        ) ||
        registrations[0]
      );
    }, [
      registrations,
      selectedId,
    ]);


  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="student-tickets-page">

        <div className="container">

          <LoadingState
            label="Loading your tickets..."
          />

        </div>

      </main>
    );
  }


  return (
    <main className="student-tickets-page">

      <div className="container">

        <div className="student-page-heading">

          <div>

            <span className="section-kicker">
              Student Portal
            </span>

            <h1>
              My Tickets
            </h1>

            <p>
              Access your digital
              EventHub tickets for
              registered school
              events.
            </p>

          </div>


          <Link
            to="/student/dashboard"
            className="btn btn-outline"
          >
            ← Dashboard
          </Link>

        </div>


        {error && (
          <div className="student-registration-error">

            <span>
              !
            </span>

            <div>

              <strong>
                Could not load
                tickets
              </strong>

              <p>
                {error}
              </p>

            </div>

          </div>
        )}


        {!error &&
          registrations.length ===
            0 && (
            <section className="student-registrations-panel">

              <div className="student-registrations-empty">

                <span className="student-empty-number">
                  00
                </span>

                <h2>
                  No tickets yet
                </h2>

                <p>
                  Register for an
                  event and your
                  digital ticket
                  will appear here.
                </p>

                <Link
                  to="/events"
                  className="btn btn-primary"
                >
                  Browse Events

                  <span>
                    →
                  </span>
                </Link>

              </div>

            </section>
          )}


        {!error &&
          registrations.length >
            0 && (
            <div className="student-tickets-layout">

              <aside className="student-ticket-list">

                <div className="student-ticket-list-heading">

                  <span>
                    Tickets
                  </span>

                  <strong>
                    {
                      registrations.length
                    }
                  </strong>

                </div>


                {registrations.map(
                  (
                    registration
                  ) => {
                    const event =
                      registration.event;


                    return (
                      <button
                        key={
                          registration.id
                        }
                        type="button"
                        className={
                          String(
                            selectedRegistration
                              ?.id
                          ) ===
                          String(
                            registration.id
                          )
                            ? "student-ticket-list-item active"
                            : "student-ticket-list-item"
                        }
                        onClick={() =>
                          setSelectedId(
                            registration.id
                          )
                        }
                      >

                        <div className="student-ticket-list-date">

                          <strong>
                            {getDay(
                              event
                                ?.event_date
                            )}
                          </strong>

                          <span>
                            {getMonth(
                              event
                                ?.event_date
                            )}
                          </span>

                        </div>


                        <div>

                          <span>
                            {event
                              ?.category ||
                              "School Event"}
                          </span>

                          <strong>
                            {event
                              ?.title ||
                              "Event"}
                          </strong>

                          <small>
                            {registration
                              .ticket_code ||
                              "Ticket pending"}
                          </small>

                        </div>


                        {registration
                          .checked_in && (
                          <span className="student-ticket-list-checkin">
                            ✓
                          </span>
                        )}

                      </button>
                    );
                  }
                )}

              </aside>


              <section className="student-ticket-display">

                {selectedRegistration && (
                  <DigitalTicket
                    registration={
                      selectedRegistration
                    }
                    profile={
                      profile
                    }
                  />
                )}

              </section>

            </div>
          )}

      </div>

    </main>
  );
}


function DigitalTicket({
  registration,
  profile,
}) {
  const event =
    registration.event;

  const hasTicketCode =
    Boolean(
      registration
        .ticket_code
    );

  const eventStatus =
    event?.status ||
    null;


  return (
    <article className="student-ticket-card">

      <div className="student-ticket-card-top">

        <div>

          <span>
            EventHub
          </span>

          <strong>
            Digital Ticket
          </strong>

        </div>


        <span
          className={
            registration
              .checked_in
              ? "student-ticket-admit checked-in"
              : "student-ticket-admit"
          }
        >
          {registration
            .checked_in
            ? "Checked In"
            : "Admit One"}
        </span>

      </div>


      <div className="student-ticket-card-body">

        <span className="student-ticket-event-label">
          Registered Event
        </span>


        <h2>
          {event?.title ||
            "School Event"}
        </h2>


        {eventStatus && (
          <span
            className={
              `student-ticket-event-status student-ticket-event-status--${eventStatus}`
            }
          >
            {formatEventStatus(
              eventStatus
            )}
          </span>
        )}


        {!event && (
          <div className="student-ticket-event-warning">

            <span>
              !
            </span>

            <div>

              <strong>
                Event information unavailable
              </strong>

              <p>
                Your registration still exists,
                but the associated event details
                are currently unavailable.
              </p>

            </div>

          </div>
        )}


        {eventStatus ===
          "cancelled" && (
          <div className="student-ticket-event-warning danger">

            <span>
              !
            </span>

            <div>

              <strong>
                Event cancelled
              </strong>

              <p>
                This event has been cancelled.
                This ticket should not be used
                for admission.
              </p>

            </div>

          </div>
        )}


        {eventStatus ===
          "postponed" && (
          <div className="student-ticket-event-warning postponed">

            <span>
              !
            </span>

            <div>

              <strong>
                Event postponed
              </strong>

              <p>
                This event has been postponed.
                Check the event page for the
                latest schedule information.
              </p>

            </div>

          </div>
        )}


        {eventStatus ===
          "completed" && (
          <div className="student-ticket-event-warning completed">

            <span>
              ✓
            </span>

            <div>

              <strong>
                Event completed
              </strong>

              <p>
                This ticket belongs to an event
                that has already finished.
              </p>

            </div>

          </div>
        )}


        <div className="student-ticket-details">

          <TicketInfo
            label="Student"
            value={
              profile
                ?.full_name ||
              registration.name ||
              "Student"
            }
          />


          <TicketInfo
            label="Student ID"
            value={
              profile
                ?.student_id ||
              "—"
            }
          />


          <TicketInfo
            label="Date"
            value={
              formatEventDate(
                event
                  ?.event_date
              )
            }
          />


          <TicketInfo
            label="Time"
            value={
              formatEventTime(
                event
                  ?.event_time
              )
            }
          />


          <TicketInfo
            label="Venue"
            value={
              event
                ?.location ||
              "Venue TBA"
            }
          />


          <TicketInfo
            label="Category"
            value={
              event
                ?.category ||
              "School Event"
            }
          />

        </div>


        <div className="student-ticket-divider">
          <span />
          <span />
        </div>


        {hasTicketCode ? (
          <div className="student-ticket-qr-section">

            <div className="student-ticket-qr">

              <QRCodeSVG
                value={
                  registration
                    .ticket_code
                }
                size={154}
                level="H"
                includeMargin
              />

            </div>


            <div className="student-ticket-code">

              <span>
                Ticket ID
              </span>

              <strong>
                {
                  registration
                    .ticket_code
                }
              </strong>

              <small>
                Scan this QR code
                or present the ticket
                ID at event check-in.
              </small>

            </div>

          </div>
        ) : (
          <div className="student-ticket-pending">

            <span>
              !
            </span>

            <div>

              <strong>
                Ticket pending
              </strong>

              <p>
                Your registration
                exists but a ticket
                code has not been
                generated yet.
              </p>

            </div>

          </div>
        )}


        {registration
          .checked_in && (
          <div className="student-ticket-checkin-status">

            <span>
              ✓
            </span>

            <div>

              <strong>
                Attendance recorded
              </strong>

              <small>
                {registration
                  .checked_in_at
                  ? `Checked in ${formatCheckInDate(
                      registration
                        .checked_in_at
                    )}`
                  : "This ticket has already been checked in."}
              </small>

            </div>

          </div>
        )}


        <div className="student-ticket-actions">

          <button
            type="button"
            className="student-ticket-print"
            onClick={() =>
              window.print()
            }
          >
            Print Ticket

            <span>
              ↗
            </span>
          </button>


          {event?.id && (
            <Link
              to={`/events/${event.id}`}
              className="student-ticket-event-link"
            >
              View event details

              <span>
                →
              </span>
            </Link>
          )}

        </div>

      </div>


      <div className="student-ticket-card-footer">

        <span>
          {registration
            .email ||
            "Student ticket"}
        </span>

        <span>
          EventHub Student Portal
        </span>

      </div>

    </article>
  );
}


function TicketInfo({
  label,
  value,
}) {
  return (
    <div>

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


function formatEventStatus(
  status
) {
  const labels = {
    upcoming:
      "Upcoming",

    registration_open:
      "Registration Open",

    sold_out:
      "Sold Out",

    live:
      "Live",

    completed:
      "Completed",

    postponed:
      "Postponed",

    cancelled:
      "Cancelled",
  };


  return (
    labels[status] ||
    formatStatusText(
      status
    )
  );
}


function formatStatusText(
  value
) {
  if (!value) {
    return "Upcoming";
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


function formatEventDate(
  dateValue
) {
  if (!dateValue) {
    return "Date TBA";
  }


  const date =
    new Date(
      `${dateValue}T00:00:00`
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Date TBA";
  }


  return date
    .toLocaleDateString(
      "en-US",
      {
        year:
          "numeric",

        month:
          "long",

        day:
          "numeric",
      }
    );
}


function formatEventTime(
  time
) {
  if (!time) {
    return "Time TBA";
  }


  const match =
    String(time).match(
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
    hours >= 12
      ? "PM"
      : "AM";


  hours =
    hours % 12 ||
    12;


  return `${hours}:${minutes} ${modifier}`;
}


function formatCheckInDate(
  value
) {
  if (!value) {
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

      year:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",
    }
  );
}


function getDay(
  dateValue
) {
  if (!dateValue) {
    return "--";
  }


  const date =
    new Date(
      `${dateValue}T00:00:00`
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "--";
  }


  return date
    .getDate()
    .toString()
    .padStart(
      2,
      "0"
    );
}


function getMonth(
  dateValue
) {
  if (!dateValue) {
    return "TBA";
  }


  const date =
    new Date(
      `${dateValue}T00:00:00`
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "TBA";
  }


  return date
    .toLocaleDateString(
      "en-US",
      {
        month:
          "short",
      }
    )
    .toUpperCase();
}


export default StudentTickets;