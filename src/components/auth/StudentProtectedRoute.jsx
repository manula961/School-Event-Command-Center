import { Navigate } from "react-router-dom";

import { useStudentAuth } from "../../contexts/StudentAuthContext";

function StudentProtectedRoute({ children }) {
  const {
    student,
    profile,
    loading,
  } = useStudentAuth();

  if (loading) {
    return (
      <div className="student-auth-loading">
        <div className="loading-spinner" />

        <strong>EventHub Student</strong>

        <span>Checking your session...</span>
      </div>
    );
  }

  if (!student || !profile) {
    return (
      <Navigate
        to="/student/login"
        replace
      />
    );
  }

  return children;
}

export default StudentProtectedRoute;