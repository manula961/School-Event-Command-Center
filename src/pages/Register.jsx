import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import { QRCodeSVG } from "qrcode.react";

import { supabase } from "../services/supabase";
import { useStudentAuth } from "../contexts/StudentAuthContext";

import LoadingState from "../components/common/LoadingState";


function Register() {
  const { id } =
    useParams();

  const {
    student,
    profile,
  } = useStudentAuth();


  const [
    event,
    setEvent,
  ] = useState(null);

  const [
    formData,
    setFormData,
  ] = useState({
    name: "",
    email: "",
  });

  const [
    ticket,
    setTicket,
  ] = useState(null);

  const [
    waitlistEntry,
    setWaitlistEntry,
  ] = useState(null);

  const [
    eventLoading,
    setEventLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    joiningWaitlist,
    setJoiningWaitlist,
  ] = useState(false);

  const [
    registrationCount,
    setRegistrationCount,
  ] = useState(0);

  const [
    error,
    setError,
  ] = useState("");


  async function fetchRegistrationCount(
    eventId
  ) {
    const {
      count,
      error,
    } = await supabase
      .from("registrations")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "event_id",
        eventId
      );


    if (error) {
      console.error(
        "Could not load registration count:",
        error
      );

      return 0;
    }


    const total =
      count || 0;


    setRegistrationCount(
      total
    );


    return total;
  }


  useEffect(() => {
    async function fetchEvent() {
      setEventLoading(true);
      setError("");


      const {
        data,
        error,
      } = await supabase
        .from("events")
        .select("*")
        .eq(
          "id",
          id
        )
        .single();


      if (error) {
        console.error(
          "Could not load event:",
          error
        );


        setError(
          "Could not load this event."
        );

        setEvent(null);
        setEventLoading(false);

        return;
      }


      setEvent(
        data
      );


      await fetchRegistrationCount(
        data.id
      );


      setEventLoading(false);
    }


    fetchEvent();
  }, [
    id,
  ]);


  useEffect(() => {
    if (
      !student &&
      !profile
    ) {
      return;
    }


    setFormData(
      (current) => ({
        ...current,

        name:
          current.name ||
          profile?.full_name ||
          "",

        email:
          current.email ||
          student?.email ||
          "",
      })
    );
  }, [
    student,
    profile,
  ]);


  const formattedDate =
    useMemo(() => {
      if (
        !event?.event_date
      ) {
        return "Date TBA";
      }


      return new Date(
        `${event.event_date}T00:00:00`
      ).toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      );
    }, [
      event,
    ]);


  const capacity =
    event?.capacity ??
    null;


  const hasCapacity =
    capacity !== null &&
    capacity !== undefined;


  const remainingSeats =
    hasCapacity
      ? Math.max(
          capacity -
            registrationCount,
          0
        )
      : null;


  const isSoldOut =
    Boolean(
      event &&
      (
        event.status ===
          "sold_out" ||
        (
          hasCapacity &&
          registrationCount >=
            capacity
        )
      )
    );


  const registrationEnabled =
    event
      ?.registration_enabled ??
    true;


  const publicStatus =
    event?.status ||
    "upcoming";


  const hardClosed =
    !registrationEnabled ||
    [
      "completed",
      "cancelled",
      "postponed",
    ].includes(
      publicStatus
    );


  const waitlistAvailable =
    isSoldOut &&
    registrationEnabled &&
    ![
      "completed",
      "cancelled",
      "postponed",
    ].includes(
      publicStatus
    );


  const registrationUnavailable =
    hardClosed ||
    isSoldOut;


  function getRegistrationMessage() {
    if (
      publicStatus ===
      "cancelled"
    ) {
      return "This event has been cancelled.";
    }


    if (
      publicStatus ===
      "completed"
    ) {
      return "Registration is closed because this event has finished.";
    }


    if (
      publicStatus ===
      "postponed"
    ) {
      return "Registration is temporarily unavailable because this event has been postponed.";
    }


    if (
      isSoldOut
    ) {
      return waitlistAvailable
        ? "This event is currently full. You can join the waitlist and be considered if a place becomes available."
        : "This event is sold out.";
    }


    if (
      !registrationEnabled
    ) {
      return "Registration is currently closed for this event.";
    }


    return "";
  }


  function handleChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;


    setFormData(
      (current) => ({
        ...current,
        [name]:
          value,
      })
    );


    if (error) {
      setError("");
    }
  }


  function getAttendeeDetails() {
    return {
      attendeeName:
        formData.name
          .trim(),

      attendeeEmail:
        formData.email
          .trim()
          .toLowerCase(),
    };
  }


  async function checkExistingRegistration(
    attendeeEmail
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("registrations")
      .select(`
        id,
        ticket_code
      `)
      .eq(
        "event_id",
        event.id
      )
      .eq(
        "email",
        attendeeEmail
      )
      .maybeSingle();


    if (error) {
      throw error;
    }


    if (data) {
      return true;
    }


    if (
      student?.id
    ) {
      const {
        data:
          studentRegistration,
        error:
          studentError,
      } = await supabase
        .from("registrations")
        .select(`
          id,
          ticket_code
        `)
        .eq(
          "event_id",
          event.id
        )
        .eq(
          "student_user_id",
          student.id
        )
        .maybeSingle();


      if (
        studentError
      ) {
        throw studentError;
      }


      if (
        studentRegistration
      ) {
        return true;
      }
    }


    return false;
  }


  async function handleSubmit(
    eventObject
  ) {
    eventObject.preventDefault();


    if (!event) {
      setError(
        "Event information is unavailable."
      );

      return;
    }


    if (
      hardClosed
    ) {
      setError(
        getRegistrationMessage()
      );

      return;
    }


    const {
      attendeeName,
      attendeeEmail,
    } =
      getAttendeeDetails();


    if (
      !attendeeName ||
      !attendeeEmail
    ) {
      setError(
        "Enter your name and email address."
      );

      return;
    }


    const latestCount =
      await fetchRegistrationCount(
        event.id
      );


    const nowSoldOut =
      event.status ===
        "sold_out" ||
      (
        event.capacity &&
        latestCount >=
          event.capacity
      );


    if (
      nowSoldOut
    ) {
      setError(
        "This event is now full. Join the waitlist instead."
      );

      return;
    }


    setSubmitting(true);
    setError("");


    try {
      const alreadyRegistered =
        await checkExistingRegistration(
          attendeeEmail
        );


      if (
        alreadyRegistered
      ) {
        setError(
          "You are already registered for this event."
        );

        setSubmitting(false);

        return;
      }
    } catch (
      duplicateCheckError
    ) {
      console.error(
        "Could not verify existing registration:",
        duplicateCheckError
      );


      setError(
        "Could not verify your registration. Please try again."
      );

      setSubmitting(false);

      return;
    }


    const ticketCode =
      generateTicketCode();


    const {
      data:
        registration,
      error:
        registrationError,
    } = await supabase
      .from("registrations")
      .insert({
        name:
          attendeeName,

        email:
          attendeeEmail,

        event_id:
          event.id,

        ticket_code:
          ticketCode,

        student_user_id:
          student?.id ||
          null,
      })
      .select(`
        id,
        created_at,
        name,
        email,
        event_id,
        ticket_code,
        student_user_id
      `)
      .single();


    if (
      registrationError
    ) {
      console.error(
        "Registration error:",
        registrationError
      );


      if (
        registrationError.code ===
        "23505"
      ) {
        setError(
          "You are already registered for this event."
        );
      } else {
        setError(
          "Registration failed. Please try again."
        );
      }


      setSubmitting(false);

      return;
    }


    await fetchRegistrationCount(
      event.id
    );


    setTicket({
      registrationId:
        registration?.id,

      name:
        attendeeName,

      email:
        attendeeEmail,

      event,

      code:
        ticketCode,

      studentUserId:
        student?.id ||
        null,
    });


    setSubmitting(false);
  }


  async function handleJoinWaitlist() {
    if (
      !event ||
      !waitlistAvailable
    ) {
      return;
    }


    const {
      attendeeName,
      attendeeEmail,
    } =
      getAttendeeDetails();


    if (
      !attendeeName ||
      !attendeeEmail
    ) {
      setError(
        "Enter your name and email address before joining the waitlist."
      );

      return;
    }


    setJoiningWaitlist(
      true
    );

    setError("");


    try {
      const alreadyRegistered =
        await checkExistingRegistration(
          attendeeEmail
        );


      if (
        alreadyRegistered
      ) {
        setError(
          "You are already registered for this event."
        );

        setJoiningWaitlist(
          false
        );

        return;
      }
    } catch (
      registrationCheckError
    ) {
      console.error(
        "Could not verify registration:",
        registrationCheckError
      );


      setError(
        "Could not verify your registration status. Please try again."
      );

      setJoiningWaitlist(
        false
      );

      return;
    }


    const {
      data,
      error:
        waitlistError,
    } = await supabase
      .from(
        "event_waitlist"
      )
      .insert({
        event_id:
          event.id,

        name:
          attendeeName,

        email:
          attendeeEmail,

        student_user_id:
          student?.id ||
          null,

        status:
          "waiting",
      })
      .select(`
        id,
        event_id,
        name,
        email,
        status,
        created_at
      `)
      .single();


    if (
      waitlistError
    ) {
      console.error(
        "Waitlist error:",
        waitlistError
      );


      if (
        waitlistError.code ===
        "23505"
      ) {
        setError(
          "You are already on the waitlist for this event."
        );
      } else {
        setError(
          "Could not join the waitlist. Please try again."
        );
      }


      setJoiningWaitlist(
        false
      );

      return;
    }


    setWaitlistEntry(
      data
    );


    setJoiningWaitlist(
      false
    );
  }


  if (
    eventLoading
  ) {
    return (
      <main className="register-loading-page">

        <LoadingState
          label="Loading registration..."
        />

      </main>
    );
  }


  if (!event) {
    return (
      <main className="register-error-page">

        <div className="container register-error-content">

          <span className="section-kicker">
            Registration
          </span>

          <h1>
            Event unavailable
          </h1>

          <p>
            We couldn&apos;t load the
            event you&apos;re trying
            to register for.
          </p>

          <Link
            to="/events"
            className="btn btn-primary"
          >
            ← Back to events
          </Link>

        </div>

      </main>
    );
  }


  return (
    <main className="register-page">

      <section className="register-hero">

        <div className="register-hero-orbit register-orbit-one" />
        <div className="register-hero-orbit register-orbit-two" />


        <div className="container">

          <Link
            to={`/events/${event.id}`}
            className="register-back-link"
          >
            <span>
              ←
            </span>

            Event details
          </Link>


          <div className="register-hero-content">

            <span className="register-kicker">
              {waitlistAvailable
                ? "Event waitlist"
                : "Event registration"}
            </span>

            <h1>
              {waitlistAvailable
                ? "Join the"
                : "Reserve your"}

              <span>
                {" "}
                {waitlistAvailable
                  ? "waitlist."
                  : "place."}
              </span>
            </h1>

            <p>
              {waitlistAvailable
                ? "The event is currently full. Join the waitlist to be considered if a place becomes available."
                : "Complete your registration and receive a digital ticket instantly."}
            </p>

          </div>

        </div>

      </section>


      <section className="register-main-section">

        <div className="container register-new-layout">

          <section className="register-form-card-new">

            <div className="register-form-heading">

              <span>
                Attendee details
              </span>

              <h2>
                {waitlistAvailable
                  ? "Waitlist registration"
                  : "Complete registration"}
              </h2>

              <p>
                {student
                  ? "Your student account details have been filled in automatically."
                  : waitlistAvailable
                    ? "Enter your details below to join the event waitlist."
                    : "Enter your details below to register for this event."}
              </p>

            </div>


            {student && (
              <div className="register-student-account">

                <div className="register-student-account-icon">
                  ✓
                </div>

                <div>

                  <span>
                    Student account
                  </span>

                  <strong>
                    {profile?.full_name ||
                      student.email}
                  </strong>

                  {profile?.student_id && (
                    <small>
                      ID{" "}
                      {
                        profile.student_id
                      }
                    </small>
                  )}

                </div>

              </div>
            )}


            <div className="register-event-summary">

              <div className="register-event-date">

                <strong>
                  {event.event_date
                    ? new Date(
                        `${event.event_date}T00:00:00`
                      ).toLocaleDateString(
                        "en-US",
                        {
                          day:
                            "2-digit",
                        }
                      )
                    : "--"}
                </strong>

                <span>
                  {event.event_date
                    ? new Date(
                        `${event.event_date}T00:00:00`
                      )
                        .toLocaleDateString(
                          "en-US",
                          {
                            month:
                              "short",
                          }
                        )
                        .toUpperCase()
                    : "TBA"}
                </span>

              </div>


              <div>

                <span>
                  {event.category ||
                    "School Event"}
                </span>

                <h3>
                  {event.title}
                </h3>

                <p>
                  {formatEventTime(
                    event.event_time
                  )}
                  {" · "}
                  {event.location ||
                    "Venue TBA"}
                </p>

              </div>

            </div>


            {hasCapacity && (
              <div className="register-capacity-card">

                <div className="register-capacity-top">

                  <div>

                    <span>
                      Registration
                    </span>

                    <strong>
                      {
                        registrationCount
                      }
                      {" / "}
                      {
                        capacity
                      }
                    </strong>

                  </div>


                  <span
                    className={
                      isSoldOut
                        ? "register-capacity-status sold-out"
                        : "register-capacity-status"
                    }
                  >
                    {isSoldOut
                      ? "Sold out"
                      : `${remainingSeats} remaining`}
                  </span>

                </div>


                <div className="register-capacity-track">

                  <span
                    style={{
                      width:
                        `${Math.min(
                          (
                            registrationCount /
                            capacity
                          ) *
                            100,
                          100
                        )}%`,
                    }}
                  />

                </div>

              </div>
            )}


            {registrationUnavailable &&
              !ticket &&
              !waitlistEntry && (
                <div
                  className={
                    waitlistAvailable
                      ? "register-waitlist-notice"
                      : "register-closed-box"
                  }
                >

                  <span>
                    {waitlistAvailable
                      ? "⌛"
                      : "!"}
                  </span>

                  <div>

                    <strong>
                      {waitlistAvailable
                        ? "Event full"
                        : "Registration unavailable"}
                    </strong>

                    <p>
                      {getRegistrationMessage()}
                    </p>

                  </div>

                </div>
              )}


            <form
              className="register-form-new"
              onSubmit={
                handleSubmit
              }
            >

              <div className="register-field">

                <label htmlFor="register-name">
                  Full name
                </label>

                <input
                  id="register-name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={
                    formData.name
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    Boolean(
                      ticket ||
                      waitlistEntry
                    ) ||
                    (
                      hardClosed &&
                      !waitlistAvailable
                    )
                  }
                  required
                />

              </div>


              <div className="register-field">

                <label htmlFor="register-email">
                  Email address
                </label>

                <input
                  id="register-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={
                    formData.email
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    Boolean(
                      ticket ||
                      waitlistEntry
                    ) ||
                    (
                      hardClosed &&
                      !waitlistAvailable
                    )
                  }
                  required
                />

              </div>


              {error && (
                <div className="register-error-box">

                  <span>
                    !
                  </span>

                  <p>
                    {error}
                  </p>

                </div>
              )}


              {!ticket &&
                !waitlistEntry &&
                !registrationUnavailable && (
                  <button
                    type="submit"
                    className="register-submit-button"
                    disabled={
                      submitting ||
                      joiningWaitlist
                    }
                  >

                    <span>
                      {submitting
                        ? "Registering..."
                        : "Complete registration"}
                    </span>

                    {!submitting && (
                      <span>
                        →
                      </span>
                    )}

                  </button>
                )}


              {!ticket &&
                !waitlistEntry &&
                waitlistAvailable && (
                  <button
                    type="button"
                    className="register-submit-button register-waitlist-button"
                    disabled={
                      joiningWaitlist ||
                      submitting
                    }
                    onClick={
                      handleJoinWaitlist
                    }
                  >

                    <span>
                      {joiningWaitlist
                        ? "Joining waitlist..."
                        : "Join waitlist"}
                    </span>

                    {!joiningWaitlist && (
                      <span>
                        →
                      </span>
                    )}

                  </button>
                )}


              {ticket && (
                <div className="register-success-box">

                  <span>
                    ✓
                  </span>

                  <div>

                    <strong>
                      Registration complete
                    </strong>

                    <p>
                      {student
                        ? "This event has been added to your student account."
                        : "Your digital ticket has been generated."}
                    </p>

                  </div>

                </div>
              )}


              {waitlistEntry && (
                <div className="register-waitlist-success">

                  <span>
                    ✓
                  </span>

                  <div>

                    <strong>
                      You&apos;re on the waitlist
                    </strong>

                    <p>
                      We&apos;ve saved your
                      place in the queue for{" "}
                      {event.title}.
                    </p>

                  </div>

                </div>
              )}


              {ticket &&
                student && (
                  <Link
                    to="/student/registrations"
                    className="register-my-events-link"
                  >
                    View My Events

                    <span>
                      →
                    </span>
                  </Link>
                )}


              {waitlistEntry &&
                student && (
                  <Link
                    to="/student/dashboard"
                    className="register-my-events-link"
                  >
                    Return to dashboard

                    <span>
                      →
                    </span>
                  </Link>
                )}

            </form>

          </section>


          <section className="register-ticket-column">

            {ticket ? (
              <article className="digital-ticket">

                <div className="digital-ticket-top">

                  <div>

                    <span>
                      EventHub
                    </span>

                    <strong>
                      Digital Ticket
                    </strong>

                  </div>

                  <span className="digital-ticket-admit">
                    Admit one
                  </span>

                </div>


                <div className="digital-ticket-body">

                  <span className="digital-ticket-label">
                    Event
                  </span>

                  <h2>
                    {ticket.event.title}
                  </h2>


                  <div className="digital-ticket-info">

                    <div>

                      <span>
                        Attendee
                      </span>

                      <strong>
                        {ticket.name}
                      </strong>

                    </div>


                    <div>

                      <span>
                        Date
                      </span>

                      <strong>
                        {formattedDate}
                      </strong>

                    </div>


                    <div>

                      <span>
                        Time
                      </span>

                      <strong>
                        {formatEventTime(
                          ticket.event
                            .event_time
                        )}
                      </strong>

                    </div>


                    <div>

                      <span>
                        Venue
                      </span>

                      <strong>
                        {ticket.event
                          .location ||
                          "TBA"}
                      </strong>

                    </div>

                  </div>


                  <div className="digital-ticket-divider">
                    <span />
                    <span />
                  </div>


                  <div className="digital-ticket-qr">

                    <QRCodeSVG
                      value={
                        ticket.code
                      }
                      size={
                        132
                      }
                      level="H"
                      includeMargin
                    />

                    <span>
                      Scan at event check-in
                    </span>

                  </div>


                  <div className="digital-ticket-code">

                    <span>
                      Ticket ID
                    </span>

                    <strong>
                      {ticket.code}
                    </strong>

                    <small>
                      Present this QR code or
                      ticket ID at check-in.
                    </small>

                  </div>

                </div>


                <div className="digital-ticket-footer">

                  <span>
                    {ticket.email}
                  </span>

                  <span>
                    EventHub
                  </span>

                </div>

              </article>
            ) : waitlistEntry ? (
              <article className="register-waitlist-card">

                <div className="register-waitlist-card-icon">
                  ✓
                </div>

                <span>
                  EventHub Waitlist
                </span>

                <h2>
                  You&apos;re in the queue.
                </h2>

                <p>
                  Your waitlist request for{" "}
                  <strong>
                    {event.title}
                  </strong>{" "}
                  has been recorded.
                </p>


                <div className="register-waitlist-details">

                  <div>

                    <span>
                      Attendee
                    </span>

                    <strong>
                      {
                        waitlistEntry.name
                      }
                    </strong>

                  </div>


                  <div>

                    <span>
                      Event
                    </span>

                    <strong>
                      {event.title}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Date
                    </span>

                    <strong>
                      {formattedDate}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Status
                    </span>

                    <strong>
                      Waiting
                    </strong>

                  </div>

                </div>


                <small>
                  If a place becomes available,
                  EventHub can promote your
                  waitlist entry to a confirmed
                  registration.
                </small>

              </article>
            ) : (
              <div className="register-ticket-placeholder-new">

                <div className="ticket-placeholder-icon">
                  {waitlistAvailable
                    ? "⌛"
                    : "◇"}
                </div>

                <span>
                  {waitlistAvailable
                    ? "Event waitlist"
                    : "Digital ticket"}
                </span>

                <h2>
                  {waitlistAvailable
                    ? "Join the waitlist."
                    : registrationUnavailable
                      ? "Registration is unavailable."
                      : "Your ticket will appear here."}
                </h2>

                <p>
                  {waitlistAvailable
                    ? "Complete your attendee details and join the queue for this event."
                    : registrationUnavailable
                      ? getRegistrationMessage()
                      : "Complete the registration form to generate your unique event ticket."}
                </p>

                <div className="ticket-placeholder-preview">
                  <div />
                  <span />
                  <span />
                  <span />
                </div>

              </div>
            )}

          </section>

        </div>

      </section>

    </main>
  );
}


function generateTicketCode() {
  return (
    "EVT-" +
    Date.now()
      .toString(36)
      .toUpperCase() +
    "-" +
    Math.random()
      .toString(36)
      .substring(
        2,
        6
      )
      .toUpperCase()
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
    hours >= 12
      ? "PM"
      : "AM";


  hours =
    hours % 12 ||
    12;


  return `${hours}:${minutes} ${modifier}`;
}


export default Register;