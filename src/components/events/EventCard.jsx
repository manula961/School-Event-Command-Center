import { Link } from "react-router-dom";
import Countdown from "./Countdown";
import EventStatus from "./EventStatus";

function formatDate(date) {
  if (!date) {
    return "Date TBA";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function EventCard({ event, accent = "navy" }) {
  return (
    <article className="event-card-new">
      <div
        className={`event-card-accent event-card-accent-${accent}`}
      />

      <div className="event-card-new-body">
        <div className="event-card-new-top">
          <span className="event-card-new-category">
            {event.category || "School Event"}
          </span>

          <EventStatus
            status={event.status || "Upcoming"}
          />
        </div>

        <h3>{event.title}</h3>

        <p className="event-card-new-description">
          {event.description
            ? event.description.length > 115
              ? `${event.description.slice(0, 115)}...`
              : event.description
            : "More information about this event will be published soon."}
        </p>

        <div className="event-card-new-meta">
          <div className="event-card-meta-row">
            <span className="event-meta-symbol">
              ◷
            </span>

            <div>
              <small>Date</small>

              <strong>
                {formatDate(event.event_date)}
              </strong>
            </div>
          </div>

          <div className="event-card-meta-row">
            <span className="event-meta-symbol">
              ⌖
            </span>

            <div>
              <small>Venue</small>

              <strong>
                {event.location ||
                  event.venue ||
                  "Venue TBA"}
              </strong>
            </div>
          </div>
        </div>

        {event.event_date && (
          <div className="event-card-countdown">
            <span className="event-card-countdown-label">
              Starts in
            </span>

            <Countdown targetDate={event.event_date} />
          </div>
        )}

        <div className="event-card-new-footer">
          <Link
            to={`/events/${event.id}`}
            className="event-card-new-link"
          >
            View event
            <span>→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

export default EventCard;