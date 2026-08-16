import {
  NavLink,
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";

import {
  canUser,
  ROLE_LABELS,
} from "../../utils/permissions";

function AdminSidebar() {
  const navigate = useNavigate();

  const {
    profile,
    role,
    signOut,
  } = useAuth();

  async function handleLogout() {
    await signOut();
    navigate("/admin/login");
  }

  const overrides =
    profile?.permission_overrides ||
    {};

  const hasDashboardAccess =
    role !== "event_staff" &&
    [
      "manageEvents",
      "publishEvents",
      "approveEvents",
      "manageAnnouncements",
      "manageRegistrations",
      "manageMedia",
      "manageLiveUpdates",
      "viewAnalytics",
      "manageUsers",
      "viewLogs",
      "checkInAttendees",
    ].some((permission) =>
      canUser(
        role,
        permission,
        overrides
      )
    );

  const links = [
    {
      to: "/admin",
      end: true,
      label: "Dashboard",
      icon: "⌂",
      visible:
        hasDashboardAccess,
    },
    {
      to: "/admin/events",
      label: "Events",
      icon: "◫",
      visible: canUser(
        role,
        "manageEvents",
        overrides
      ),
    },
    {
      to: "/admin/approvals",
      label: "Approval Queue",
      icon: "✓",
      visible: canUser(
        role,
        "approveEvents",
        overrides
      ),
    },
    {
      to: "/admin/announcements",
      label: "Announcements",
      icon: "◉",
      visible: canUser(
        role,
        "manageAnnouncements",
        overrides
      ),
    },
    {
      to: "/admin/media",
      label: "Media & Highlights",
      icon: "◈",
      visible: canUser(
        role,
        "manageMedia",
        overrides
      ),
    },
    {
      to: "/admin/registrations",
      label: "Registrations",
      icon: "◇",
      visible: canUser(
        role,
        "manageRegistrations",
        overrides
      ),
    },
    {
      to: "/admin/check-in",
      label: "Event Check-in",
      icon: "⌁",
      visible: canUser(
        role,
        "checkInAttendees",
        overrides
      ),
    },
    {
      to: "/admin/updates",
      label: "Live Updates",
      icon: "●",
      visible: canUser(
        role,
        "manageLiveUpdates",
        overrides
      ),
    },
    {
      to: "/admin/users",
      label: "Users & Roles",
      icon: "♙",
      visible: canUser(
        role,
        "manageUsers",
        overrides
      ),
    },
    {
      to: "/admin/logs",
      label: "Activity Logs",
      icon: "≡",
      visible: canUser(
        role,
        "viewLogs",
        overrides
      ),
    },
  ];

  const visibleLinks =
    links.filter(
      (item) =>
        item.visible
    );

  return (
    <aside className="admin-sidebar-new">
      <div className="admin-sidebar-top">
        <Link
          to="/"
          className="admin-brand"
        >
          <span className="admin-brand-mark">
            <span />
            <span />
          </span>

          <div>
            <strong>
              EventHub
            </strong>

            <span>
              Administration
            </span>
          </div>
        </Link>

        <div className="admin-sidebar-user">
          <strong>
            {profile?.full_name ||
              "CMS User"}
          </strong>

          <span>
            {profile?.title ||
              ROLE_LABELS[role] ||
              role}
          </span>

          {profile?.societies?.name && (
            <small>
              {profile
                .societies
                .code
                ? `${profile.societies.code} — `
                : ""}

              {
                profile
                  .societies
                  .name
              }
            </small>
          )}
        </div>

        <div className="admin-sidebar-section-label">
          {role === "event_staff"
            ? "Event Operations"
            : "Management"}
        </div>

        <nav className="admin-navigation">
          {visibleLinks.map(
            (item) => (
              <NavLink
                key={
                  item.to
                }
                to={
                  item.to
                }
                end={
                  item.end
                }
                className={({
                  isActive,
                }) =>
                  `admin-navigation-link ${
                    isActive
                      ? "active"
                      : ""
                  }`
                }
              >
                <span
                  className="admin-navigation-icon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>
              </NavLink>
            )
          )}
        </nav>
      </div>

      <div className="admin-sidebar-bottom">
        <Link
          to="/"
          className="admin-public-link"
        >
          <span aria-hidden="true">
            ←
          </span>

          View public site
        </Link>

        <button
          type="button"
          className="admin-logout"
          onClick={
            handleLogout
          }
        >
          <span aria-hidden="true">
            ↗
          </span>

          Log out
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;