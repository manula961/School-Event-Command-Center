import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { logActivity } from "../utils/activityLogger";

import AdminLayout from "../components/layout/AdminLayout";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";

const emptyForm = {
  name: "",
  code: "",
  description: "",
};

function AdminSocieties() {
  const {
    role,
  } = useAuth();

  const [
    societies,
    setSocieties,
  ] = useState([]);

  const [
    teachers,
    setTeachers,
  ] = useState([]);

  const [
    formData,
    setFormData,
  ] = useState(emptyForm);

  const [
    editingId,
    setEditingId,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState(null);

  const [
    assigningTeacherId,
    setAssigningTeacherId,
  ] = useState(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  async function fetchSocieties() {
    const {
      data,
      error:
        societyError,
    } = await supabase
      .from("societies")
      .select(`
        id,
        name,
        code,
        description,
        created_at
      `)
      .order(
        "name",
        {
          ascending: true,
        }
      );

    if (
      societyError
    ) {
      console.error(
        "Could not load societies:",
        societyError
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

  async function fetchTeachers() {
    const {
      data,
      error:
        teacherError,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        role,
        title,
        society_id,
        is_active
      `)
      .eq(
        "role",
        "teacher"
      )
      .eq(
        "is_active",
        true
      )
      .order(
        "full_name",
        {
          ascending: true,
        }
      );

    if (
      teacherError
    ) {
      console.error(
        "Could not load teachers:",
        teacherError
      );

      setTeachers([]);

      return;
    }

    setTeachers(
      data || []
    );
  }

  async function loadPage() {
    setLoading(true);
    setError("");

    await Promise.all([
      fetchSocieties(),
      fetchTeachers(),
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
          name === "code"
            ? cleanSocietyCode(
                value
              )
            : value,
      })
    );

    if (error) {
      setError("");
    }

    if (success) {
      setSuccess("");
    }
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    const name =
      formData.name.trim();

    const code =
      formData.code
        .trim()
        .toUpperCase();

    const description =
      formData.description
        .trim();

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

    setSaving(true);
    setError("");
    setSuccess("");

    let result;

    if (
      editingId
    ) {
      result =
        await supabase
          .from("societies")
          .update({
            name,
            code,

            description:
              description ||
              null,
          })
          .eq(
            "id",
            editingId
          )
          .select()
          .single();
    } else {
      result =
        await supabase
          .from("societies")
          .insert({
            name,
            code,

            description:
              description ||
              null,
          })
          .select()
          .single();
    }

    if (
      result.error
    ) {
      console.error(
        "Could not save society:",
        result.error
      );

      if (
        result.error.code ===
        "23505"
      ) {
        setError(
          `The society code "${code}" is already in use.`
        );
      } else if (
        result.error.code ===
        "42501"
      ) {
        setError(
          "You do not have permission to save societies."
        );
      } else {
        setError(
          editingId
            ? "Could not update society."
            : "Could not create society."
        );
      }

      setSaving(false);

      return;
    }

    await logActivity({
      action:
        editingId
          ? "updated_society"
          : "created_society",

      entityType:
        "society",

      entityId:
        result.data.id,

      details: {
        name,
        code,

        description:
          description ||
          null,
      },
    });

    setSuccess(
      editingId
        ? `${name} was updated successfully.`
        : `${name} was created successfully.`
    );

    setEditingId(
      null
    );

    setFormData({
      ...emptyForm,
    });

    setSaving(false);

    await fetchSocieties();
  }

  function handleEdit(
    society
  ) {
    setEditingId(
      society.id
    );

    setFormData({
      name:
        society.name ||
        "",

      code:
        society.code ||
        "",

      description:
        society.description ||
        "",
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    if (
      saving
    ) {
      return;
    }

    setEditingId(
      null
    );

    setFormData({
      ...emptyForm,
    });

    setError("");
  }

  function getTeacherForSociety(
    societyId
  ) {
    return teachers.find(
      (teacher) =>
        String(
          teacher.society_id
        ) ===
        String(
          societyId
        )
    );
  }

  async function assignTeacherToSociety(
    teacherId,
    societyId
  ) {
    if (
      !teacherId
    ) {
      setError(
        "Select a Teacher-in-Charge."
      );

      return;
    }

    const teacher =
      teachers.find(
        (item) =>
          String(
            item.id
          ) ===
          String(
            teacherId
          )
      );

    const society =
      societies.find(
        (item) =>
          String(
            item.id
          ) ===
          String(
            societyId
          )
      );

    if (
      !teacher ||
      !society
    ) {
      return;
    }

    setAssigningTeacherId(
      teacher.id
    );

    setError("");
    setSuccess("");

    const {
      error:
        assignmentError,
    } = await supabase
      .from("profiles")
      .update({
        society_id:
          society.id,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        teacher.id
      )
      .eq(
        "role",
        "teacher"
      );

    if (
      assignmentError
    ) {
      console.error(
        "Could not assign teacher:",
        assignmentError
      );

      setError(
        assignmentError.code ===
          "42501"
          ? "You do not have permission to assign a Teacher-in-Charge."
          : "Could not assign Teacher-in-Charge."
      );

      setAssigningTeacherId(
        null
      );

      return;
    }

    await logActivity({
      action:
        "assigned_teacher",

      entityType:
        "society",

      entityId:
        society.id,

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
        teacher.email ||
        "Teacher"
      } was assigned to ${society.name}.`
    );

    setAssigningTeacherId(
      null
    );

    await fetchTeachers();
  }

  async function handleDelete(
    society
  ) {
    if (
      role !==
      "principal"
    ) {
      setError(
        "Only the Principal can delete societies."
      );

      return;
    }

    const assignedTeacher =
      getTeacherForSociety(
        society.id
      );

    if (
      assignedTeacher
    ) {
      setError(
        `Cannot delete ${society.name}. A Teacher-in-Charge is still assigned to this society.`
      );

      return;
    }

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

    if (
      eventCheckError
    ) {
      console.error(
        eventCheckError
      );

      setError(
        "Could not check society dependencies."
      );

      return;
    }

    if (
      (eventCount || 0) >
      0
    ) {
      setError(
        `Cannot delete ${society.name}. ${eventCount} event${
          eventCount === 1
            ? ""
            : "s"
        } still reference this society.`
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Permanently delete ${society.name} (${society.code})?

This action cannot be undone.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setDeletingId(
      society.id
    );

    setError("");
    setSuccess("");

    const {
      error:
        deleteError,
    } = await supabase
      .from("societies")
      .delete()
      .eq(
        "id",
        society.id
      );

    if (
      deleteError
    ) {
      console.error(
        deleteError
      );

      setError(
        deleteError.code ===
          "42501"
          ? "You do not have permission to delete societies."
          : "Could not delete society."
      );

      setDeletingId(
        null
      );

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

    setSuccess(
      `${society.name} was deleted successfully.`
    );

    if (
      String(
        editingId
      ) ===
      String(
        society.id
      )
    ) {
      setEditingId(
        null
      );

      setFormData({
        ...emptyForm,
      });
    }

    setDeletingId(
      null
    );

    await fetchSocieties();
  }

  const filteredSocieties =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (
        !query
      ) {
        return societies;
      }

      return societies.filter(
        (society) => {
          const teacher =
            getTeacherForSociety(
              society.id
            );

          const text = [
            society.name,
            society.code,
            society.description,
            teacher?.full_name,
            teacher?.email,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return text.includes(
            query
          );
        }
      );
    }, [
      societies,
      teachers,
      search,
    ]);

  return (
    <AdminLayout>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            Organization Management
          </span>

          <h1>
            Societies
          </h1>

          <p>
            Create and manage school
            societies and Teacher-in-Charge
            assignments.
          </p>
        </div>

        <div className="admin-page-count">
          <strong>
            {societies.length}
          </strong>

          <span>
            Societies
          </span>
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

      <div className="admin-events-layout">
        <section className="admin-editor-card">
          <div className="admin-editor-header">
            <div>
              <span>
                {editingId
                  ? "Editing society"
                  : "New society"}
              </span>

              <h2>
                {editingId
                  ? "Update society"
                  : "Create society"}
              </h2>
            </div>

            {editingId && (
              <button
                type="button"
                className="admin-editor-close"
                onClick={
                  cancelEdit
                }
                disabled={
                  saving
                }
                aria-label="Cancel editing"
              >
                ×
              </button>
            )}
          </div>

          <form
            className="admin-event-form"
            onSubmit={
              handleSubmit
            }
          >
            <div className="admin-field">
              <label htmlFor="society-name">
                Society name
              </label>

              <input
                id="society-name"
                name="name"
                value={
                  formData.name
                }
                onChange={
                  handleChange
                }
                placeholder="Science Society"
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="society-code">
                Society code
              </label>

              <input
                id="society-code"
                name="code"
                value={
                  formData.code
                }
                onChange={
                  handleChange
                }
                minLength="2"
                maxLength="6"
                placeholder="SCI"
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="society-description">
                Description
              </label>

              <textarea
                id="society-description"
                name="description"
                rows="6"
                value={
                  formData.description
                }
                onChange={
                  handleChange
                }
                placeholder="Add a short description of the society..."
              />
            </div>

            <div className="admin-form-actions">
              <button
                type="submit"
                className="btn btn-primary admin-save-button"
                disabled={
                  saving
                }
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update society"
                    : "Create society"}

                {!saving && (
                  <span>
                    →
                  </span>
                )}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={
                    cancelEdit
                  }
                  disabled={
                    saving
                  }
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="admin-events-panel">
          <div className="admin-events-panel-header">
            <div>
              <span>
                School organizations
              </span>

              <h2>
                Society directory
              </h2>
            </div>

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
                placeholder="Search societies..."
              />
            </div>
          </div>

          <div className="admin-events-results">
            <span>
              Showing{" "}
              {
                filteredSocieties.length
              }{" "}
              of{" "}
              {
                societies.length
              }
            </span>
          </div>

          {loading ? (
            <LoadingState
              label="Loading societies..."
            />
          ) : filteredSocieties.length ===
            0 ? (
            <EmptyState
              title={
                search
                  ? "No matching societies"
                  : "No societies yet"
              }
              description={
                search
                  ? "Try another society name, code or Teacher-in-Charge."
                  : "Create the first society using the form."
              }
            />
          ) : (
            <div className="admin-society-management">
              {filteredSocieties.map(
                (society) => {
                  const teacher =
                    getTeacherForSociety(
                      society.id
                    );

                  const deleting =
                    String(
                      deletingId
                    ) ===
                    String(
                      society.id
                    );

                  const assigning =
                    assigningTeacherId !==
                    null;

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
                              ? `Teacher-in-Charge: ${
                                  teacher.full_name ||
                                  teacher.email
                                }`
                              : "No Teacher-in-Charge assigned"}
                          </p>

                          {society.description && (
                            <small>
                              {
                                society.description
                              }
                            </small>
                          )}
                        </div>
                      </div>

                      <div className="admin-society-assignment admin-society-actions">
                        <select
                          value={
                            teacher?.id ||
                            ""
                          }
                          disabled={
                            assigning ||
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

                          {teachers.map(
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
                            deleting ||
                            assigning
                          }
                          onClick={() =>
                            handleEdit(
                              society
                            )
                          }
                        >
                          Edit
                        </button>

                        {role ===
                          "principal" && (
                          <button
                            type="button"
                            className="admin-action-button danger"
                            disabled={
                              deleting ||
                              assigning
                            }
                            onClick={() =>
                              handleDelete(
                                society
                              )
                            }
                          >
                            {deleting
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

function cleanSocietyCode(
  value
) {
  return String(
    value ||
    ""
  )
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

export default AdminSocieties;