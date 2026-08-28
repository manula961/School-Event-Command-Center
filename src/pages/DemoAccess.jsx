import { Link } from "react-router-dom";

const cmsAccounts = [
  { role: "Principal", email: "principal@eventhub.demo", password: "EventHub@2026", access: "Full CMS access" },
  { role: "Vice Principal", email: "vp@eventhub.demo", password: "EventHub@2026", access: "Approvals, publishing, analytics" },
  { role: "Teacher-in-Charge", email: "teacher@eventhub.demo", password: "EventHub@2026", access: "Events, registrations, reviews" },
  { role: "Student Admin", email: "studentadmin@eventhub.demo", password: "EventHub@2026", access: "Create and manage event drafts" },
  { role: "Event Staff", email: "eventstaff@eventhub.demo", password: "EventHub@2026", access: "Ticket verification and check-in" },
];

const sitemap = [
  {
    title: "Public Website",
    description: "Open access",
    links: [
      ["Home", "/"],
      ["Events", "/events"],
      ["Calendar", "/calendar"],
      ["Announcements", "/announcements"],
      ["Event Details", "/events/:id"],
      ["Event Registration", "/register/:id"],
    ],
  },
  {
    title: "Student Portal",
    description: "Student authentication",
    links: [
      ["Student Login", "/student/login"],
      ["Student Sign Up", "/student/signup"],
      ["Dashboard", "/student/dashboard"],
      ["Registrations", "/student/registrations"],
      ["Tickets", "/student/tickets"],
    ],
  },
  {
    title: "Administration CMS",
    description: "Role-based CMS",
    links: [
      ["Admin Login", "/admin/login"],
      ["Dashboard", "/admin"],
      ["Events", "/admin/events"],
      ["Approvals", "/admin/approvals"],
      ["Announcements", "/admin/announcements"],
      ["Registrations", "/admin/registrations"],
      ["Media", "/admin/media"],
      ["Live Updates", "/admin/updates"],
      ["Societies", "/admin/societies"],
      ["Users", "/admin/users"],
      ["Activity Logs", "/admin/logs"],
      ["Event Check-in", "/admin/check-in"],
    ],
  },
];

function DemoAccess() {
  return (
    <main className="demo-access-page">
      <section className="demo-access-hero">
        <div className="container demo-access-hero-grid">
          <div>
            <span className="demo-access-kicker">EventHub Project Access</span>
            <h1>Explore the complete <span>EventHub</span> experience.</h1>
            <p>
              Use this page as the central access point for the public website,
              student portal and role-based administration CMS.
            </p>
            <div className="demo-access-actions">
              <Link className="btn btn-primary" to="/admin/login">Open Admin CMS →</Link>
              <Link className="btn btn-outline" to="/">View Public Site</Link>
            </div>
          </div>

          <div className="demo-access-hero-card">
            <span>Recommended CMS account</span>
            <h2>Principal</h2>
            <small>Email</small>
            <strong>principal@eventhub.demo</strong>
            <small>Password</small>
            <strong>EventHub@2026</strong>
            <Link to="/admin/login">Continue to Admin Login →</Link>
          </div>
        </div>
      </section>

      <section className="demo-access-section">
        <div className="container">
          <div className="demo-access-heading">
            <span>Administration CMS</span>
            <h2>How to access the admin panel</h2>
            <p>
              Open <code>/admin/login</code>, choose one of the CMS accounts below,
              enter its email and password, and sign in. The available tools change
              automatically according to the selected role.
            </p>
          </div>

          <div className="demo-access-steps">
            <article><span>01</span><h3>Open Admin Login</h3><p>Go to <code>/admin/login</code>.</p></article>
            <article><span>02</span><h3>Choose a CMS role</h3><p>Use Principal for the broadest administration view.</p></article>
            <article><span>03</span><h3>Sign in</h3><p>Enter the matching demo email and password.</p></article>
          </div>
        </div>
      </section>

      <section className="demo-access-section demo-access-soft">
        <div className="container">
          <div className="demo-access-heading">
            <span>CMS Accounts</span>
            <h2>Demo credentials</h2>
            <p>Each account demonstrates a different level of role-based access.</p>
          </div>

          <div className="demo-account-grid">
            {cmsAccounts.map((account) => (
              <article className="demo-account-card" key={account.role}>
                <span className="demo-account-access">{account.access}</span>
                <h3>{account.role}</h3>
                <small>Email</small>
                <strong>{account.email}</strong>
                <small>Password</small>
                <strong>{account.password}</strong>
              </article>
            ))}
          </div>

          <div className="demo-student-card">
            <div>
              <span>Student Portal</span>
              <h3>Demo Student Account</h3>
              <p>Use this account for the student dashboard, registrations and tickets.</p>
            </div>
            <div>
              <strong>student@eventhub.demo</strong>
              <strong>EventHub@2026</strong>
              <Link to="/student/login">Student Login →</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="demo-access-section">
        <div className="container">
          <div className="demo-access-heading">
            <span>Navigation</span>
            <h2>Site map</h2>
            <p>Explore the main areas of EventHub from one place.</p>
          </div>

          <div className="demo-sitemap-grid">
            {sitemap.map((group) => (
              <article className="demo-sitemap-card" key={group.title}>
                <div className="demo-sitemap-header">
                  <h3>{group.title}</h3>
                  <span>{group.description}</span>
                </div>
                <div>
                  {group.links.map(([label, path]) =>
                    path.includes(":") ? (
                      <div className="demo-sitemap-link" key={path}>
                        <div><strong>{label}</strong><small>{path}</small></div>
                        <span>Dynamic</span>
                      </div>
                    ) : (
                      <Link className="demo-sitemap-link" to={path} key={path}>
                        <div><strong>{label}</strong><small>{path}</small></div>
                        <span>→</span>
                      </Link>
                    )
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default DemoAccess;
