import { Link, useParams } from "react-router-dom";
import events from "../data/events";

function EventDetails() {
  const { id } = useParams();

  const event = events.find((item) => item.id === Number(id));

  if (!event) {
    return (
      <section className="section page-section">
        <div className="container">
          <h1>Event not found</h1>
          <Link to="/events">Return to events</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section page-section">
      <div className="container details-container">
        <span className="category">{event.category}</span>

        <h1 className="page-title">{event.title}</h1>

        <p className="details-description">{event.description}</p>

        <div className="details-card">
          <p>
            <strong>Date:</strong> {event.date}
          </p>

          <p>
            <strong>Time:</strong> {event.time}
          </p>

          <p>
            <strong>Location:</strong> {event.location}
          </p>
        </div>

        <Link to="/register" className="button primary-button">
          Register for Event
        </Link>
      </div>
    </section>
  );
}

export default EventDetails;