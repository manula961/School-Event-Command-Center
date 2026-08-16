import { useEffect, useMemo, useState } from "react";

import { supabase } from "../services/supabase";
import { logActivity } from "../utils/activityLogger";

import AdminLayout from "../components/layout/AdminLayout";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  role: "student_admin",
  societyId: "",
  title: "",
  permissionOverrides: {},
};

const ROLE_LABELS = {
  principal: "Principal",
  vice_principal: "Vice Principal",
  teacher: "Teacher-in-Charge",
  student_admin: "Student Admin",
  event_staff: "Event Staff",
};

const PERMISSION_LABELS = {
  manageEvents: "Manage events",
  publishEvents: "Publish events",
  approveEvents: "Approve events",
  manageAnnouncements: "Manage announcements",
  manageRegistrations: "Manage registrations",
  manageMedia: "Manage media",
  manageLiveUpdates: "Manage live updates",
  viewAnalytics: "View analytics",
  checkInAttendees: "Event check-in",
  manageUsers: "Manage users & roles",
  viewLogs: "View activity logs",
};

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [societies, setSocieties] = useState([]);

  const [formData, setFormData] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showCreatePanel, setShowCreatePanel] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState(emptyForm);
  const [userUpdating, setUserUpdating] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);

  const [showSocietyPanel, setShowSocietyPanel] = useState(false);

  const [societyName, setSocietyName] = useState("");
  const [societyCode, setSocietyCode] = useState("");
  const [societyDescription, setSocietyDescription] = useState("");
  const [societySaving, setSocietySaving] = useState(false);

  const [editingSociety, setEditingSociety] = useState(null);
  const [editSocietyName, setEditSocietyName] = useState("");
  const [editSocietyCode, setEditSocietyCode] = useState("");
  const [editSocietyDescription, setEditSocietyDescription] = useState("");
  const [societyUpdating, setSocietyUpdating] = useState(false);
  const [deletingSocietyId, setDeletingSocietyId] = useState(null);

  const [assigningTeacherId, setAssigningTeacherId] = useState(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        role,
        title,
        permission_overrides,
        society_id,
        is_active,
        created_at,
        societies (
          id,
          name,
          code
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      setError("Could not load CMS users.");
      setUsers([]);
      return;
    }

    setUsers(data || []);
  }

  async function fetchSocieties() {
    const { data, error } = await supabase
      .from("societies")
      .select(`
        id,
        name,
        code,
        description,
        created_at
      `)
      .order("name", {
        ascending: true,
      });

    if (error) {
      console.error(error);
      setError("Could not load societies.");
      setSocieties([]);
      return;
    }

    setSocieties(data || []);
  }

  async function loadPage() {
    setLoading(true);
    setError("");

    await Promise.all([
      fetchUsers(),
      fetchSocieties(),
    ]);

    setLoading(false);
  }

  useEffect(() => {
    loadPage();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === "role" &&
      (
        value === "vice_principal" ||
        value === "principal" ||
        value === "event_staff"
      )
        ? {
            societyId: "",
          }
        : {}),
    }));
  }

  function handleEditUserChange(event) {
    const { name, value } = event.target;

    setEditUserForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "role" &&
      (
        value === "vice_principal" ||
        value === "principal" ||
        value === "event_staff"
      )
        ? {
            societyId: "",
          }
        : {}),
    }));
  }

  function updatePermissionOverride(
    setter,
    permission,
    value
  ) {
    setter((current) => {
      const nextOverrides = {
        ...(current.permissionOverrides || {}),
      };

      if (value === "default") {
        delete nextOverrides[permission];
      } else {
        nextOverrides[permission] =
          value === "allow";
      }

      return {
        ...current,
        permissionOverrides: nextOverrides,
      };
    });
  }

  function resetPermissionOverrides(
    setter
  ) {
    setter((current) => ({
      ...current,
      permissionOverrides: {},
    }));
  }

  function openCreatePanel() {
    setError("");
    setSuccess("");
    setFormData({
      ...emptyForm,
      permissionOverrides: {},
    });
    setShowCreatePanel(true);
  }

  function closeCreatePanel() {
    if (saving) return;

    setShowCreatePanel(false);
    setFormData({
      ...emptyForm,
      permissionOverrides: {},
    });
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const requiresSociety =
      formData.role === "teacher" ||
      formData.role === "student_admin";

    if (
      requiresSociety &&
      !formData.societyId
    ) {
      setError(
        "Select a society for this account."
      );
      setSaving(false);
      return;
    }

    if (
      formData.password.length <
      8
    ) {
      setError(
        "Temporary password must contain at least 8 characters."
      );
      setSaving(false);
      return;
    }

    const {
      data,
      error,
    } = await supabase.functions.invoke(
      "create-cms-user",
      {
        body: {
          fullName:
            formData.fullName.trim(),

          email:
            formData.email
              .trim()
              .toLowerCase(),

          password:
            formData.password,

          role:
            formData.role,

          title:
            formData.title.trim() ||
            null,

          permissionOverrides:
            formData.permissionOverrides ||
            {},

          societyId:
            requiresSociety
              ? formData.societyId
              : null,
        },
      }
    );

    if (error) {
      console.error(error);

      setError(
        error.message ||
          "Could not create CMS account."
      );

      setSaving(false);
      return;
    }

    if (data?.error) {
      setError(data.error);
      setSaving(false);
      return;
    }

    const name =
      formData.fullName.trim();

    setSuccess(
      `${name} was added to EventHub.`
    );

    setFormData({
      ...emptyForm,
      permissionOverrides: {},
    });

    setShowCreatePanel(false);
    setSaving(false);

    await fetchUsers();
  }

  function openEditUser(user) {
    setError("");
    setSuccess("");

    setEditingUser(user);

    setEditUserForm({
      fullName:
        user.full_name ||
        "",

      email:
        user.email ||
        "",

      password:
        "",

      role:
        user.role,

      societyId:
        user.society_id ||
        "",

      title:
        user.title ||
        "",

      permissionOverrides:
        user.permission_overrides ||
        {},
    });
  }

  function closeEditUser() {
    if (userUpdating) return;

    setEditingUser(null);

    setEditUserForm({
      ...emptyForm,
      permissionOverrides: {},
    });
  }

  async function handleUpdateUser(event) {
    event.preventDefault();

    if (!editingUser) return;

    const requiresSociety =
      editUserForm.role === "teacher" ||
      editUserForm.role === "student_admin";

    if (
      requiresSociety &&
      !editUserForm.societyId
    ) {
      setError(
        "Select a society for this account."
      );
      return;
    }

    if (
      editUserForm.password &&
      editUserForm.password.length <
        8
    ) {
      setError(
        "New password must contain at least 8 characters."
      );
      return;
    }

    setUserUpdating(true);
    setError("");
    setSuccess("");

    const {
      data,
      error,
    } = await supabase.functions.invoke(
      "update-cms-user",
      {
        body: {
          userId:
            editingUser.id,

          fullName:
            editUserForm.fullName.trim(),

          email:
            editUserForm.email
              .trim()
              .toLowerCase(),

          password:
            editUserForm.password ||
            null,

          role:
            editUserForm.role,

          title:
            editUserForm.title.trim() ||
            null,

          permissionOverrides:
            editUserForm.permissionOverrides ||
            {},

          societyId:
            requiresSociety
              ? editUserForm.societyId
              : null,

          isActive:
            editingUser.is_active,
        },
      }
    );

    if (error) {
      console.error(error);

      setError(
        error.message ||
          "Could not update CMS user."
      );

      setUserUpdating(false);
      return;
    }

    if (data?.error) {
      setError(data.error);
      setUserUpdating(false);
      return;
    }

    setSuccess(
      `${editUserForm.fullName.trim()} was updated successfully.`
    );

    setEditingUser(null);

    setEditUserForm({
      ...emptyForm,
      permissionOverrides: {},
    });

    setUserUpdating(false);

    await fetchUsers();
  }

  async function deleteUser(user) {
    setError("");
    setSuccess("");

    if (
      user.role ===
      "principal"
    ) {
      setError(
        "The Principal account cannot be deleted."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Permanently delete ${
          user.full_name ||
          user.email ||
          "this user"
        }?

This will remove the CMS account and cannot be undone.`
      );

    if (!confirmed) return;

    setDeletingUserId(
      user.id
    );

    const {
      data,
      error,
    } = await supabase.functions.invoke(
      "delete-cms-user",
      {
        body: {
          userId:
            user.id,
        },
      }
    );

    if (error) {
      console.error(
        "Delete user error:",
        error
      );

      setError(
        error.message ||
          "Could not delete CMS user."
      );

      setDeletingUserId(null);
      return;
    }

    if (data?.error) {
      setError(data.error);
      setDeletingUserId(null);
      return;
    }

    setSuccess(
      data?.message ||
        `${
          user.full_name ||
          user.email ||
          "User"
        } was deleted successfully.`
    );

    if (
      editingUser?.id ===
      user.id
    ) {
      setEditingUser(null);

      setEditUserForm({
        ...emptyForm,
        permissionOverrides: {},
      });
    }

    setDeletingUserId(null);

    await fetchUsers();
  }

  function openSocietyPanel() {
    setError("");
    setSuccess("");

    setSocietyName("");
    setSocietyCode("");
    setSocietyDescription("");

    setShowSocietyPanel(true);
  }

  function closeSocietyPanel() {
    if (societySaving) return;

    setShowSocietyPanel(false);

    setSocietyName("");
    setSocietyCode("");
    setSocietyDescription("");
  }

  async function handleCreateSociety(event) {
    event.preventDefault();

    const name =
      societyName.trim();

    const code =
      societyCode
        .trim()
        .toUpperCase();

    if (
      !name ||
      !code
    ) {
      setError(
        "Society name and code are required."
      );
      return;
    }

    if (
      !/^[A-Z0-9]{2,6}$/.test(
        code
      )
    ) {
      setError(
        "Society code must contain 2–6 letters or numbers."
      );
      return;
    }

    setSocietySaving(true);
    setError("");
    setSuccess("");

    const {
      data,
      error,
    } = await supabase
      .from("societies")
      .insert({
        name,
        code,

        description:
          societyDescription.trim() ||
          null,
      })
      .select("id, name, code")
      .single();

    if (error) {
      console.error(error);

      if (
        error.code ===
        "23505"
      ) {
        setError(
          `The society code "${code}" is already being used.`
        );
      } else {
        setError(
          "Could not create society."
        );
      }

      setSocietySaving(false);
      return;
    }

    await logActivity({
      action:
        "created_society",

      entityType:
        "society",

      entityId:
        data?.id ||
        null,

      details: {
        name,
        code,
      },
    });

    setSuccess(
      `${name} (${code}) was created successfully.`
    );

    setShowSocietyPanel(false);
    setSocietySaving(false);

    setSocietyName("");
    setSocietyCode("");
    setSocietyDescription("");

    await fetchSocieties();
  }

  function openEditSociety(
    society
  ) {
    setError("");
    setSuccess("");

    setEditingSociety(
      society
    );

    setEditSocietyName(
      society.name ||
      ""
    );

    setEditSocietyCode(
      society.code ||
      ""
    );

    setEditSocietyDescription(
      society.description ||
      ""
    );
  }

  function closeEditSociety() {
    if (societyUpdating) return;

    setEditingSociety(null);
  }

  async function handleUpdateSociety(
    event
  ) {
    event.preventDefault();

    if (!editingSociety) return;

    const name =
      editSocietyName.trim();

    const code =
      editSocietyCode
        .trim()
        .toUpperCase();

    if (
      !name ||
      !code
    ) {
      setError(
        "Society name and code are required."
      );
      return;
    }

    if (
      !/^[A-Z0-9]{2,6}$/.test(
        code
      )
    ) {
      setError(
        "Society code must contain 2–6 letters or numbers."
      );
      return;
    }

    setSocietyUpdating(true);
    setError("");
    setSuccess("");

    const {
      error,
    } = await supabase
      .from("societies")
      .update({
        name,
        code,

        description:
          editSocietyDescription.trim() ||
          null,
      })
      .eq(
        "id",
        editingSociety.id
      );

    if (error) {
      console.error(error);

      if (
        error.code ===
        "23505"
      ) {
        setError(
          `The society code "${code}" is already in use.`
        );
      } else {
        setError(
          "Could not update society."
        );
      }

      setSocietyUpdating(false);
      return;
    }

    await logActivity({
      action:
        "updated_society",

      entityType:
        "society",

      entityId:
        editingSociety.id,

      details: {
        old_name:
          editingSociety.name,

        old_code:
          editingSociety.code,

        name,
        code,
      },
    });

    setSuccess(
      `${name} (${code}) was updated successfully.`
    );

    setEditingSociety(null);
    setSocietyUpdating(false);

    await Promise.all([
      fetchSocieties(),
      fetchUsers(),
    ]);
  }

  async function deleteSociety(
    society
  ) {
    setError("");
    setSuccess("");

    const assignedUsers =
      users.filter(
        (user) =>
          user.society_id ===
          society.id
      );

    if (
      assignedUsers.length >
      0
    ) {
      setError(
        `Cannot delete ${society.name}. ` +
          `${assignedUsers.length} CMS user${
            assignedUsers.length === 1
              ? " is"
              : "s are"
          } still assigned to this society.`
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Permanently delete ${society.name} (${society.code})?

This action cannot be undone.`
      );

    if (!confirmed) return;

    setDeletingSocietyId(
      society.id
    );

    const {
      count:
        eventCount,
      error:
        eventCheckError,
    } = await supabase
      .from("events")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "society_id",
        society.id
      );

    if (eventCheckError) {
      console.error(
        eventCheckError
      );

      setError(
        "Could not check society dependencies."
      );

      setDeletingSocietyId(null);
      return;
    }

    if (
      (eventCount || 0) >
      0
    ) {
      setError(
        `Cannot delete ${society.name}. ` +
          `${eventCount} event${
            eventCount === 1
              ? ""
              : "s"
          } still reference this society.`
      );

      setDeletingSocietyId(null);
      return;
    }

    const {
      error,
    } = await supabase
      .from("societies")
      .delete()
      .eq(
        "id",
        society.id
      );

    if (error) {
      console.error(error);

      setError(
        "Could not delete society. It may still be referenced by other records."
      );

      setDeletingSocietyId(null);
      return;
    }

    await logActivity({
      action:
        "deleted_society",

      entityType:
        "society",

      entityId:
        society.id,

      details: {
        name:
          society.name,

        code:
          society.code,

        description:
          society.description ||
          null,
      },
    });

    if (
      editingSociety?.id ===
      society.id
    ) {
      setEditingSociety(null);
    }

    setSuccess(
      `${society.name} (${society.code}) was deleted successfully.`
    );

    setDeletingSocietyId(null);

    await Promise.all([
      fetchSocieties(),
      fetchUsers(),
    ]);
  }

  async function toggleUserStatus(
    user
  ) {
    setError("");
    setSuccess("");

    if (
      user.role ===
      "principal"
    ) {
      setError(
        "The Principal account cannot be disabled."
      );
      return;
    }

    const {
      error,
    } = await supabase
      .from("profiles")
      .update({
        is_active:
          !user.is_active,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        user.id
      );

    if (error) {
      console.error(error);

      setError(
        "Could not update account status."
      );
      return;
    }

    await logActivity({
      action:
        user.is_active
          ? "disabled_user"
          : "activated_user",

      entityType:
        "user",

      entityId:
        user.id,

      details: {
        full_name:
          user.full_name,

        email:
          user.email,

        role:
          user.role,
      },
    });

    setSuccess(
      user.is_active
        ? `${
            user.full_name ||
            "User"
          } was disabled.`
        : `${
            user.full_name ||
            "User"
          } was activated.`
    );

    await fetchUsers();
  }

  function getTeachers() {
    return users.filter(
      (user) =>
        user.role ===
          "teacher" &&
        user.is_active
    );
  }

  async function assignTeacherToSociety(
    teacherId,
    societyId
  ) {
    if (!teacherId) return;

    const teacher =
      users.find(
        (user) =>
          user.id ===
          teacherId
      );

    const society =
      societies.find(
        (item) =>
          item.id ===
          societyId
      );

    if (
      !teacher ||
      !society
    ) {
      return;
    }

    setAssigningTeacherId(
      teacherId
    );

    setError("");
    setSuccess("");

    const {
      error,
    } = await supabase
      .from("profiles")
      .update({
        society_id:
          societyId,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        teacherId
      )
      .eq(
        "role",
        "teacher"
      );

    if (error) {
      console.error(error);

      setError(
        "Could not assign Teacher-in-Charge."
      );

      setAssigningTeacherId(null);
      return;
    }

    await logActivity({
      action:
        "assigned_teacher",

      entityType:
        "society",

      entityId:
        societyId,

      details: {
        teacher_id:
          teacher.id,

        teacher_name:
          teacher.full_name,

        society_name:
          society.name,

        society_code:
          society.code,
      },
    });

    setSuccess(
      `${
        teacher.full_name ||
        "Teacher"
      } was assigned to ${society.name}.`
    );

    setAssigningTeacherId(null);

    await fetchUsers();
  }

  const filteredUsers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return users.filter(
        (user) => {
          const text = [
            user.full_name,
            user.email,
            user.title,
            ROLE_LABELS[user.role],
            user.societies?.name,
            user.societies?.code,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !query ||
            text.includes(
              query
            );

          const matchesRole =
            roleFilter ===
              "all" ||
            user.role ===
              roleFilter;

          return (
            matchesSearch &&
            matchesRole
          );
        }
      );
    }, [
      users,
      search,
      roleFilter,
    ]);

  const teacherCount =
    users.filter(
      (user) =>
        user.role ===
        "teacher"
    ).length;

  const studentAdminCount =
    users.filter(
      (user) =>
        user.role ===
        "student_admin"
    ).length;

  const eventStaffCount =
    users.filter(
      (user) =>
        user.role ===
        "event_staff"
    ).length;

  const activeCount =
    users.filter(
      (user) =>
        user.is_active
    ).length;

  return (
    <AdminLayout>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            Administration
          </span>

          <h1>
            Users & Roles
          </h1>

          <p>
            Manage CMS users, societies,
            titles and individual task
            permissions.
          </p>
        </div>

        <div className="admin-page-heading-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={
              openSocietyPanel
            }
          >
            + Create Society
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={
              openCreatePanel
            }
          >
            + Create CMS User
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-inline-error">
          <span>
            !
          </span>

          <p>
            {error}
          </p>
        </div>
      )}

      {success && (
        <div className="admin-inline-success">
          <span>
            ✓
          </span>

          <p>
            {success}
          </p>
        </div>
      )}

      <section className="admin-user-stats">
        <div>
          <span>
            Total users
          </span>

          <strong>
            {users.length}
          </strong>
        </div>

        <div>
          <span>
            Active
          </span>

          <strong>
            {activeCount}
          </strong>
        </div>

        <div>
          <span>
            Teachers
          </span>

          <strong>
            {teacherCount}
          </strong>
        </div>

        <div>
          <span>
            Student admins
          </span>

          <strong>
            {studentAdminCount}
          </strong>
        </div>

        <div>
          <span>
            Event staff
          </span>

          <strong>
            {eventStaffCount}
          </strong>
        </div>
      </section>

      <section className="admin-society-management">
        <div className="admin-society-management-header">
          <span className="admin-eyebrow">
            Society Administration
          </span>

          <h2>
            Teacher-in-Charge Assignments
          </h2>
        </div>

        {societies.map(
          (society) => {
            const teacher =
              users.find(
                (user) =>
                  user.role ===
                    "teacher" &&
                  user.society_id ===
                    society.id
              );

            const deleting =
              deletingSocietyId ===
              society.id;

            return (
              <article
                key={
                  society.id
                }
                className="admin-society-row"
              >
                <div className="admin-society-info">
                  <span className="admin-society-mark">
                    {
                      society.code
                    }
                  </span>

                  <div>
                    <h3>
                      {
                        society.name
                      }

                      <span className="admin-society-code">
                        {
                          society.code
                        }
                      </span>
                    </h3>

                    <p>
                      {teacher
                        ? `Teacher-in-Charge: ${teacher.full_name}`
                        : "No Teacher-in-Charge assigned"}
                    </p>
                  </div>
                </div>

                <div className="admin-society-assignment admin-society-actions">
                  <select
                    value={
                      teacher?.id ||
                      ""
                    }
                    disabled={
                      assigningTeacherId !==
                        null ||
                      deleting
                    }
                    onChange={(
                      event
                    ) =>
                      assignTeacherToSociety(
                        event.target
                          .value,
                        society.id
                      )
                    }
                  >
                    <option value="">
                      Select Teacher
                    </option>

                    {getTeachers().map(
                      (item) => (
                        <option
                          key={
                            item.id
                          }
                          value={
                            item.id
                          }
                        >
                          {item.full_name ||
                            item.email}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="button"
                    className="admin-action-button"
                    disabled={
                      deleting
                    }
                    onClick={() =>
                      openEditSociety(
                        society
                      )
                    }
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="admin-action-button danger"
                    disabled={
                      deleting
                    }
                    onClick={() =>
                      deleteSociety(
                        society
                      )
                    }
                  >
                    {deleting
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </article>
            );
          }
        )}
      </section>

      <section className="admin-users-panel">
        <div className="admin-users-toolbar">
          <div className="admin-events-search">
            <span>
              ⌕
            </span>

            <input
              type="search"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Search users..."
            />
          </div>

          <select
            value={
              roleFilter
            }
            onChange={(
              event
            ) =>
              setRoleFilter(
                event.target
                  .value
              )
            }
          >
            <option value="all">
              All roles
            </option>

            <option value="principal">
              Principal
            </option>

            <option value="vice_principal">
              Vice Principal
            </option>

            <option value="teacher">
              Teacher-in-Charge
            </option>

            <option value="student_admin">
              Student Admin
            </option>

            <option value="event_staff">
              Event Staff
            </option>
          </select>
        </div>

        {loading ? (
          <LoadingState
            label="Loading users..."
          />
        ) : filteredUsers.length ===
          0 ? (
          <EmptyState
            title="No users found"
            description="No users match the current filters."
          />
        ) : (
          <div className="admin-users-list">
            {filteredUsers.map(
              (user) => {
                const deleting =
                  deletingUserId ===
                  user.id;

                const overrideCount =
                  Object.keys(
                    user.permission_overrides ||
                      {}
                  ).length;

                return (
                  <article
                    key={
                      user.id
                    }
                    className="admin-user-row"
                  >
                    <div className="admin-user-avatar">
                      {getInitials(
                        user.full_name
                      )}
                    </div>

                    <div className="admin-user-main">
                      <div className="admin-user-heading">
                        <h3>
                          {
                            user.full_name
                          }
                        </h3>

                        <span
                          className={
                            user.is_active
                              ? "admin-user-status active"
                              : "admin-user-status disabled"
                          }
                        >
                          {user.is_active
                            ? "Active"
                            : "Disabled"}
                        </span>
                      </div>

                      <div className="admin-user-role">
                        <strong>
                          {ROLE_LABELS[
                            user.role
                          ] ||
                            user.role}
                        </strong>

                        {user.title && (
                          <span>
                            {
                              user.title
                            }
                          </span>
                        )}
                      </div>

                      <div className="admin-user-meta">
                        <span>
                          {
                            user.email
                          }
                        </span>

                        {user.societies && (
                          <span>
                            {
                              user
                                .societies
                                .code
                            }

                            {" — "}

                            {
                              user
                                .societies
                                .name
                            }
                          </span>
                        )}

                        {overrideCount >
                          0 && (
                          <span>
                            {overrideCount} custom{" "}
                            {overrideCount ===
                            1
                              ? "permission"
                              : "permissions"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="admin-user-actions">
                      <button
                        type="button"
                        className="admin-action-button"
                        disabled={
                          deleting
                        }
                        onClick={() =>
                          openEditUser(
                            user
                          )
                        }
                      >
                        Edit
                      </button>

                      {user.role !==
                        "principal" && (
                        <>
                          <button
                            type="button"
                            className={
                              user.is_active
                                ? "admin-action-button danger"
                                : "admin-action-button"
                            }
                            disabled={
                              deleting
                            }
                            onClick={() =>
                              toggleUserStatus(
                                user
                              )
                            }
                          >
                            {user.is_active
                              ? "Disable"
                              : "Activate"}
                          </button>

                          <button
                            type="button"
                            className="admin-action-button danger"
                            disabled={
                              deleting
                            }
                            onClick={() =>
                              deleteUser(
                                user
                              )
                            }
                          >
                            {deleting
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {showCreatePanel && (
        <div className="admin-user-modal-backdrop">
          <section className="admin-user-modal">
            <ModalHeader
              eyebrow="Authorized account"
              title="Create CMS User"
              onClose={
                closeCreatePanel
              }
              disabled={
                saving
              }
            />

            <form
              className="admin-event-form"
              onSubmit={
                handleSubmit
              }
            >
              <UserFields
                data={
                  formData
                }
                onChange={
                  handleChange
                }
                societies={
                  societies
                }
                passwordRequired
                onPermissionChange={(
                  permission,
                  value
                ) =>
                  updatePermissionOverride(
                    setFormData,
                    permission,
                    value
                  )
                }
                onPermissionReset={() =>
                  resetPermissionOverrides(
                    setFormData
                  )
                }
              />

              <ModalActions
                saving={
                  saving
                }
                saveText="Create account"
                savingText="Creating..."
                onCancel={
                  closeCreatePanel
                }
              />
            </form>
          </section>
        </div>
      )}

      {editingUser && (
        <div className="admin-user-modal-backdrop">
          <section className="admin-user-modal">
            <ModalHeader
              eyebrow="Account administration"
              title="Edit CMS User"
              onClose={
                closeEditUser
              }
              disabled={
                userUpdating
              }
            />

            <form
              className="admin-event-form"
              onSubmit={
                handleUpdateUser
              }
            >
              <UserFields
                data={
                  editUserForm
                }
                onChange={
                  handleEditUserChange
                }
                societies={
                  societies
                }
                passwordRequired={
                  false
                }
                onPermissionChange={(
                  permission,
                  value
                ) =>
                  updatePermissionOverride(
                    setEditUserForm,
                    permission,
                    value
                  )
                }
                onPermissionReset={() =>
                  resetPermissionOverrides(
                    setEditUserForm
                  )
                }
              />

              <ModalActions
                saving={
                  userUpdating
                }
                saveText="Save changes"
                savingText="Saving..."
                onCancel={
                  closeEditUser
                }
              />
            </form>
          </section>
        </div>
      )}

      {showSocietyPanel && (
        <SocietyModal
          title="Create Society"
          eyebrow="School organization"
          name={
            societyName
          }
          code={
            societyCode
          }
          description={
            societyDescription
          }
          setName={
            setSocietyName
          }
          setCode={
            setSocietyCode
          }
          setDescription={
            setSocietyDescription
          }
          saving={
            societySaving
          }
          onSubmit={
            handleCreateSociety
          }
          onClose={
            closeSocietyPanel
          }
          saveText="Create Society"
        />
      )}

      {editingSociety && (
        <SocietyModal
          title="Edit Society"
          eyebrow="Society administration"
          name={
            editSocietyName
          }
          code={
            editSocietyCode
          }
          description={
            editSocietyDescription
          }
          setName={
            setEditSocietyName
          }
          setCode={
            setEditSocietyCode
          }
          setDescription={
            setEditSocietyDescription
          }
          saving={
            societyUpdating
          }
          onSubmit={
            handleUpdateSociety
          }
          onClose={
            closeEditSociety
          }
          saveText="Save changes"
        />
      )}
    </AdminLayout>
  );
}

function UserFields({
  data,
  onChange,
  societies,
  passwordRequired,
  onPermissionChange,
  onPermissionReset,
}) {
  const requiresSociety =
    data.role === "teacher" ||
    data.role === "student_admin";

  return (
    <>
      <div className="admin-field">
        <label>
          Full name
        </label>

        <input
          name="fullName"
          value={
            data.fullName
          }
          onChange={
            onChange
          }
          required
        />
      </div>

      <div className="admin-field">
        <label>
          Email address
        </label>

        <input
          name="email"
          type="email"
          value={
            data.email
          }
          onChange={
            onChange
          }
          required
        />
      </div>

      <div className="admin-field">
        <label>
          Role
        </label>

        <select
          name="role"
          value={
            data.role
          }
          onChange={
            onChange
          }
        >
          <option value="student_admin">
            Student Admin
          </option>

          <option value="teacher">
            Teacher-in-Charge
          </option>

          <option value="event_staff">
            Event Staff
          </option>

          <option value="vice_principal">
            Vice Principal
          </option>

          {data.role ===
            "principal" && (
            <option value="principal">
              Principal
            </option>
          )}
        </select>
      </div>

      <div className="admin-field">
        <label>
          Position / Title
        </label>

        <input
          name="title"
          value={
            data.title ||
            ""
          }
          onChange={
            onChange
          }
          placeholder="e.g. Sports Coordinator"
        />
      </div>

      {requiresSociety && (
        <div className="admin-field">
          <label>
            Society
          </label>

          <select
            name="societyId"
            value={
              data.societyId
            }
            onChange={
              onChange
            }
            required
          >
            <option value="">
              Select society
            </option>

            {societies.map(
              (society) => (
                <option
                  key={
                    society.id
                  }
                  value={
                    society.id
                  }
                >
                  {society.code
                    ? `${society.code} — ${society.name}`
                    : society.name}
                </option>
              )
            )}
          </select>
        </div>
      )}

      {data.role !==
        "principal" && (
        <PermissionEditor
          overrides={
            data.permissionOverrides ||
            {}
          }
          onChange={
            onPermissionChange
          }
          onReset={
            onPermissionReset
          }
        />
      )}

      <div className="admin-field">
        <label>
          {passwordRequired
            ? "Temporary password"
            : "New password"}
        </label>

        <input
          name="password"
          type="password"
          value={
            data.password
          }
          onChange={
            onChange
          }
          minLength="8"
          required={
            passwordRequired
          }
          placeholder={
            passwordRequired
              ? "Minimum 8 characters"
              : "Leave blank to keep current password"
          }
          autoComplete="new-password"
        />
      </div>
    </>
  );
}

function PermissionEditor({
  overrides,
  onChange,
  onReset,
}) {
  const overrideCount =
    Object.keys(
      overrides ||
      {}
    ).length;

  return (
    <section className="admin-permission-editor">
      <div className="admin-permission-editor-header">
        <div>
          <span>
            Individual permissions
          </span>

          <h3>
            Permission overrides
          </h3>

          <p>
            Choose whether each task should
            follow the selected role, be
            explicitly allowed or explicitly
            denied for this account.
          </p>
        </div>

        {overrideCount >
          0 && (
          <button
            type="button"
            className="admin-permission-reset"
            onClick={
              onReset
            }
          >
            Reset all
          </button>
        )}
      </div>

      <div className="admin-permission-summary">
        <span>
          Custom overrides
        </span>

        <strong>
          {overrideCount}
        </strong>
      </div>

      <div className="admin-permission-list">
        {Object.entries(
          PERMISSION_LABELS
        ).map(
          ([
            permission,
            label,
          ]) => {
            const hasOverride =
              Object.prototype
                .hasOwnProperty
                .call(
                  overrides,
                  permission
                );

            const value =
              hasOverride
                ? overrides[
                    permission
                  ]
                  ? "allow"
                  : "deny"
                : "default";

            return (
              <div
                key={
                  permission
                }
                className={
                  `admin-permission-row admin-permission-row--${value}`
                }
              >
                <div className="admin-permission-info">
                  <strong>
                    {label}
                  </strong>

                  <span>
                    {value ===
                    "default"
                      ? "Uses role default"
                      : value ===
                          "allow"
                        ? "Explicitly allowed"
                        : "Explicitly denied"}
                  </span>
                </div>

                <select
                  value={
                    value
                  }
                  onChange={(
                    event
                  ) =>
                    onChange(
                      permission,
                      event.target
                        .value
                    )
                  }
                  aria-label={
                    `${label} permission`
                  }
                >
                  <option value="default">
                    Role default
                  </option>

                  <option value="allow">
                    Allow
                  </option>

                  <option value="deny">
                    Deny
                  </option>
                </select>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}

function SocietyModal({
  title,
  eyebrow,
  name,
  code,
  description,
  setName,
  setCode,
  setDescription,
  saving,
  onSubmit,
  onClose,
  saveText,
}) {
  return (
    <div className="admin-user-modal-backdrop">
      <section className="admin-user-modal">
        <ModalHeader
          eyebrow={
            eyebrow
          }
          title={
            title
          }
          onClose={
            onClose
          }
          disabled={
            saving
          }
        />

        <form
          className="admin-event-form"
          onSubmit={
            onSubmit
          }
        >
          <div className="admin-field">
            <label>
              Society name
            </label>

            <input
              value={
                name
              }
              onChange={(
                event
              ) =>
                setName(
                  event.target
                    .value
                )
              }
              required
            />
          </div>

          <div className="admin-field">
            <label>
              Society code
            </label>

            <input
              value={
                code
              }
              onChange={(
                event
              ) =>
                setCode(
                  cleanSocietyCode(
                    event.target
                      .value
                  )
                )
              }
              minLength="2"
              maxLength="6"
              required
            />
          </div>

          <div className="admin-field">
            <label>
              Description
            </label>

            <textarea
              rows="4"
              value={
                description
              }
              onChange={(
                event
              ) =>
                setDescription(
                  event.target
                    .value
                )
              }
            />
          </div>

          <ModalActions
            saving={
              saving
            }
            saveText={
              saveText
            }
            savingText="Saving..."
            onCancel={
              onClose
            }
          />
        </form>
      </section>
    </div>
  );
}

function ModalHeader({
  eyebrow,
  title,
  onClose,
  disabled,
}) {
  return (
    <div className="admin-editor-header">
      <div>
        <span>
          {eyebrow}
        </span>

        <h2>
          {title}
        </h2>
      </div>

      <button
        type="button"
        className="admin-editor-close"
        onClick={
          onClose
        }
        disabled={
          disabled
        }
        aria-label={
          `Close ${title}`
        }
      >
        ×
      </button>
    </div>
  );
}

function ModalActions({
  saving,
  saveText,
  savingText,
  onCancel,
}) {
  return (
    <div className="admin-form-actions">
      <button
        type="submit"
        className="btn btn-primary"
        disabled={
          saving
        }
      >
        {saving
          ? savingText
          : saveText}

        {!saving && (
          <span>
            →
          </span>
        )}
      </button>

      <button
        type="button"
        className="btn btn-outline"
        onClick={
          onCancel
        }
        disabled={
          saving
        }
      >
        Cancel
      </button>
    </div>
  );
}

function cleanSocietyCode(
  value
) {
  return value
    .toUpperCase()
    .replace(
      /[^A-Z0-9]/g,
      ""
    )
    .slice(
      0,
      6
    );
}

function getInitials(
  name
) {
  if (!name) {
    return "?";
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

export default AdminUsers;