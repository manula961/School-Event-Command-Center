import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  NavLink,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../../services/supabase";
import { useStudentAuth } from "../../contexts/StudentAuthContext";


function Navbar() {
  const navigate =
    useNavigate();

  const notificationRef =
    useRef(null);


  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    notificationOpen,
    setNotificationOpen,
  ] = useState(false);

  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [
    notificationLoading,
    setNotificationLoading,
  ] = useState(false);


  const {
    student,
    profile,
    loading,
  } = useStudentAuth();


  const isStudent =
    !loading &&
    Boolean(
      student &&
      profile
    );


  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.is_read
    ).length;


  async function fetchNotifications() {
    if (
      !student?.id
    ) {
      setNotifications([]);

      return;
    }


    setNotificationLoading(
      true
    );


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
        is_read,
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
      .limit(10);


    if (error) {
      console.error(
        "Could not load notifications:",
        error
      );

      setNotifications([]);
      setNotificationLoading(false);

      return;
    }


    setNotifications(
      data ||
      []
    );

    setNotificationLoading(
      false
    );
  }


  useEffect(() => {
    if (
      loading ||
      !student?.id
    ) {
      setNotifications([]);

      return;
    }


    fetchNotifications();


    const channel =
      supabase
        .channel(
          `student-notifications-${student.id}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter:
              `user_id=eq.${student.id}`,
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();


    return () => {
      supabase
        .removeChannel(
          channel
        );
    };
  }, [
    student?.id,
    loading,
  ]);


  useEffect(() => {
    function handleOutsideClick(
      event
    ) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          event.target
        )
      ) {
        setNotificationOpen(
          false
        );
      }
    }


    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );


    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);


  function closeMenu() {
    setOpen(false);
    setNotificationOpen(false);
  }


  function toggleNotifications() {
    setNotificationOpen(
      (current) =>
        !current
    );

    setOpen(false);
  }


  async function markNotificationRead(
    notification
  ) {
    if (
      notification.is_read
    ) {
      return true;
    }


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

      return false;
    }


    setNotifications(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            notification.id
              ? {
                  ...item,
                  is_read:
                    true,
                }
              : item
        )
    );


    return true;
  }


  async function handleNotificationClick(
    notification
  ) {
    await markNotificationRead(
      notification
    );


    setNotificationOpen(
      false
    );

    setOpen(false);


    if (
      notification.type ===
        "waitlist_promoted"
    ) {
      navigate(
        "/student/tickets"
      );

      return;
    }


    if (
      notification.event_id
    ) {
      navigate(
        `/events/${notification.event_id}`
      );

      return;
    }


    navigate(
      "/student/dashboard"
    );
  }


  async function markAllRead() {
    const unread =
      notifications.filter(
        (notification) =>
          !notification.is_read
      );


    if (
      unread.length === 0
    ) {
      return;
    }


    await Promise.all(
      unread.map(
        (notification) =>
          supabase.rpc(
            "mark_notification_read",
            {
              p_notification_id:
                notification.id,
            }
          )
      )
    );


    await fetchNotifications();
  }


  return (
    <header className="site-navbar">

      <div className="container site-navbar-inner">

        <div className="site-brand">

          <Link
            to="/"
            className="site-brand-mark-link"
            onClick={closeMenu}
            aria-label="EventHub home"
          >
            <span className="site-brand-mark">
              <span />
              <span />
            </span>
          </Link>


          <span className="site-brand-copy">

            <Link
              to="/"
              className="site-brand-title"
              onClick={closeMenu}
            >
              EventHub
            </Link>


            <Link
              to="/admin/login"
              className="site-admin-secret"
              onClick={closeMenu}
            >
              School Event Command Center
            </Link>

          </span>

        </div>


        <nav
          className={
            `site-nav ${
              open
                ? "open"
                : ""
            }`
          }
        >

          <NavLink
            to="/"
            end
            onClick={closeMenu}
            className={({
              isActive,
            }) =>
              `site-nav-link ${
                isActive
                  ? "active"
                  : ""
              }`
            }
          >
            Home
          </NavLink>


          <NavLink
            to="/events"
            onClick={closeMenu}
            className={({
              isActive,
            }) =>
              `site-nav-link ${
                isActive
                  ? "active"
                  : ""
              }`
            }
          >
            Events
          </NavLink>


          <NavLink
            to="/calendar"
            onClick={closeMenu}
            className={({
              isActive,
            }) =>
              `site-nav-link ${
                isActive
                  ? "active"
                  : ""
              }`
            }
          >
            Calendar
          </NavLink>


          <NavLink
            to="/announcements"
            onClick={closeMenu}
            className={({
              isActive,
            }) =>
              `site-nav-link ${
                isActive
                  ? "active"
                  : ""
              }`
            }
          >
            Updates
          </NavLink>


          {!loading &&
            isStudent && (
              <div
                className="student-notification-wrap"
                ref={
                  notificationRef
                }
              >

                <button
                  type="button"
                  className={
                    notificationOpen
                      ? "student-notification-button active"
                      : "student-notification-button"
                  }
                  onClick={
                    toggleNotifications
                  }
                  aria-label="Student notifications"
                  aria-expanded={
                    notificationOpen
                  }
                >

                  <span className="student-notification-icon">
                    ◉
                  </span>


                  {unreadCount >
                    0 && (
                    <span className="student-notification-badge">
                      {unreadCount >
                      9
                        ? "9+"
                        : unreadCount}
                    </span>
                  )}

                </button>


                {notificationOpen && (
                  <div className="student-notification-panel">

                    <div className="student-notification-header">

                      <div>

                        <span>
                          Student Portal
                        </span>

                        <h3>
                          Notifications
                        </h3>

                      </div>


                      {unreadCount >
                        0 && (
                        <button
                          type="button"
                          onClick={
                            markAllRead
                          }
                        >
                          Mark all read
                        </button>
                      )}

                    </div>


                    <div className="student-notification-summary">

                      <span>
                        {unreadCount ===
                        0
                          ? "You're all caught up"
                          : `${unreadCount} unread notification${
                              unreadCount ===
                              1
                                ? ""
                                : "s"
                            }`}
                      </span>

                    </div>


                    <div className="student-notification-list">

                      {notificationLoading ? (
                        <div className="student-notification-loading">

                          <div className="loading-spinner" />

                          <span>
                            Loading notifications...
                          </span>

                        </div>
                      ) : notifications.length ===
                        0 ? (
                        <div className="student-notification-empty">

                          <div>
                            ◇
                          </div>

                          <strong>
                            No notifications
                          </strong>

                          <span>
                            Event updates and
                            registration alerts
                            will appear here.
                          </span>

                        </div>
                      ) : (
                        notifications.map(
                          (
                            notification
                          ) => (
                            <button
                              key={
                                notification.id
                              }
                              type="button"
                              className={
                                notification.is_read
                                  ? "student-notification-item"
                                  : "student-notification-item unread"
                              }
                              onClick={() =>
                                handleNotificationClick(
                                  notification
                                )
                              }
                            >

                              <span
                                className={
                                  `student-notification-type student-notification-type--${
                                    notification.type ||
                                    "default"
                                  }`
                                }
                              >
                                {getNotificationIcon(
                                  notification.type
                                )}
                              </span>


                              <span className="student-notification-content">

                                <span className="student-notification-item-top">

                                  <strong>
                                    {notification.title ||
                                      "EventHub notification"}
                                  </strong>


                                  {!notification.is_read && (
                                    <i />
                                  )}

                                </span>


                                <span className="student-notification-message">
                                  {notification.message ||
                                    "You have a new EventHub notification."}
                                </span>


                                <small>
                                  {formatNotificationTime(
                                    notification.created_at
                                  )}
                                </small>

                              </span>

                            </button>
                          )
                        )
                      )}

                    </div>


                    <div className="student-notification-footer">

                      <Link
                        to="/student/dashboard"
                        onClick={
                          closeMenu
                        }
                      >
                        Open student dashboard

                        <span>
                          →
                        </span>
                      </Link>

                    </div>

                  </div>
                )}

              </div>
            )}


          {!loading && (
            <Link
              to={
                isStudent
                  ? "/student/dashboard"
                  : "/student/login"
              }
              className="student-login-nav"
              onClick={closeMenu}
            >

              <span className="student-login-nav-icon">
                {isStudent
                  ? "⌂"
                  : "♙"}
              </span>


              <span>
                {isStudent
                  ? "My Dashboard"
                  : "Student Login"}
              </span>

            </Link>
          )}


          <Link
            to="/events"
            className="site-nav-cta"
            onClick={closeMenu}
          >
            Browse Events

            <span>
              →
            </span>
          </Link>

        </nav>


        <button
          type="button"
          className={
            `site-menu-button ${
              open
                ? "active"
                : ""
            }`
          }
          onClick={() =>
            setOpen(
              (value) =>
                !value
            )
          }
          aria-label="Toggle navigation"
          aria-expanded={
            open
          }
        >
          <span />
          <span />
        </button>

      </div>

    </header>
  );
}


function getNotificationIcon(
  type
) {
  switch (
    type
  ) {
    case "waitlist_promoted":
      return "✓";

    case "registration":
      return "◇";

    case "event_update":
      return "●";

    case "announcement":
      return "!";

    case "event_cancelled":
      return "×";

    default:
      return "◉";
  }
}


function formatNotificationTime(
  value
) {
  if (
    !value
  ) {
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
    Math.max(
      0,
      Math.floor(
        difference /
        60000
      )
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


  return date.toLocaleDateString(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",
    }
  );
}


export default Navbar;