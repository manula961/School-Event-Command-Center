import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { supabase } from "../services/supabase";

import Countdown from "../components/events/Countdown";
import LoadingState from "../components/common/LoadingState";
import EventStatus from "../components/events/EventStatus";

function EventDetails() {
  const { id } = useParams();

  const [event, setEvent] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [registrationCount, setRegistrationCount] =
    useState(0);
  const [waitlistCount, setWaitlistCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchEvent() {
      setLoading(true);
      setError("");

      const [
        eventResult,
        registrationResult,
        waitlistResult,
      ] = await Promise.all([
        supabase
          .from("events")
          .select("*")
          .eq("id", id)
          .single(),

        supabase
          .from("registrations")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("event_id", id),

        supabase
          .from("event_waitlist")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("event_id", id)
          .eq("status", "waiting"),
      ]);

      if (eventResult.error) {
        console.error(
          "Could not load event:",
          eventResult.error
        );

        setError(eventResult.error.message);
        setEvent(null);
      } else {
        setEvent(eventResult.data);
      }

      if (registrationResult.error) {
        console.error(
          "Could not load registration count:",
          registrationResult.error
        );

        setRegistrationCount(0);
      } else {
        setRegistrationCount(
          registrationResult.count || 0
        );
      }

      if (waitlistResult.error) {
        console.error(
          "Could not load waitlist count:",
          waitlistResult.error
        );

        setWaitlistCount(0);
      } else {
        setWaitlistCount(
          waitlistResult.count || 0
        );
      }

      setLoading(false);
    }

    fetchEvent();
  }, [id]);

  useEffect(() => {
    async function fetchUpdates() {
      const { data, error } = await supabase
        .from("event_updates")
        .select("*")
        .eq("event_id", id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Could not load event updates:",
          error
        );

        return;
      }

      setUpdates(data || []);
    }

    fetchUpdates();

    const channel = supabase
      .channel(`event-updates-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_updates",
          filter: `event_id=eq.${id}`,
        },
        fetchUpdates
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const countdownTarget = useMemo(() => {
    if (!event?.event_date) {
      return null;
    }

    return `${event.event_date}T${convertTime(
      event.event_time
    )}`;
  }, [event]);

  const registrationInfo = useMemo(() => {
    if (!event) {
      return {
        capacity: null,
        remaining: null,
        percentage: 0,
        isFull: false,
        registrationOpen: false,
        canJoinWaitlist: false,
      };
    }

    const capacity =
      event.capacity !== null &&
      event.capacity !== undefined &&
      Number(event.capacity) > 0
        ? Number(event.capacity)
        : null;

    const remaining =
      capacity !== null
        ? Math.max(
            capacity - registrationCount,
            0
          )
        : null;

    const percentage =
      capacity !== null
        ? Math.min(
            (registrationCount / capacity) *
              100,
            100
          )
        : 0;

    const isFull =
      capacity !== null &&
      registrationCount >= capacity;

    const disabledStatuses = [
      "completed",
      "cancelled",
      "postponed",
      "sold_out",
    ];

    const status = String(
      event.status || ""
    ).toLowerCase();

    const registrationEnabled =
      event.registration_enabled !== false;

    const registrationOpen =
      registrationEnabled &&
      !disabledStatuses.includes(status) &&
      !isFull;

    const canJoinWaitlist =
      registrationEnabled &&
      isFull &&
      ![
        "completed",
        "cancelled",
        "postponed",
      ].includes(status);

    return {
      capacity,
      remaining,
      percentage,
      isFull,
      registrationOpen,
      canJoinWaitlist,
    };
  }, [event, registrationCount]);

  if (loading) {
    return (
      <main className="event-details-loading-page">
        <LoadingState label="Loading event..." />
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="event-details-error-page">
        <div className="container event-details-error">
          <span className="section-kicker">
            EventHub
          </span>

          <h1>Event not found</h1>

          <p>
            We couldn&apos;t find the event you&apos;re
            looking for. It may have been removed or the
            link may be incorrect.
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
    <main className="event-details-page">
      <section className="event-detail-hero">
        <div className="event-detail-hero-orbit event-detail-orbit-one" />
        <div className="event-detail-hero-orbit event-detail-orbit-two" />

        <div className="container">
          <Link
            to="/events"
            className="event-detail-back"
          >
            <span>←</span>
            All events
          </Link>

          <div className="event-detail-hero-grid">
            <div className="event-detail-hero-copy">
              <div className="event-detail-labels">
                <span className="event-detail-category">
                  {event.category || "School Event"}
                </span>

                <EventStatus
                  status={
                    event.status || "Upcoming"
                  }
                />
              </div>

              <h1>{event.title}</h1>

              <p>
                {event.description ||
                  "More information about this event will be published soon."}
              </p>

              <div className="event-detail-primary-actions">
                <RegistrationAction
                  event={event}
                  registrationInfo={
                    registrationInfo
                  }
                />

                <a
                  href="#live-updates"
                  className="event-detail-secondary-action"
                >
                  Follow updates
                </a>
              </div>
            </div>

            <aside className="event-detail-hero-card">
              <div className="event-detail-countdown-heading">
                <div>
                  <span>Countdown</span>
                  <strong>Event starts in</strong>
                </div>

                <span className="event-detail-live-dot" />
              </div>

              {countdownTarget ? (
                <Countdown
                  targetDate={countdownTarget}
                />
              ) : (
                <div className="countdown-expired">
                  Date to be announced
                </div>
              )}

              <div className="event-detail-card-divider" />

              <div className="event-detail-quick-info">
                <div>
                  <span>Date</span>

                  <strong>
                    {formatDate(
                      event.event_date
                    )}
                  </strong>
                </div>

                <div>
                  <span>Time</span>

                  <strong>
                    {formatEventTime(
                      event.event_time
                    )}
                  </strong>
                </div>

                <div>
                  <span>Venue</span>

                  <strong>
                    {event.location || "TBA"}
                  </strong>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="event-detail-body">
        <div className="container event-detail-body-grid">
          <div className="event-detail-main-column">
            <section className="event-detail-section">
              <div className="event-detail-section-heading">
                <span>About the event</span>

                <h2>Event overview</h2>
              </div>

              <div className="event-detail-overview-card">
                <p>
                  {event.description ||
                    "Further details about this event will be published soon."}
                </p>
              </div>
            </section>

            <section
              className="event-detail-section"
              id="live-updates"
            >
              <div className="event-detail-updates-heading">
                <div>
                  <span>Live & latest</span>

                  <h2>Event updates</h2>
                </div>

                <div className="event-detail-live-badge">
                  <span />
                  Realtime
                </div>
              </div>

              {updates.length === 0 ? (
                <div className="event-detail-no-updates">
                  <div className="event-detail-no-updates-icon">
                    +
                  </div>

                  <h3>No updates yet</h3>

                  <p>
                    Live results, highlights and
                    important notices will appear here
                    as they are published.
                  </p>
                </div>
              ) : (
                <div className="event-detail-timeline">
                  {updates.map(
                    (update, index) => (
                      <article
                        className="event-detail-update"
                        key={update.id}
                      >
                        <div className="event-detail-update-line">
                          <span
                            className={`event-detail-update-dot ${getUpdateClass(
                              update.update_type
                            )}`}
                          />

                          {index !==
                            updates.length -
                              1 && (
                            <span className="event-detail-update-connector" />
                          )}
                        </div>

                        <div className="event-detail-update-content">
                          <div className="event-detail-update-meta">
                            <span
                              className={`event-detail-update-type ${getUpdateClass(
                                update.update_type
                              )}`}
                            >
                              {update.update_type ||
                                "Update"}
                            </span>

                            <time>
                              {formatUpdateTime(
                                update.created_at
                              )}
                            </time>
                          </div>

                          <h3>
                            {update.title}
                          </h3>

                          <p>
                            {update.message}
                          </p>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </section>
          </div>

          <aside className="event-detail-sidebar">
            <div className="event-detail-info-card">
              <span className="event-detail-sidebar-label">
                Event information
              </span>

              <div className="event-detail-info-row">
                <span className="event-detail-info-icon">
                  ◷
                </span>

                <div>
                  <small>Date</small>

                  <strong>
                    {formatDate(
                      event.event_date
                    )}
                  </strong>
                </div>
              </div>

              <div className="event-detail-info-row">
                <span className="event-detail-info-icon">
                  ⌚
                </span>

                <div>
                  <small>Time</small>

                  <strong>
                    {formatEventTime(
                      event.event_time
                    )}
                  </strong>
                </div>
              </div>

              <div className="event-detail-info-row">
                <span className="event-detail-info-icon">
                  ⌖
                </span>

                <div>
                  <small>Venue</small>

                  <strong>
                    {event.location ||
                      "TBA"}
                  </strong>
                </div>
              </div>

              <div className="event-detail-info-row">
                <span className="event-detail-info-icon">
                  ◇
                </span>

                <div>
                  <small>Category</small>

                  <strong>
                    {event.category ||
                      "School Event"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="event-detail-registration-card">
              <span>Registration</span>

              <h3>
                {getRegistrationHeading(
                  event,
                  registrationInfo
                )}
              </h3>

              <p>
                {getRegistrationDescription(
                  event,
                  registrationInfo
                )}
              </p>

              {registrationInfo.capacity !==
                null && (
                <div className="event-detail-capacity">
                  <div className="event-detail-capacity-top">
                    <span>
                      Capacity
                    </span>

                    <strong>
                      {registrationCount} /{" "}
                      {
                        registrationInfo.capacity
                      }
                    </strong>
                  </div>

                  <div className="event-detail-capacity-track">
                    <span
                      style={{
                        width: `${registrationInfo.percentage}%`,
                      }}
                    />
                  </div>

                  <div className="event-detail-capacity-meta">
                    <span>
                      {registrationInfo.isFull
                        ? "Event full"
                        : `${registrationInfo.remaining} ${
                            registrationInfo.remaining ===
                            1
                              ? "place"
                              : "places"
                          } remaining`}
                    </span>

                    <span>
                      {Math.round(
                        registrationInfo.percentage
                      )}
                      %
                    </span>
                  </div>
                </div>
              )}

              {registrationInfo.capacity ===
                null && (
                <div className="event-detail-registration-count">
                  <span>
                    Registered
                  </span>

                  <strong>
                    {registrationCount}
                  </strong>
                </div>
              )}

              {waitlistCount > 0 && (
                <div className="event-detail-waitlist-summary">
                  <span>
                    Waitlist
                  </span>

                  <strong>
                    {waitlistCount}
                  </strong>

                  <small>
                    {waitlistCount === 1
                      ? "person waiting"
                      : "people waiting"}
                  </small>
                </div>
              )}

              <RegistrationAction
                event={event}
                registrationInfo={
                  registrationInfo
                }
                fullWidth
              />
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function RegistrationAction({
  event,
  registrationInfo,
  fullWidth = false,
}) {
  const className = fullWidth
    ? "btn btn-primary btn-full"
    : "event-detail-register-button";

  const status = String(
    event.status || ""
  ).toLowerCase();

  if (status === "cancelled") {
    return (
      <button
        type="button"
        className={`${className} disabled`}
        disabled
      >
        Event cancelled
      </button>
    );
  }

  if (status === "postponed") {
    return (
      <button
        type="button"
        className={`${className} disabled`}
        disabled
      >
        Event postponed
      </button>
    );
  }

  if (status === "completed") {
    return (
      <button
        type="button"
        className={`${className} disabled`}
        disabled
      >
        Event completed
      </button>
    );
  }

  if (
    event.registration_enabled === false
  ) {
    return (
      <button
        type="button"
        className={`${className} disabled`}
        disabled
      >
        Registration unavailable
      </button>
    );
  }

  if (
    registrationInfo.canJoinWaitlist
  ) {
    return (
      <Link
        to={`/register/${event.id}`}
        className={className}
      >
        Join waitlist
        <span>→</span>
      </Link>
    );
  }

  if (!registrationInfo.registrationOpen) {
    return (
      <button
        type="button"
        className={`${className} disabled`}
        disabled
      >
        Registration closed
      </button>
    );
  }

  return (
    <Link
      to={`/register/${event.id}`}
      className={className}
    >
      Register for event
      <span>→</span>
    </Link>
  );
}

function getRegistrationHeading(
  event,
  registrationInfo
) {
  const status = String(
    event.status || ""
  ).toLowerCase();

  if (status === "cancelled") {
    return "Event cancelled";
  }

  if (status === "postponed") {
    return "Event postponed";
  }

  if (status === "completed") {
    return "Registration ended";
  }

  if (
    event.registration_enabled === false
  ) {
    return "Registration unavailable";
  }

  if (registrationInfo.isFull) {
    return "This event is full";
  }

  return "Ready to join this event?";
}

function getRegistrationDescription(
  event,
  registrationInfo
) {
  const status = String(
    event.status || ""
  ).toLowerCase();

  if (status === "cancelled") {
    return "Registration is unavailable because this event has been cancelled.";
  }

  if (status === "postponed") {
    return "Registration is temporarily unavailable while the event is postponed.";
  }

  if (status === "completed") {
    return "This event has already been completed.";
  }

  if (
    event.registration_enabled === false
  ) {
    return "Online registration is currently disabled for this event.";
  }

  if (
    registrationInfo.canJoinWaitlist
  ) {
    return "All available places have been taken. You can join the waitlist and be promoted when a place becomes available.";
  }

  return "Complete your registration online and receive your digital ticket ID.";
}

function convertTime(time) {
  if (!time) {
    return "00:00:00";
  }

  const trimmed =
    String(time).trim();

  if (
    /^\d{2}:\d{2}(:\d{2})?$/.test(
      trimmed
    )
  ) {
    return trimmed.length === 5
      ? `${trimmed}:00`
      : trimmed;
  }

  const [
    rawTime,
    rawModifier,
  ] = trimmed.split(/\s+/);

  const modifier =
    rawModifier?.toUpperCase();

  let [
    hours,
    minutes = "00",
  ] = rawTime.split(":");

  hours = Number(hours);

  if (
    modifier === "PM" &&
    hours !== 12
  ) {
    hours += 12;
  }

  if (
    modifier === "AM" &&
    hours === 12
  ) {
    hours = 0;
  }

  return `${String(hours).padStart(
    2,
    "0"
  )}:${minutes}:00`;
}

function formatEventTime(time) {
  if (!time) {
    return "TBA";
  }

  const match =
    String(time).match(
      /^(\d{2}):(\d{2})/
    );

  if (!match) {
    return String(time);
  }

  let hours =
    Number(match[1]);

  const minutes =
    match[2];

  const modifier =
    hours >= 12
      ? "PM"
      : "AM";

  hours =
    hours % 12 || 12;

  return `${hours}:${minutes} ${modifier}`;
}

function formatDate(date) {
  if (!date) {
    return "Date TBA";
  }

  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}

function formatUpdateTime(date) {
  if (!date) {
    return "";
  }

  return new Date(
    date
  ).toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function getUpdateClass(type) {
  const normalized =
    type?.toLowerCase();

  if (
    normalized === "important"
  ) {
    return "important";
  }

  if (
    normalized === "result"
  ) {
    return "result";
  }

  if (
    normalized === "highlight"
  ) {
    return "highlight";
  }

  if (
    normalized === "schedule"
  ) {
    return "schedule";
  }

  return "live";
}

export default EventDetails;