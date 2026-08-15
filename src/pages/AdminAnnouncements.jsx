import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../services/supabase";

import AdminLayout from "../components/layout/AdminLayout";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";


const emptyForm = {
  title: "",
  message: "",
  type: "",
  published_at: "",
};


const ANNOUNCEMENT_TYPES = [
  "Update",
  "Reminder",
  "Registration",
  "Important",
];


function AdminAnnouncements() {
  const [
    announcements,
    setAnnouncements,
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
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("All");


  async function fetchAnnouncements() {
    setLoading(true);
    setError("");

    const {
      data,
      error: fetchError,
    } = await supabase
      .from("announcements")
      .select("*")
      .order(
        "published_at",
        {
          ascending: false,
        }
      );

    if (fetchError) {
      console.error(
        "Could not load announcements:",
        fetchError
      );

      setError(
        "Could not load announcements."
      );

      setAnnouncements([]);
    } else {
      setAnnouncements(
        data || []
      );
    }

    setLoading(false);
  }


  useEffect(() => {
    fetchAnnouncements();
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
        [name]: value,
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

    const payload = {
      title:
        formData
          .title
          .trim(),

      message:
        formData
          .message
          .trim(),

      type:
        formData.type,

      published_at:
        formData
          .published_at,
    };

    if (
      !payload.title ||
      !payload.message ||
      !payload.type ||
      !payload.published_at
    ) {
      setError(
        "Complete all announcement fields."
      );

      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    let result;

    if (editingId) {
      result =
        await supabase
          .from("announcements")
          .update(
            payload
          )
          .eq(
            "id",
            editingId
          )
          .select()
          .single();
    } else {
      result =
        await supabase
          .from("announcements")
          .insert(
            payload
          )
          .select()
          .single();
    }

    if (
      result.error
    ) {
      console.error(
        "Could not save announcement:",
        result.error
      );

      setError(
        editingId
          ? "Could not update announcement."
          : "Could not publish announcement."
      );

      setSaving(false);

      return;
    }

    setSuccess(
      editingId
        ? "Announcement updated successfully."
        : "Announcement published successfully."
    );

    setFormData({
      ...emptyForm,
    });

    setEditingId(
      null
    );

    setSaving(
      false
    );

    await fetchAnnouncements();
  }


  function handleEdit(
    announcement
  ) {
    setEditingId(
      announcement.id
    );

    setFormData({
      title:
        announcement.title ||
        "",

      message:
        announcement.message ||
        "",

      type:
        announcement.type ||
        "",

      published_at:
        normalizeDateForInput(
          announcement
            .published_at
        ),
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }


  function cancelEdit() {
    setEditingId(
      null
    );

    setFormData({
      ...emptyForm,
    });

    setError("");
  }


  async function handleDelete(
    id
  ) {
    const announcement =
      announcements.find(
        (item) =>
          String(
            item.id
          ) ===
          String(
            id
          )
      );

    const confirmed =
      window.confirm(
        `Delete "${
          announcement
            ?.title ||
          "this announcement"
        }"?`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      id
    );

    setError("");
    setSuccess("");

    const {
      error: deleteError,
    } = await supabase
      .from("announcements")
      .delete()
      .eq(
        "id",
        id
      );

    if (deleteError) {
      console.error(
        "Could not delete announcement:",
        deleteError
      );

      setError(
        "Could not delete announcement."
      );

      setDeletingId(
        null
      );

      return;
    }

    if (
      String(
        editingId
      ) ===
      String(
        id
      )
    ) {
      setEditingId(
        null
      );

      setFormData({
        ...emptyForm,
      });
    }

    setSuccess(
      "Announcement deleted successfully."
    );

    setDeletingId(
      null
    );

    await fetchAnnouncements();
  }


  const filteredAnnouncements =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return announcements.filter(
        (
          announcement
        ) => {
          const matchesSearch =
            !query ||
            announcement
              .title
              ?.toLowerCase()
              .includes(
                query
              ) ||
            announcement
              .message
              ?.toLowerCase()
              .includes(
                query
              ) ||
            announcement
              .type
              ?.toLowerCase()
              .includes(
                query
              );

          const matchesType =
            typeFilter ===
              "All" ||
            announcement.type ===
              typeFilter;

          return (
            matchesSearch &&
            matchesType
          );
        }
      );
    }, [
      announcements,
      search,
      typeFilter,
    ]);


  return (
    <AdminLayout>

      <div className="admin-page-heading">

        <div>

          <span className="admin-eyebrow">
            Announcement Management
          </span>

          <h1>
            Manage announcements
          </h1>

          <p>
            Publish important notices,
            reminders and registration
            information across the event
            platform.
          </p>

        </div>


        <div className="admin-page-count">

          <strong>
            {
              announcements
                .length
            }
          </strong>

          <span>
            Total announcements
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


      <div className="admin-announcements-layout">

        <section className="admin-editor-card">

          <div className="admin-editor-header">

            <div>

              <span>
                {editingId
                  ? "Editing announcement"
                  : "New announcement"}
              </span>

              <h2>
                {editingId
                  ? "Update announcement"
                  : "Publish announcement"}
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
            className="admin-announcement-form"
            onSubmit={
              handleSubmit
            }
          >

            <div className="admin-field">

              <label htmlFor="announcement-title">
                Title
              </label>

              <input
                id="announcement-title"
                name="title"
                value={
                  formData.title
                }
                onChange={
                  handleChange
                }
                placeholder="Registration closes Friday"
                disabled={
                  saving
                }
                required
              />

            </div>


            <div className="admin-form-row">

              <div className="admin-field">

                <label htmlFor="announcement-type">
                  Type
                </label>

                <select
                  id="announcement-type"
                  name="type"
                  value={
                    formData.type
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    saving
                  }
                  required
                >

                  <option value="">
                    Choose type
                  </option>


                  {ANNOUNCEMENT_TYPES.map(
                    (
                      type
                    ) => (
                      <option
                        key={
                          type
                        }
                        value={
                          type
                        }
                      >
                        {type}
                      </option>
                    )
                  )}

                </select>

              </div>


              <div className="admin-field">

                <label htmlFor="published-at">
                  Publish date
                </label>

                <input
                  id="published-at"
                  type="date"
                  name="published_at"
                  value={
                    formData
                      .published_at
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    saving
                  }
                  required
                />

              </div>

            </div>


            <div className="admin-field">

              <label htmlFor="announcement-message">
                Message
              </label>

              <textarea
                id="announcement-message"
                name="message"
                rows="7"
                value={
                  formData.message
                }
                onChange={
                  handleChange
                }
                placeholder="Write the announcement clearly and concisely..."
                disabled={
                  saving
                }
                required
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
                    ? "Update announcement"
                    : "Publish announcement"}

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


        <section className="admin-announcements-panel">

          <div className="admin-announcements-panel-header">

            <div>

              <span>
                Published feed
              </span>

              <h2>
                Current announcements
              </h2>

            </div>


            <div className="admin-announcement-tools">

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
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Search announcements..."
                />

              </div>


              <select
                className="admin-announcement-filter"
                value={
                  typeFilter
                }
                onChange={(
                  event
                ) =>
                  setTypeFilter(
                    event
                      .target
                      .value
                  )
                }
              >

                <option value="All">
                  All types
                </option>


                {ANNOUNCEMENT_TYPES.map(
                  (
                    type
                  ) => (
                    <option
                      key={
                        type
                      }
                      value={
                        type
                      }
                    >
                      {type ===
                      "Update"
                        ? "Updates"
                        : type ===
                            "Reminder"
                          ? "Reminders"
                          : type}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>


          <div className="admin-events-results">

            <span>
              Showing{" "}
              {
                filteredAnnouncements
                  .length
              }{" "}
              of{" "}
              {
                announcements
                  .length
              }
            </span>

          </div>


          {loading ? (
            <LoadingState
              label="Loading announcements..."
            />
          ) : filteredAnnouncements
              .length ===
            0 ? (
            <EmptyState
              title={
                search ||
                typeFilter !==
                  "All"
                  ? "No matching announcements"
                  : "No announcements yet"
              }
              description={
                search ||
                typeFilter !==
                  "All"
                  ? "Try adjusting your search or announcement type."
                  : "Publish your first announcement using the form."
              }
            />
          ) : (
            <div className="admin-announcement-list-new">

              {filteredAnnouncements.map(
                (
                  announcement
                ) => {
                  const typeClass =
                    getTypeClass(
                      announcement.type
                    );

                  const deleting =
                    String(
                      deletingId
                    ) ===
                    String(
                      announcement.id
                    );

                  return (
                    <article
                      className="admin-announcement-row"
                      key={
                        announcement.id
                      }
                    >

                      <div
                        className={
                          `admin-announcement-type-marker ${typeClass}`
                        }
                      />


                      <div className="admin-announcement-main">

                        <div className="admin-announcement-topline">

                          <span
                            className={
                              `admin-announcement-type ${typeClass}`
                            }
                          >
                            {announcement
                              .type ||
                              "Update"}
                          </span>


                          <span className="admin-announcement-date">
                            {formatDate(
                              announcement
                                .published_at
                            )}
                          </span>

                        </div>


                        <h3>
                          {
                            announcement
                              .title
                          }
                        </h3>


                        <p>
                          {
                            announcement
                              .message
                          }
                        </p>

                      </div>


                      <div className="admin-event-row-actions">

                        <button
                          type="button"
                          className="admin-action-button"
                          onClick={() =>
                            handleEdit(
                              announcement
                            )
                          }
                          disabled={
                            deleting
                          }
                        >
                          Edit
                        </button>


                        <button
                          type="button"
                          className="admin-action-button danger"
                          onClick={() =>
                            handleDelete(
                              announcement.id
                            )
                          }
                          disabled={
                            deleting
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

            </div>
          )}

        </section>

      </div>

    </AdminLayout>
  );
}


function getTypeClass(
  type
) {
  const normalized =
    String(
      type || ""
    )
      .trim()
      .toLowerCase();

  if (
    normalized ===
    "important"
  ) {
    return "important";
  }

  if (
    normalized ===
    "registration"
  ) {
    return "registration";
  }

  if (
    normalized ===
    "reminder"
  ) {
    return "reminder";
  }

  return "update";
}


function normalizeDateForInput(
  date
) {
  if (!date) {
    return "";
  }

  const value =
    String(
      date
    );

  const match =
    value.match(
      /^(\d{4}-\d{2}-\d{2})/
    );

  return match
    ? match[1]
    : "";
}


function formatDate(
  date
) {
  if (!date) {
    return "No date";
  }

  const normalized =
    normalizeDateForInput(
      date
    );

  if (!normalized) {
    return "No date";
  }

  const value =
    new Date(
      `${normalized}T00:00:00`
    );

  if (
    Number.isNaN(
      value.getTime()
    )
  ) {
    return "No date";
  }

  return value.toLocaleDateString(
    "en-US",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  );
}


export default AdminAnnouncements;