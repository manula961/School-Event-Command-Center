import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";

import { useStudentAuth } from "../contexts/StudentAuthContext";


function StudentLogin() {
  const navigate =
    useNavigate();


  const {
    student,
    profile,
    loading,
    signIn,
  } = useStudentAuth();


  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [error, setError] =
    useState("");


  useEffect(() => {
    if (
      !loading &&
      student &&
      profile
    ) {
      navigate(
        "/student/dashboard",
        {
          replace: true,
        }
      );
    }
  }, [
    loading,
    student,
    profile,
    navigate,
  ]);


  if (
    !loading &&
    student &&
    profile
  ) {
    return (
      <Navigate
        to="/student/dashboard"
        replace
      />
    );
  }


  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    setSubmitting(true);
    setError("");


    const result =
      await signIn(
        email,
        password
      );


    if (result.error) {
      setError(
        result.error.message ||
        "Could not sign in."
      );

      setSubmitting(false);

      return;
    }


    setSubmitting(false);


    navigate(
      "/student/dashboard",
      {
        replace: true,
      }
    );
  }


  return (
    <main className="student-login-page">

      <div className="student-login-background">
        <span className="student-login-orbit student-login-orbit-one" />
        <span className="student-login-orbit student-login-orbit-two" />
      </div>


      <div className="student-login-shell">

        <section className="student-login-brand-panel">

          <Link
            to="/"
            className="student-login-brand"
          >
            <span className="student-login-brand-mark">
              <span />
              <span />
            </span>

            <div>
              <strong>
                EventHub
              </strong>

              <span>
                Student Portal
              </span>
            </div>
          </Link>


          <div className="student-login-intro">

            <span className="student-login-eyebrow">
              Student Access
            </span>


            <h1>
              Your school events.
              <span>
                {" "}
                One place.
              </span>
            </h1>


            <p>
              Sign in to manage your event
              registrations, tickets and
              upcoming activities.
            </p>

          </div>


          <div className="student-login-features">

            <div>
              <span>
                01
              </span>

              <div>
                <strong>
                  My Events
                </strong>

                <p>
                  Keep track of events you
                  have registered for.
                </p>
              </div>
            </div>


            <div>
              <span>
                02
              </span>

              <div>
                <strong>
                  Digital Tickets
                </strong>

                <p>
                  Access your EventHub
                  tickets whenever you
                  need them.
                </p>
              </div>
            </div>


            <div>
              <span>
                03
              </span>

              <div>
                <strong>
                  Event Updates
                </strong>

                <p>
                  Stay informed about
                  schedules, venues and
                  live updates.
                </p>
              </div>
            </div>

          </div>


          <div className="student-login-panel-footer">

            <span>
              EventHub Student Portal
            </span>

            <span>
              Secure school access
            </span>

          </div>

        </section>


        <section className="student-login-form-panel">

          <div className="student-login-form-wrap">

            <div className="student-login-form-heading">

              <span>
                Student Account
              </span>


              <h2>
                Welcome back
              </h2>


              <p>
                Enter your student account
                credentials to continue.
              </p>

            </div>


            <form
              className="student-login-form"
              onSubmit={handleSubmit}
            >

              <div className="student-login-field">

                <label htmlFor="student-email">
                  Email address
                </label>


                <div className="student-login-input-wrap">

                  <span className="student-login-input-icon">
                    @
                  </span>


                  <input
                    id="student-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="student@school.com"
                    autoComplete="email"
                    disabled={submitting}
                    required
                  />

                </div>

              </div>


              <div className="student-login-field">

                <label htmlFor="student-password">
                  Password
                </label>


                <div className="student-login-input-wrap">

                  <span className="student-login-input-icon">
                    •
                  </span>


                  <input
                    id="student-password"
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={submitting}
                    required
                  />

                </div>

              </div>


              {error && (
                <div className="student-login-error">

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
                className="student-login-submit"
                disabled={submitting}
              >
                <span>
                  {submitting
                    ? "Signing in..."
                    : "Sign in"}
                </span>

                {!submitting && (
                  <span>
                    →
                  </span>
                )}
              </button>

            </form>


            <div className="student-login-signup">

              <span>
                Don't have a student account?
              </span>

              <Link to="/student/signup">
                Create account →
              </Link>

            </div>


            <div className="student-login-return">

              <Link to="/">
                <span>
                  ←
                </span>

                Return to EventHub
              </Link>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}


export default StudentLogin;