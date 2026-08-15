import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useStudentAuth } from "../contexts/StudentAuthContext";

function StudentSignup() {
  const navigate = useNavigate();

  const {
    signUp,
  } = useStudentAuth();

  const [formData, setFormData] =
    useState({
      fullName: "",
      studentId: "",
      grade: "",
      className: "",
      email: "",
      password: "",
      confirmPassword: "",
    });

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      formData.password.length < 8
    ) {
      setError(
        "Password must contain at least 8 characters."
      );

      return;
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );

      return;
    }

    if (
      !formData.studentId.trim()
    ) {
      setError(
        "Student ID is required."
      );

      return;
    }

    setSubmitting(true);

    const result =
      await signUp({
        email:
          formData.email,

        password:
          formData.password,

        fullName:
          formData.fullName,

        studentId:
          formData.studentId,

        grade:
          formData.grade,

        className:
          formData.className,
      });

    if (result.error) {
      setError(
        result.error.message ||
        "Could not create student account."
      );

      setSubmitting(false);

      return;
    }

    if (
      result.requiresEmailConfirmation
    ) {
      setSuccess(
        "Account created. Check your email to confirm your account before signing in."
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
    <main className="student-signup-page">

      <div className="student-signup-background">
        <span className="student-signup-orbit student-signup-orbit-one" />
        <span className="student-signup-orbit student-signup-orbit-two" />
      </div>

      <div className="student-signup-shell">

        <section className="student-signup-intro-panel">

          <Link
            to="/"
            className="student-signup-brand"
          >
            <span className="student-signup-brand-mark">
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

          <div className="student-signup-intro">

            <span className="student-signup-eyebrow">
              Student Account
            </span>

            <h1>
              Activate your
              <span>
                {" "}
                EventHub access.
              </span>
            </h1>

            <p>
              Create your student account to
              register for events, access digital
              tickets and manage your school
              activities.
            </p>

          </div>

          <div className="student-signup-info">

            <div>
              <span>01</span>

              <div>
                <strong>
                  Register once
                </strong>

                <p>
                  Your profile is connected to your
                  student account.
                </p>
              </div>
            </div>

            <div>
              <span>02</span>

              <div>
                <strong>
                  Access your tickets
                </strong>

                <p>
                  Event registrations stay linked to
                  your account.
                </p>
              </div>
            </div>

            <div>
              <span>03</span>

              <div>
                <strong>
                  Stay updated
                </strong>

                <p>
                  Follow upcoming school events from
                  one place.
                </p>
              </div>
            </div>

          </div>

        </section>

        <section className="student-signup-form-panel">

          <div className="student-signup-form-wrap">

            <div className="student-signup-form-heading">

              <span>
                Account Activation
              </span>

              <h2>
                Create student account
              </h2>

              <p>
                Enter your school information and
                choose your login credentials.
              </p>

            </div>

            <form
              className="student-signup-form"
              onSubmit={handleSubmit}
            >

              <div className="student-signup-field">

                <label htmlFor="student-full-name">
                  Full name
                </label>

                <input
                  id="student-full-name"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Your full name"
                  disabled={submitting}
                  required
                />

              </div>

              <div className="student-signup-field">

                <label htmlFor="student-id">
                  Student ID
                </label>

                <input
                  id="student-id"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  placeholder="STU-2026-001"
                  disabled={submitting}
                  required
                />

              </div>

              <div className="student-signup-row">

                <div className="student-signup-field">

                  <label htmlFor="student-grade">
                    Grade
                  </label>

                  <input
                    id="student-grade"
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    placeholder="Grade 11"
                    disabled={submitting}
                  />

                </div>

                <div className="student-signup-field">

                  <label htmlFor="student-class">
                    Class
                  </label>

                  <input
                    id="student-class"
                    name="className"
                    value={formData.className}
                    onChange={handleChange}
                    placeholder="11-A"
                    disabled={submitting}
                  />

                </div>

              </div>

              <div className="student-signup-field">

                <label htmlFor="student-signup-email">
                  Email address
                </label>

                <input
                  id="student-signup-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="student@school.com"
                  autoComplete="email"
                  disabled={submitting}
                  required
                />

              </div>

              <div className="student-signup-row">

                <div className="student-signup-field">

                  <label htmlFor="student-signup-password">
                    Password
                  </label>

                  <input
                    id="student-signup-password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
                    minLength="8"
                    autoComplete="new-password"
                    disabled={submitting}
                    required
                  />

                </div>

                <div className="student-signup-field">

                  <label htmlFor="student-confirm-password">
                    Confirm password
                  </label>

                  <input
                    id="student-confirm-password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    minLength="8"
                    autoComplete="new-password"
                    disabled={submitting}
                    required
                  />

                </div>

              </div>

              {error && (
                <div className="student-signup-error">
                  <span>!</span>
                  <p>{error}</p>
                </div>
              )}

              {success && (
                <div className="student-signup-success">
                  <span>✓</span>
                  <p>{success}</p>
                </div>
              )}

              <button
                type="submit"
                className="student-signup-submit"
                disabled={submitting}
              >
                <span>
                  {submitting
                    ? "Creating account..."
                    : "Create account"}
                </span>

                {!submitting && (
                  <span>
                    →
                  </span>
                )}
              </button>

            </form>

            <div className="student-signup-login">

              <span>
                Already activated your account?
              </span>

              <Link to="/student/login">
                Student login →
              </Link>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}

export default StudentSignup;