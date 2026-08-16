import {
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";

import ProtectedRoute from "./components/Admin/ProtectedRoute";
import PermissionRoute from "./components/Admin/PermissionRoute";
import StudentProtectedRoute from "./components/auth/StudentProtectedRoute";

import Home from "./pages/Home";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import Calendar from "./pages/Calendar";
import Announcements from "./pages/Announcements";
import Register from "./pages/Register";

import StudentLogin from "./pages/StudentLogin";
import StudentSignup from "./pages/StudentSignup";
import StudentDashboard from "./pages/StudentDashboard";
import StudentRegistrations from "./pages/StudentRegistrations";
import StudentTickets from "./pages/StudentTickets";

import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import AdminEvents from "./pages/AdminEvents";
import ApprovalQueue from "./pages/ApprovalQueue";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import AdminRegistrations from "./pages/AdminRegistrations";
import AdminUpdates from "./pages/AdminUpdates";
import AdminUsers from "./pages/AdminUsers";
import AdminCheckIn from "./pages/AdminCheckIn";
import AdminLogs from "./pages/AdminLogs";
import AdminMedia from "./pages/AdminMedia";
import AdminSocieties from "./pages/AdminSocieties";

import NotFound from "./pages/NotFound";

import "./App.css";

const CMS_ROLES = [
  "principal",
  "vice_principal",
  "teacher",
  "student_admin",
  "event_staff",
];

function App() {
  const location = useLocation();

  const isAdminRoute =
    location.pathname.startsWith("/admin");

  const isStudentAuthRoute =
    location.pathname === "/student/login" ||
    location.pathname === "/student/signup";

  const hidePublicLayout =
    isAdminRoute ||
    isStudentAuthRoute;

  return (
    <div className="app-shell">
      {!hidePublicLayout && (
        <Navbar />
      )}

      <div className="app-content">
        <Routes>
          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/events"
            element={<Events />}
          />

          <Route
            path="/events/:id"
            element={<EventDetails />}
          />

          <Route
            path="/calendar"
            element={<Calendar />}
          />

          <Route
            path="/announcements"
            element={<Announcements />}
          />

          <Route
            path="/register/:id"
            element={<Register />}
          />

          <Route
            path="/student/login"
            element={<StudentLogin />}
          />

          <Route
            path="/student/signup"
            element={<StudentSignup />}
          />

          <Route
            path="/student/dashboard"
            element={
              <StudentProtectedRoute>
                <StudentDashboard />
              </StudentProtectedRoute>
            }
          />

          <Route
            path="/student/registrations"
            element={
              <StudentProtectedRoute>
                <StudentRegistrations />
              </StudentProtectedRoute>
            }
          />

          <Route
            path="/student/tickets"
            element={
              <StudentProtectedRoute>
                <StudentTickets />
              </StudentProtectedRoute>
            }
          />

          <Route
            path="/admin/login"
            element={<AdminLogin />}
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <PermissionRoute
                  roles={[
                    "principal",
                    "vice_principal",
                    "teacher",
                    "student_admin",
                  ]}
                >
                  <Admin />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/events"
            element={
              <ProtectedRoute>
                <PermissionRoute
                  roles={CMS_ROLES}
                  permission="manageEvents"
                >
                  <AdminEvents />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/check-in"
            element={
              <ProtectedRoute>
                <PermissionRoute
                  roles={CMS_ROLES}
                  permission="checkInAttendees"
                >
                  <AdminCheckIn />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/approvals"
            element={
              <ProtectedRoute>
                <PermissionRoute
                  roles={CMS_ROLES}
                  permission="approveEvents"
                >
                  <ApprovalQueue />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/announcements"
            element={
              <ProtectedRoute>
                <PermissionRoute
                  roles={CMS_ROLES}
                  permission="manageAnnouncements"
                >
                  <AdminAnnouncements />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/media"
            element={
              <ProtectedRoute>
                <PermissionRoute
                  roles={CMS_ROLES}
                  permission="manageMedia"
                >
                  <AdminMedia />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/registrations"
            element={
              <ProtectedRoute>
                <PermissionRoute
                  roles={CMS_ROLES}
                  permission="manageRegistrations"
                >
                  <AdminRegistrations />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/updates"
            element={
              <ProtectedRoute>
                <PermissionRoute
                  roles={CMS_ROLES}
                  permission="manageLiveUpdates"
                >
                  <AdminUpdates />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/societies"
            element={
              <ProtectedRoute>
                <PermissionRoute
                  roles={CMS_ROLES}
                  permission="manageSocieties"
                >
                  <AdminSocieties />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <PermissionRoute
                  roles={["principal"]}
                  permission="manageUsers"
                >
                  <AdminUsers />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute>
                <PermissionRoute
                  roles={CMS_ROLES}
                  permission="viewLogs"
                >
                  <AdminLogs />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={<NotFound />}
          />
        </Routes>
      </div>

      {!hidePublicLayout && (
        <Footer />
      )}
    </div>
  );
}

export default App;