import { Link } from "react-router-dom";
import events from "../data/events";

function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-content">
          <p className="eyebrow">YOUR SCHOOL. YOUR EVENTS.</p>

          <h1>
            Everything happening,
            <br />
            all in one place.
          </h1>

          <p className="hero-description">
            Discover upcoming events, announcements, registrations and important
            updates from across the school.
          </p>

          <div className="hero-buttons">
            <Link to="/events" className="button primary-button">
              Explore Events
            </Link>

            <Link to="/calendar" className="button secondary-button">
              View Calendar
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DON'T MISS OUT</p>
              <h2>Upcoming events</h2>
            </div>

            <Link to="/events">View all events →</Link>
          </div>

          <div className="event-grid">
            {events.map((event) => (
              <article className="event-card" key={event.id}>
                <span className="category">{event.category}</span>

                <h3>{event.title}</h3>

                <p>{event.description}</p>

                <div className="event-meta">
                  <span>📅 {event.date}</span>
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

      <section className="announcement-section">
        <div className="container announcement-box">
          <div>
            <p className="eyebrow">LATEST ANNOUNCEMENT</p>
            <h2>Stay informed.</h2>
            <p>
              Important school event announcements and changes will appear here
              so students, teachers and parents never miss an update.
            </p>
          </div>

          <Link to="/announcements" className="button secondary-button">
            Announcements
          </Link>
        </div>
      </section>
    </>
  );
}

export default Home;