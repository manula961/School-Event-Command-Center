import {
  useEffect,
  useMemo,
  useState,
} from "react";

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
  manageSocieties: "Manage societies",
  viewAnalytics: "View analytics",
  checkInAttendees: "Event check-in",
  viewLogs: "View activity logs",
};

function AdminUsers() {
  const [
    users,
    setUsers,
  ] = useState([]);

  const [
    societies,
    setSocieties,
  ] = useState([]);

  const [
    formData,
    setFormData,
  ] = useState({
    ...emptyForm,
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    showCreatePanel,
    setShowCreatePanel,
  ] = useState(false);

  const [
    editingUser,
    setEditingUser,
  ] = useState(null);

  const [
    editUserForm,
    setEditUserForm,
  ] = useState({
    ...emptyForm,
  });

  const [
    userUpdating,
    setUserUpdating,
  ] = useState(false);

  const [
    deletingUserId,
    setDeletingUserId,
  ] = useState(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    roleFilter,
    setRoleFilter,
  ] = useState("all");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  async function fetchUsers() {
    const {
      data,
      error:
        fetchError,
    } = await supabase
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
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (
      fetchError
    ) {
      console.error(
        "Could not load CMS users:",
        fetchError
      );

      setError(
        "Could not load CMS users."
      );

      setUsers([]);

      return;
    }

    setUsers(
      data || []
    );
  }

  async function fetchSocieties() {
    const {
      data,
      error:
        fetchError,
    } = await supabase
      .from("societies")
      .select(`
        id,
        name,
        code
      `)
      .order(
        "name",
        {
          ascending: true,
        }
      );

    if (
      fetchError
    ) {
      console.error(
        "Could not load societies:",
        fetchError
      );

      setError(
        "Could not load societies."
      );

      setSocieties([]);

      return;
    }

    setSocieties(
      data || []
    );
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

  function handleChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (current) => ({
        ...current,
        [name]:
          value,
        ...(name ===
          "role" &&
        (
          value ===
            "vice_principal" ||
          value ===
            "principal" ||
          value ===
            "event_staff"
        )
          ? {
              societyId:
                "",
            }
          : {}),
      })
    );

    if (
      error
    ) {
      setError("");
    }

    if (
      success
    ) {
      setSuccess("");
    }
  }

  function handleEditUserChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setEditUserForm(
      (current) => ({
        ...current,
        [name]:
          value,
        ...(name ===
          "role" &&
        (
          value ===
            "vice_principal" ||
          value ===
            "principal" ||
          value ===
            "event_staff"
        )
          ? {
              societyId:
                "",
            }
          : {}),
      })
    );

    if (
      error
    ) {
      setError("");
    }

    if (
      success
    ) {
      setSuccess("");
    }
  }

  function updatePermissionOverride(
    setter,
    permission,
    value
  ) {
    setter(
      (current) => {
        const nextOverrides = {
          ...(current.permissionOverrides ||
            {}),
        };

        if (
          value ===
          "default"
        ) {
          delete nextOverrides[
            permission
          ];
        } else {
          nextOverrides[
            permission
          ] =
            value ===
            "allow";
        }

        return {
          ...current,
          permissionOverrides:
            nextOverrides,
        };
      }
    );
  }

  function resetPermissionOverrides(
    setter
  ) {
    setter(
      (current) => ({
        ...current,
        permissionOverrides:
          {},
      })
    );
  }

  function openCreatePanel() {
    setError("");
    setSuccess("");

    setFormData({
      ...emptyForm,
      permissionOverrides:
        {},
    });

    setShowCreatePanel(
      true
    );
  }

  function closeCreatePanel() {
    if (
      saving
    ) {
      return;
    }

    setShowCreatePanel(
      false
    );

    setFormData({
      ...emptyForm,
      permissionOverrides:
        {},
    });

    setError("");
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    const fullName =
      formData.fullName
        .trim();

    const email =
      formData.email
        .trim()
        .toLowerCase();

    const requiresSociety =
      formData.role ===
        "teacher" ||
      formData.role ===
        "student_admin";

    if (
      !fullName ||
      !email
    ) {
      setError(
        "Name and email are required."
      );

      return;
    }

    if (
      requiresSociety &&
      !formData.societyId
    ) {
      setError(
        "Select a society for this account."
      );

      return;
    }

    if (
      formData.password
        .length <
      8
    ) {
      setError(
        "Temporary password must contain at least 8 characters."
      );

      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const {
      data,
      error:
        createError,
    } =
      await supabase
        .functions
        .invoke(
          "create-cms-user",
          {
            body: {
              fullName,
              email,
              password:
                formData.password,
              role:
                formData.role,
              title:
                formData.title
                  .trim() ||
                null,
              permissionOverrides:
                formData
                  .permissionOverrides ||
                {},
              societyId:
                requiresSociety
                  ? formData
                      .societyId
                  : null,
            },
          }
        );

    if (
      createError
    ) {
      console.error(
        "Could not create CMS user:",
        createError
      );

      setError(
        createError.message ||
          "Could not create CMS account."
      );

      setSaving(false);

      return;
    }

    if (
      data?.error
    ) {
      setError(
        data.error
      );

      setSaving(false);

      return;
    }

    setSuccess(
      `${fullName} was added to EventHub.`
    );

    setFormData({
      ...emptyForm,
      permissionOverrides:
        {},
    });

    setShowCreatePanel(
      false
    );

    setSaving(false);

    await fetchUsers();
  }

  function openEditUser(
    user
  ) {
    setError("");
    setSuccess("");

    setEditingUser(
      user
    );

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
    if (
      userUpdating
    ) {
      return;
    }

    setEditingUser(
      null
    );

    setEditUserForm({
      ...emptyForm,
      permissionOverrides:
        {},
    });
  }

  async function handleUpdateUser(
    event
  ) {
    event.preventDefault();

    if (
      !editingUser
    ) {
      return;
    }

    const fullName =
      editUserForm
        .fullName
        .trim();

    const email =
      editUserForm
        .email
        .trim()
        .toLowerCase();

    const requiresSociety =
      editUserForm.role ===
        "teacher" ||
      editUserForm.role ===
        "student_admin";

    if (
      !fullName ||
      !email
    ) {
      setError(
        "Name and email are required."
      );

      return;
    }

    if (
      requiresSociety &&
      !editUserForm
        .societyId
    ) {
      setError(
        "Select a society for this account."
      );

      return;
    }

    if (
      editUserForm.password &&
      editUserForm
        .password
        .length <
        8
    ) {
      setError(
        "New password must contain at least 8 characters."
      );

      return;
    }

    setUserUpdating(
      true
    );

    setError("");
    setSuccess("");

    const {
      data,
      error:
        updateError,
    } =
      await supabase
        .functions
        .invoke(
          "update-cms-user",
          {
            body: {
              userId:
                editingUser.id,
              fullName,
              email,
              password:
                editUserForm.password ||
                null,
              role:
                editUserForm.role,
              title:
                editUserForm.title
                  .trim() ||
                null,
              permissionOverrides:
                editUserForm
                  .permissionOverrides ||
                {},
              societyId:
                requiresSociety
                  ? editUserForm
                      .societyId
                  : null,
              isActive:
                editingUser
                  .is_active,
            },
          }
        );

    if (
      updateError
    ) {
      console.error(
        "Could not update CMS user:",
        updateError
      );

      setError(
        updateError.message ||
          "Could not update CMS user."
      );

      setUserUpdating(
        false
      );

      return;
    }

    if (
      data?.error
    ) {
      setError(
        data.error
      );

      setUserUpdating(
        false
      );

      return;
    }

    setSuccess(
      `${fullName} was updated successfully.`
    );

    setEditingUser(
      null
    );

    setEditUserForm({
      ...emptyForm,
      permissionOverrides:
        {},
    });

    setUserUpdating(
      false
    );

    await fetchUsers();
  }

  async function deleteUser(
    user
  ) {
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

    if (
      !confirmed
    ) {
      return;
    }

    setDeletingUserId(
      user.id
    );

    const {
      data,
      error:
        deleteError,
    } =
      await supabase
        .functions
        .invoke(
          "delete-cms-user",
          {
            body: {
              userId:
                user.id,
            },
          }
        );

    if (
      deleteError
    ) {
      console.error(
        "Delete user error:",
        deleteError
      );

      setError(
        deleteError.message ||
          "Could not delete CMS user."
      );

      setDeletingUserId(
        null
      );

      return;
    }

    if (
      data?.error
    ) {
      setError(
        data.error
      );

      setDeletingUserId(
        null
      );

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
      setEditingUser(
        null
      );

      setEditUserForm({
        ...emptyForm,
        permissionOverrides:
          {},
      });
    }

    setDeletingUserId(
      null
    );

    await fetchUsers();
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
      error:
        statusError,
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

    if (
      statusError
    ) {
      console.error(
        "Could not update account status:",
        statusError
      );

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
            ROLE_LABELS[
              user.role
            ],
            user.societies
              ?.name,
            user.societies
              ?.code,
          ]
            .filter(
              Boolean
            )
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
            Manage CMS accounts, roles,
            titles and individual task
            permissions.
          </p>
        </div>

        <div className="admin-page-heading-actions">
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
            {
              studentAdminCount
            }
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
    data.role ===
      "teacher" ||
    data.role ===
      "student_admin";

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

function getInitials(
  name
) {
  if (
    !name
  ) {
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