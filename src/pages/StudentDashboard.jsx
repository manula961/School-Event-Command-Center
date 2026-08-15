import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../services/supabase";
import { useStudentAuth } from "../contexts/StudentAuthContext";


function StudentDashboard() {
  const navigate =
    useNavigate();

  const {
    student,
    profile,
    signOut,
  } = useStudentAuth();


  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [
    notificationsLoading,
    setNotificationsLoading,
  ] = useState(true);

  const [
    notificationError,
    setNotificationError,
  ] = useState("");

  const [
    markingReadId,
    setMarkingReadId,
  ] = useState(null);


  async function handleLogout() {
    await signOut();

    navigate(
      "/student/login"
    );
  }


  async function fetchNotifications() {
    if (
      !student?.id
    ) {
      setNotifications([]);
      setNotificationsLoading(false);

      return;
    }


    setNotificationsLoading(true);
    setNotificationError("");


    const {
      data,
      error,
    } = await supabase
      .from("notifications")
      .select(`
        id,
        user_id,
        event_id,
        title,
        message,
        type,
        read_at,
        created_at
      `)
      .eq(
        "user_id",
        student.id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(8);


    if (error) {
      console.error(
        "Could not load notifications:",
        error
      );

      setNotificationError(
        "Could not load your notifications."
      );

      setNotifications([]);
      setNotificationsLoading(false);

      return;
    }


    setNotifications(
      data || []
    );

    setNotificationsLoading(false);
  }


  useEffect(() => {
    fetchNotifications();
  }, [
    student?.id,
  ]);


  const unreadCount =
    useMemo(() => {
      return notifications.filter(
        (notification) =>
          !notification.read_at
      ).length;
    }, [
      notifications,
    ]);


  async function markAsRead(
    notification
  ) {
    if (
      !notification ||
      notification.read_at
    ) {
      return;
    }


    setMarkingReadId(
      notification.id
    );


    const {
      data,
      error,
    } = await supabase
      .rpc(
        "mark_notification_read",
        {
          p_notification_id:
            notification.id,
        }
      );


    if (error) {
      console.error(
        "Could not mark notification as read:",
        error
      );

      setNotificationError(
        "Could not update this notification."
      );

      setMarkingReadId(
        null
      );

      return;
    }


    if (
      data === true
    ) {
      setNotifications(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              notification.id
                ? {
                    ...item,
                    read_at:
                      new Date()
                        .toISOString(),
                  }
                : item
          )
      );
    }


    setMarkingReadId(
      null
    );
  }


  async function markAllAsRead() {
    const unread =
      notifications.filter(
        (notification) =>
          !notification.read_at
      );


    for (
      const notification
      of unread
    ) {
      const {
        error,
      } = await supabase
        .rpc(
          "mark_notification_read",
          {
            p_notification_id:
              notification.id,
          }
        );


      if (error) {
        console.error(
          "Could not mark notification as read:",
          error
        );
      }
    }


    await fetchNotifications();
  }


  return (
    <main className="student-dashboard-page">

      <section className="student-dashboard-hero">

        <div className="container">

          <div className="student-dashboard-hero-grid">

            <div className="student-dashboard-heading">

              <span className="student-dashboard-eyebrow">
                Student Portal
              </span>

              <h1>
                Welcome
                {profile?.full_name
                  ? `, ${getFirstName(
                      profile.full_name
                    )}`
                  : ""}
              </h1>

              <p>
                Manage your registrations,
                digital tickets, notifications
                and upcoming school activities
                from one place.
              </p>

              <div className="student-dashboard-heading-actions">

                <Link
                  to="/events"
                  className="btn btn-primary"
                >
                  Browse Events
                  <span>
                    →
                  </span>
                </Link>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={
                    handleLogout
                  }
                >
                  Log out
                </button>

              </div>

            </div>


            <div className="student-dashboard-identity">

              <div className="student-dashboard-avatar">
                {getInitials(
                  profile?.full_name
                )}
              </div>

              <div className="student-dashboard-identity-copy">

                <span>
                  Student Account
                </span>

                <h2>
                  {profile?.full_name ||
                    "Student"}
                </h2>

                <p>
                  {student?.email ||
                    "No email available"}
                </p>

                {unreadCount > 0 && (
                  <div className="student-notification-count">
                    {unreadCount} unread notification
                    {unreadCount === 1
                      ? ""
                      : "s"}
                  </div>
                )}

              </div>

            </div>

          </div>

        </div>

      </section>


      <section className="student-dashboard-content">

        <div className="container">

          <section className="student-dashboard-profile">

            <StudentInfo
              label="Student ID"
              value={
                profile?.student_id ||
                "—"
              }
            />

            <StudentInfo
              label="Grade"
              value={
                profile?.grade ||
                "—"
              }
            />

            <StudentInfo
              label="Class"
              value={
                profile?.class_name ||
                "—"
              }
            />

            <StudentInfo
              label="Email"
              value={
                student?.email ||
                "—"
              }
            />

          </section>


          <section className="student-notifications-section">

            <div className="student-dashboard-section-heading student-notifications-heading">

              <div>

                <span className="student-dashboard-eyebrow">
                  Notifications
                </span>

                <h2>
                  Latest updates
                </h2>

              </div>


              <div className="student-notifications-heading-actions">

                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={
                      markAllAsRead
                    }
                  >
                    Mark all read
                  </button>
                )}


                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={
                    fetchNotifications
                  }
                  disabled={
                    notificationsLoading
                  }
                >
                  {notificationsLoading
                    ? "Refreshing..."
                    : "Refresh"}
                </button>

              </div>

            </div>


            {notificationError && (
              <div className="student-notification-error">

                <span>
                  !
                </span>

                <p>
                  {notificationError}
                </p>

              </div>
            )}


            {notificationsLoading ? (
              <div className="student-notifications-loading">

                <div className="loading-spinner" />

                <span>
                  Loading notifications...
                </span>

              </div>
            ) : notifications.length === 0 ? (
              <div className="student-notifications-empty">

                <div>
                  ◇
                </div>

                <strong>
                  No notifications yet
                </strong>

                <p>
                  Event updates, waitlist promotions
                  and important alerts will appear here.
                </p>

              </div>
            ) : (
              <div className="student-notifications-list">

                {notifications.map(
                  (notification) => {

                    const unread =
                      !notification.read_at;


                    return (
                      <article
                        key={
                          notification.id
                        }
                        className={
                          unread
                            ? "student-notification-card unread"
                            : "student-notification-card"
                        }
                      >

                        <div className="student-notification-icon">
                          {getNotificationIcon(
                            notification.type
                          )}
                        </div>


                        <div className="student-notification-main">

                          <div className="student-notification-top">

                            <div>

                              <span>
                                {formatNotificationType(
                                  notification.type
                                )}
                              </span>

                              <h3>
                                {notification.title}
                              </h3>

                            </div>


                            {unread && (
                              <span className="student-notification-unread">
                                New
                              </span>
                            )}

                          </div>


                          <p>
                            {notification.message}
                          </p>


                          <div className="student-notification-meta">

                            <span>
                              {formatNotificationTime(
                                notification.created_at
                              )}
                            </span>

                            {notification.event_id && (
                              <Link
                                to={`/events/${notification.event_id}`}
                              >
                                View event →
                              </Link>
                            )}

                          </div>

                        </div>


                        {unread && (
                          <button
                            type="button"
                            className="student-notification-read-button"
                            disabled={
                              markingReadId ===
                              notification.id
                            }
                            onClick={() =>
                              markAsRead(
                                notification
                              )
                            }
                          >
                            {markingReadId ===
                            notification.id
                              ? "Saving..."
                              : "Mark read"}
                          </button>
                        )}

                      </article>
                    );
                  }
                )}

              </div>
            )}

          </section>


          <div className="student-dashboard-section-heading">

            <div>

              <span className="student-dashboard-eyebrow">
                Quick Access
              </span>

              <h2>
                Your EventHub
              </h2>

            </div>

          </div>


          <section className="student-dashboard-actions">

            <DashboardCard
              number="01"
              title="Browse Events"
              description="Discover upcoming school events, competitions and activities."
              action="Explore events"
              to="/events"
              accent="cyan"
            />

            <DashboardCard
              number="02"
              title="My Events"
              description="View confirmed registrations and your current event waitlists."
              action="View registrations"
              to="/student/registrations"
              accent="navy"
            />

            <DashboardCard
              number="03"
              title="My Tickets"
              description="Access digital tickets for your confirmed EventHub activities."
              action="View tickets"
              to="/student/tickets"
              accent="red"
            />

          </section>


          <section className="student-dashboard-overview">

            <div className="student-dashboard-overview-copy">

              <span className="student-dashboard-eyebrow">
                Student Command Center
              </span>

              <h2>
                Everything you need for your next event.
              </h2>

              <p>
                Browse events, complete registrations,
                access your tickets and stay connected
                with school activities through EventHub.
              </p>

            </div>


            <div className="student-dashboard-overview-links">

              <Link
                to="/calendar"
              >
                <span>
                  Calendar
                </span>

                <strong>
                  View schedule →
                </strong>
              </Link>


              <Link
                to="/announcements"
              >
                <span>
                  Updates
                </span>

                <strong>
                  Read announcements →
                </strong>
              </Link>

            </div>

          </section>

        </div>

      </section>

    </main>
  );
}


function StudentInfo({
  label,
  value,
}) {
  return (
    <div className="student-dashboard-profile-item">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


function DashboardCard({
  number,
  title,
  description,
  action,
  to,
  accent,
}) {
  return (
    <Link
      to={to}
      className={`student-dashboard-card student-dashboard-card--${accent}`}
    >

      <div className="student-dashboard-card-top">

        <span>
          {number}
        </span>

        <div>
          →
        </div>

      </div>

      <h2>
        {title}
      </h2>

      <p>
        {description}
      </p>

      <strong>
        {action}
      </strong>

    </Link>
  );
}


function getNotificationIcon(
  type
) {
  if (
    type ===
    "waitlist_promoted"
  ) {
    return "✓";
  }


  if (
    type ===
    "event_update"
  ) {
    return "↻";
  }


  if (
    type ===
    "event"
  ) {
    return "◫";
  }


  return "•";
}


function formatNotificationType(
  type
) {
  const labels = {
    waitlist_promoted:
      "Waitlist",

    event_update:
      "Event Update",

    event:
      "Event",

    info:
      "Information",
  };


  return (
    labels[type] ||
    String(
      type ||
      "Notification"
    )
      .replace(
        /_/g,
        " "
      )
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      )
  );
}


function formatNotificationTime(
  value
) {
  if (!value) {
    return "";
  }


  const date =
    new Date(
      value
    );

  const now =
    new Date();


  const difference =
    now.getTime() -
    date.getTime();


  const minutes =
    Math.floor(
      difference /
      60000
    );


  if (
    minutes <
    1
  ) {
    return "Just now";
  }


  if (
    minutes <
    60
  ) {
    return `${minutes}m ago`;
  }


  const hours =
    Math.floor(
      minutes /
      60
    );


  if (
    hours <
    24
  ) {
    return `${hours}h ago`;
  }


  const days =
    Math.floor(
      hours /
      24
    );


  if (
    days <
    7
  ) {
    return `${days}d ago`;
  }


  return date
    .toLocaleDateString(
      "en-US",
      {
        month:
          "short",

        day:
          "numeric",

        year:
          "numeric",
      }
    );
}


function getFirstName(
  name
) {
  if (!name) {
    return "";
  }


  return name
    .trim()
    .split(/\s+/)[0];
}


function getInitials(
  name
) {
  if (!name) {
    return "ST";
  }


  return name
    .trim()
    .split(/\s+/)
    .slice(
      0,
      2
    )
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase()
    )
    .join("");
}


export default StudentDashboard;