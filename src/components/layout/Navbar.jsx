import { Link, NavLink } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="container navbar-content">
        <Link to="/" className="logo">
          EventHub
        </Link>

        <div className="nav-links">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/events">Events</NavLink>
          <NavLink to="/calendar">Calendar</NavLink>
          <NavLink to="/announcements">Announcements</NavLink>

          <NavLink to="/register" className="register-link">
            Register
          </NavLink>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;