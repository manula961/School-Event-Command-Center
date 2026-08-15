import { useState } from "react";
import {
  Link,
  Navigate,
} from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";


function AdminLogin() {
  const {
    isCMSUser,
    role,
    signIn,
    loading: authLoading,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  const destination =
    role === "event_staff"
      ? "/admin/check-in"
      : "/admin";


  if (authLoading) {
    return (
      <main className="admin-login-page">
        <div className="auth-loading">
          Loading Command Center...
        </div>
      </main>
    );
  }


  if (isCMSUser) {
    return (
      <Navigate
        to={destination}
        replace
      />
    );
  }


  async function handleSubmit(event) {
    event.preventDefault();

    const cleanEmail =
      email
        .trim()
        .toLowerCase();


    if (
      !cleanEmail ||
      !password
    ) {
      setError(
        "Enter your email address and password."
      );

      return;
    }


    setLoading(true);
    setError("");


    const {
      error: signInError,
    } = await signIn(
      cleanEmail,
      password
    );


    if (signInError) {
      const message =
        signInError.message ||
        "";


      if (
        message.includes(
          "CMS access"
        )
      ) {
        setError(
          "This account does not have access to EventHub Administration."
        );
      } else if (
        message
          .toLowerCase()
          .includes(
            "invalid login credentials"
          )
      ) {
        setError(
          "Invalid email or password."
        );
      } else if (
        message
          .toLowerCase()
          .includes(
            "email not confirmed"
          )
      ) {
        setError(
          "Please confirm your email address before signing in."
        );
      } else {
        setError(
          message ||
          "Unable to sign in."
        );
      }


      setLoading(false);

      return;
    }


    setLoading(false);
  }


  return (
    <main className="admin-login-page">

      <div className="admin-login-background">

        <span className="admin-login-orbit admin-login-orbit-one" />

        <span className="admin-login-orbit admin-login-orbit-two" />

      </div>


      <div className="admin-login-shell">

        <section className="admin-login-brand-panel">

          <Link
            to="/"
            className="admin-login-brand"
          >

            <span className="admin-login-brand-mark">
              <span />
              <span />
            </span>


            <div>

              <strong>
                EventHub
              </strong>

              <span>
                School Event Command Center
              </span>

            </div>

          </Link>


          <div className="admin-login-intro">

            <span className="admin-login-eyebrow">
              Administration
            </span>


            <h1>
              Manage every event
              <span>
                {" "}
                from one place.
              </span>
            </h1>


            <p>
              Secure access for managing
              events, announcements,
              registrations and live activity
              across the platform.
            </p>

          </div>


          <div className="admin-login-features">

            <div>

              <span>
                01
              </span>

              <div>

                <strong>
                  Event management
                </strong>

                <p>
                  Create and update school
                  events.
                </p>

              </div>

            </div>


            <div>

              <span>
                02
              </span>

              <div>

                <strong>
                  Live publishing
                </strong>

                <p>
                  Post announcements and
                  event updates.
                </p>

              </div>

            </div>


            <div>

              <span>
                03
              </span>

              <div>

                <strong>
                  Registration overview
                </strong>

                <p>
                  Review attendees and
                  digital tickets.
                </p>

              </div>

            </div>

          </div>


          <div className="admin-login-panel-footer">

            <span>
              EventHub Administration
            </span>

            <span>
              Secure workspace
            </span>

          </div>

        </section>


        <section className="admin-login-form-panel">

          <div className="admin-login-form-wrap">

            <div className="admin-login-form-heading">

              <span>
                CMS access
              </span>

              <h2>
                Welcome back
              </h2>

              <p>
                Enter your authorized
                EventHub credentials to
                continue.
              </p>

            </div>


            <form
              className="admin-login-form"
              onSubmit={handleSubmit}
            >

              <div className="admin-login-field">

                <label htmlFor="admin-email">
                  Email address
                </label>


                <div className="admin-login-input-wrap">

                  <span className="admin-login-input-icon">
                    @
                  </span>


                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="admin@example.com"
                    autoComplete="email"
                    disabled={loading}
                    required
                  />

                </div>

              </div>


              <div className="admin-login-field">

                <label htmlFor="admin-password">
                  Password
                </label>


                <div className="admin-login-input-wrap">

                  <span className="admin-login-input-icon">
                    •
                  </span>


                  <input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />

                </div>

              </div>


              {error && (
                <div
                  className="admin-login-error"
                  role="alert"
                >

                  <span>
                    !
                  </span>

                  <p>
                    {error}
                  </p>

                </div>
              )}


              <button
                type="submit"
                className="admin-login-submit"
                disabled={loading}
              >

                <span>
                  {loading
                    ? "Signing in..."
                    : "Sign in"}
                </span>

                {!loading && (
                  <span>
                    →
                  </span>
                )}

              </button>

            </form>


            <div className="admin-login-return">

              <Link to="/">
                <span>
                  ←
                </span>

                Return to public website
              </Link>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}


export default AdminLogin;