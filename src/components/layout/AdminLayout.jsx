import AdminSidebar from "./AdminSidebar";


function AdminLayout({ children }) {
  return (
    <div className="admin-shell">
      <AdminSidebar />

      <div className="admin-main">
        <header className="admin-mobile-header">
          <strong>EventHub Admin</strong>
        </header>

        <div className="admin-main-content">
          {children}
        </div>
      </div>
    </div>
  );
}


export default AdminLayout;