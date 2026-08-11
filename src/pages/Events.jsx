import { Link } from "react-router-dom";
import events from "../data/events";

function Events() {
  return (
    <section className="section page-section">
      <div className="container">
        <p className="eyebrow">DISCOVER</p>
        <h1 className="page-title">All Events</h1>

        <div className="event-grid">
          {events.map((event) => (
            <article className="event-card" key={event.id}>
              <span className="category">{event.category}</span>

              <h3>{event.title}</h3>

              <p>{event.description}</p>

              <div className="event-meta">
                <span>📅 {event.date}</span>
                <span>🕐 {event.time}</span>
                <span>📍 {event.location}</span>
              </div>

              <Link to={`/events/${event.id}`} className="card-link">
                View event →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Events;