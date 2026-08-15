import { Link } from "react-router-dom";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <div className="site-footer-brand-line">
              <span className="footer-brand-dot" />
              <strong>EventHub</strong>
            </div>

            <p>
              A unified platform for school events, schedules,
              registrations and important updates.
            </p>
          </div>

          <div>
            <h4>Platform</h4>

            <div className="site-footer-links">
              <Link to="/events">Events</Link>
              <Link to="/calendar">Calendar</Link>
              <Link to="/announcements">Updates</Link>
            </div>
          </div>

          <div>
            <h4>Access</h4>

            <div className="site-footer-links">
              <Link to="/admin/login">Admin</Link>
              <Link to="/events">Registrations</Link>
            </div>
          </div>

          <div>
            <h4>Explore</h4>

            <div className="site-footer-links">
              <Link to="/">Home</Link>
              <Link to="/events">Upcoming events</Link>
            </div>
          </div>
        </div>

        <div className="site-footer-bottom">
          <span>© {year} EventHub</span>

          <span>School Event Command Center</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;