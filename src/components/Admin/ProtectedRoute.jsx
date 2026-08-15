import { Navigate } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";


function ProtectedRoute({ children }) {
  const {
    user,
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
          EventHub Administration
        </strong>

        <span>
          Checking your session...
        </span>
      </div>
    );
  }


  if (!user || !isCMSUser) {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    );
  }


  if (!profile?.is_active) {
    return (
      <div className="admin-auth-loading">
        <div className="admin-auth-loading-mark">
          <span />
          <span />
        </div>

        <strong>
          Account disabled
        </strong>

        <span>
          Contact the system administrator.
        </span>
      </div>
    );
  }


  return children;
}


export default ProtectedRoute;