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
  useStudentAuth,
} from "../contexts/StudentAuthContext";

import LoadingState from "../components/common/LoadingState";


function StudentRegistrations() {
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
    waitlistEntries,
    setWaitlistEntries,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  async function fetchStudentEvents() {
    if (
      !student?.id
    ) {
      setRegistrations([]);
      setWaitlistEntries([]);
      setLoading(false);

      return;
    }


    setLoading(true);
    setError("");


    const [
      registrationResult,
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
        .eq(
          "student_user_id",
          student.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        ),
    ]);


    if (
      registrationResult.error
    ) {
      console.error(
        "Could not load student registrations:",
        registrationResult.error
      );

      setError(
        "Could not load your event registrations."
      );

      setRegistrations([]);
      setWaitlistEntries([]);
      setLoading(false);

      return;
    }


    if (
      waitlistResult.error
    ) {
      console.error(
        "Could not load student waitlist:",
        waitlistResult.error
      );
    }


    const registrationRows =
      registrationResult.data ||
      [];

    const waitlistRows =
      waitlistResult.data ||
      [];


    const eventIds = [
      ...new Set(
        [
          ...registrationRows.map(
            (registration) =>
              registration.event_id
          ),

          ...waitlistRows.map(
            (entry) =>
              entry.event_id
          ),
        ].filter(
          (eventId) =>
            eventId !== null &&
            eventId !== undefined
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
        data,
        error,
      } = await supabase
        .from("events")
        .select(`
          id,
          title,
          category,
          event_date,
          event_time,
          location,
          status,
          approval_status
        `)
        .in(
          "id",
          eventIds
        );


      if (
        error
      ) {
        console.error(
          "Could not load registration events:",
          error
        );
      } else {
        eventData =
          data ||
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


    setRegistrations(
      registrationRows.map(
        (registration) => ({
          ...registration,

          event:
            eventMap.get(
              String(
                registration.event_id
              )
            ) ||
            null,
        })
      )
    );


    setWaitlistEntries(
      waitlistRows.map(
        (entry) => ({
          ...entry,

          event:
            eventMap.get(
              String(
                entry.event_id
              )
            ) ||
            null,
        })
      )
    );


    setLoading(false);
  }


  useEffect(() => {
    if (
      authLoading
    ) {
      return;
    }


    fetchStudentEvents();
  }, [
    student?.id,
    authLoading,
  ]);


  const registrationCount =
    registrations.length;


  const waitingCount =
    waitlistEntries.filter(
      (entry) =>
        entry.status ===
        "waiting"
    ).length;


  const promotedCount =
    waitlistEntries.filter(
      (entry) =>
        entry.status ===
        "promoted"
    ).length;


  const upcomingCount =
    useMemo(() => {
      const today =
        new Date();


      today.setHours(
        0,
        0,
        0,
        0
      );


      return registrations.filter(
        (registration) => {
          const date =
            registration.event
              ?.event_date;


          if (
            !date
          ) {
            return false;
          }


          const eventDate =
            new Date(
              `${date}T00:00:00`
            );


          return (
            eventDate >=
            today
          );
        }
      ).length;
    }, [
      registrations,
    ]);


  const activeWaitlistEntries =
    useMemo(() => {
      return waitlistEntries.filter(
        (entry) =>
          entry.status !==
          "cancelled"
      );
    }, [
      waitlistEntries,
    ]);


  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="student-registrations-page">

        <div className="container">

          <LoadingState
            label="Loading your events..."
          />

        </div>

      </main>
    );
  }


  return (
    <main className="student-registrations-page">

      <div className="container">

        <header className="student-page-heading">

          <div>

            <span className="section-kicker">
              Student Portal
            </span>

            <h1>
              My Events
            </h1>

            <p>
              View your confirmed registrations,
              upcoming events and current waitlist
              activity.
            </p>

          </div>


          <Link
            to="/student/dashboard"
            className="btn btn-outline"
          >
            ← Dashboard
          </Link>

        </header>


        <section className="student-registration-summary">

          <div className="student-registration-profile">

            <div>

              <span>
                Student
              </span>

              <strong>
                {profile?.full_name ||
                  "Student"}
              </strong>

            </div>


            <div>

              <span>
                Student ID
              </span>

              <strong>
                {profile?.student_id ||
                  "—"}
              </strong>

            </div>


            <div>

              <span>
                Email
              </span>

              <strong>
                {student?.email ||
                  "—"}
              </strong>

            </div>

          </div>


          <div className="student-registration-stats">

            <div>

              <span>
                Registrations
              </span>

              <strong>
                {registrationCount
                  .toString()
                  .padStart(
                    2,
                    "0"
                  )}
              </strong>

            </div>


            <div>

              <span>
                Upcoming
              </span>

              <strong>
                {upcomingCount
                  .toString()
                  .padStart(
                    2,
                    "0"
                  )}
              </strong>

            </div>


            <div>

              <span>
                Waitlisted
              </span>

              <strong>
                {waitingCount
                  .toString()
                  .padStart(
                    2,
                    "0"
                  )}
              </strong>

            </div>

          </div>

        </section>


        {error && (
          <div className="student-registration-error">

            <span>
              !
            </span>

            <div>

              <strong>
                Could not load events
              </strong>

              <p>
                {error}
              </p>

            </div>

          </div>
        )}


        {!error &&
          activeWaitlistEntries.length >
          0 && (
            <section className="student-waitlist-section">

              <div className="student-waitlist-section-heading">

                <div>

                  <span className="section-kicker">
                    Waitlist
                  </span>

                  <h2>
                    Waiting for a place
                  </h2>

                  <p>
                    Track events where you are
                    currently waiting for a seat
                    to become available.
                  </p>

                </div>


                <div className="student-waitlist-summary">

                  <strong>
                    {waitingCount}
                  </strong>

                  <span>
                    Waiting
                  </span>

                </div>

              </div>


              <div className="student-waitlist-list">

                {activeWaitlistEntries.map(
                  (entry) => {
                    const event =
                      entry.event;


                    const date =
                      formatEventDate(
                        event?.event_date
                      );


                    return (
                      <article
                        key={
                          entry.id
                        }
                        className={
                          `student-waitlist-card student-waitlist-card--${entry.status}`
                        }
                      >

                        <div className="student-registration-card-date">

                          <strong>
                            {
                              date.day
                            }
                          </strong>

                          <span>
                            {
                              date.month
                            }
                          </span>

                        </div>


                        <div className="student-waitlist-main">

                          <div className="student-registration-card-top">

                            <span>
                              {event
                                ?.category ||
                                "School Event"}
                            </span>


                            <span
                              className={
                                `student-waitlist-status student-waitlist-status--${entry.status}`
                              }
                            >
                              {formatWaitlistStatus(
                                entry.status
                              )}
                            </span>

                          </div>


                          <h2>
                            {event
                              ?.title ||
                              "Event"}
                          </h2>


                          <div className="student-registration-meta">

                            <span>
                              {formatFullDate(
                                event
                                  ?.event_date
                              )}
                            </span>


                            <span>
                              {formatEventTime(
                                event
                                  ?.event_time
                              )}
                            </span>


                            <span>
                              {event
                                ?.location ||
                                "Venue TBA"}
                            </span>

                          </div>


                          <div className="student-waitlist-info">

                            {entry.status ===
                              "waiting" && (
                              <p>
                                You are currently on
                                the waitlist. If a place
                                becomes available, your
                                registration can be
                                promoted automatically
                                by EventHub staff.
                              </p>
                            )}


                            {entry.status ===
                              "promoted" && (
                              <p>
                                Your waitlist entry was
                                promoted. Your confirmed
                                ticket should now be
                                available in My Tickets.
                              </p>
                            )}


                            {entry.promoted_at && (
                              <small>
                                Promoted{" "}
                                {formatDateTime(
                                  entry
                                    .promoted_at
                                )}
                              </small>
                            )}

                          </div>

                        </div>


                        <div className="student-registration-card-actions">

                          {event?.id && (
                            <Link
                              to={`/events/${event.id}`}
                              className="btn btn-outline"
                            >
                              Event details
                            </Link>
                          )}


                          {entry.status ===
                            "promoted" && (
                            <Link
                              to="/student/tickets"
                              className="btn btn-primary"
                            >
                              View ticket
                              <span>
                                →
                              </span>
                            </Link>
                          )}

                        </div>

                      </article>
                    );
                  }
                )}

              </div>

            </section>
          )}


        {!error &&
          registrations.length ===
          0 &&
          activeWaitlistEntries.length ===
          0 && (
            <section className="student-registrations-panel">

              <div className="student-registration-empty">

                <span className="student-registration-empty-number">
                  00
                </span>


                <h2>
                  No events yet
                </h2>


                <p>
                  Confirmed registrations and
                  waitlist entries will appear
                  here after you join an EventHub
                  activity.
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
            <section className="student-registrations-panel">

              <div className="student-registrations-panel-heading">

                <div>

                  <span className="section-kicker">
                    Confirmed
                  </span>

                  <h2>
                    Registered Events
                  </h2>

                </div>


                {promotedCount >
                  0 && (
                  <span className="student-promoted-count">
                    {promotedCount} promoted
                  </span>
                )}

              </div>


              <div className="student-registration-list">

                {registrations.map(
                  (registration) => {
                    const event =
                      registration.event;


                    const date =
                      formatEventDate(
                        event
                          ?.event_date
                      );


                    const wasPromoted =
                      waitlistEntries.some(
                        (entry) =>
                          String(
                            entry.event_id
                          ) ===
                            String(
                              registration.event_id
                            ) &&
                          entry.status ===
                            "promoted"
                      );


                    return (
                      <article
                        key={
                          registration.id
                        }
                        className="student-registration-card"
                      >

                        <div className="student-registration-card-date">

                          <strong>
                            {
                              date.day
                            }
                          </strong>

                          <span>
                            {
                              date.month
                            }
                          </span>

                        </div>


                        <div className="student-registration-card-main">

                          <div className="student-registration-card-top">

                            <span>
                              {event
                                ?.category ||
                                "School Event"}
                            </span>


                            <div className="student-registration-status-group">

                              {wasPromoted && (
                                <span className="student-registration-promoted">
                                  Promoted
                                </span>
                              )}


                              <span className="student-registration-status">
                                Registered
                              </span>

                            </div>

                          </div>


                          <h2>
                            {event
                              ?.title ||
                              "Event"}
                          </h2>


                          <div className="student-registration-meta">

                            <span>
                              {formatFullDate(
                                event
                                  ?.event_date
                              )}
                            </span>


                            <span>
                              {formatEventTime(
                                event
                                  ?.event_time
                              )}
                            </span>


                            <span>
                              {event
                                ?.location ||
                                "Venue TBA"}
                            </span>

                          </div>


                          <div className="student-registration-ticket-code">

                            <span>
                              Ticket ID
                            </span>

                            <strong>
                              {registration
                                .ticket_code ||
                                "Pending"}
                            </strong>

                          </div>


                          {registration.checked_in && (
                            <div className="student-registration-checkin">

                              <span>
                                ✓
                              </span>

                              <div>

                                <strong>
                                  Checked in
                                </strong>

                                {registration.checked_in_at && (
                                  <small>
                                    {formatDateTime(
                                      registration
                                        .checked_in_at
                                    )}
                                  </small>
                                )}

                              </div>

                            </div>
                          )}

                        </div>


                        <div className="student-registration-card-actions">

                          {event?.id && (
                            <Link
                              to={`/events/${event.id}`}
                              className="btn btn-outline"
                            >
                              Event details
                            </Link>
                          )}


                          <Link
                            to="/student/tickets"
                            className="btn btn-primary"
                          >
                            View ticket

                            <span>
                              →
                            </span>

                          </Link>

                        </div>

                      </article>
                    );
                  }
                )}

              </div>

            </section>
          )}

      </div>

    </main>
  );
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


function formatEventDate(
  dateValue
) {
  if (
    !dateValue
  ) {
    return {
      day:
        "--",

      month:
        "TBA",
    };
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
    return {
      day:
        "--",

      month:
        "TBA",
    };
  }


  return {
    day:
      date
        .getDate()
        .toString()
        .padStart(
          2,
          "0"
        ),

    month:
      date
        .toLocaleDateString(
          "en-US",
          {
            month:
              "short",
          }
        )
        .toUpperCase(),
  };
}


function formatFullDate(
  dateValue
) {
  if (
    !dateValue
  ) {
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


function formatDateTime(
  value
) {
  if (
    !value
  ) {
    return "";
  }


  return new Date(
    value
  ).toLocaleString(
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


export default StudentRegistrations;