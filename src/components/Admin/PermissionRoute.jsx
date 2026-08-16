import { Navigate } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import { canUser } from "../../utils/permissions";

function PermissionRoute({
  roles = [],
  permission = null,
  children,
}) {
  const {
    role,
    profile,
    isCMSUser,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div className="admin-auth-loading">
        <div className="admin-auth-loading-mark">
          <span />
          <span />
        </div>

        <div className="loading-spinner" />

        <strong>
          Checking permissions...
        </strong>
      </div>
    );
  }

  if (!isCMSUser) {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    );
  }

  if (!profile?.is_active) {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    );
  }

  const overrides =
    profile?.permission_overrides ||
    {};

  const hasRoleAccess =
    roles.length === 0 ||
    roles.includes(role);

  const hasPermissionAccess =
    !permission ||
    canUser(
      role,
      permission,
      overrides
    );

  if (
    !hasRoleAccess ||
    !hasPermissionAccess
  ) {
    const fallbackRoute =
      role === "event_staff" &&
      canUser(
        role,
        "checkInAttendees",
        overrides
      )
        ? "/admin/check-in"
        : "/admin";

    return (
      <Navigate
        to={fallbackRoute}
        replace
      />
    );
  }

  return children;
}

export default PermissionRoute;