
import { Link } from "react-router-dom";

function NotFound() {
  return (
    <main className="not-found-page">
      <div className="container not-found-inner">
        <span className="not-found-code">404</span>

        <h1>Page not found</h1>

        <p>
          The page you are looking for may have moved,
          changed or no longer exists.
        </p>

        <Link to="/" className="btn btn-primary">
          Return home
          <span>→</span>
        </Link>
      </div>
    </main>
  );
}

export default NotFound;