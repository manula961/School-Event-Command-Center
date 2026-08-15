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
  event_id: "",
  title: "",
  message: "",
  update_type: "",
};


const UPDATE_TYPES = [
  "Live",
  "Result",
  "Highlight",
  "Schedule",
  "Important",
];


function AdminUpdates() {
  const [
    events,
    setEvents,
  ] = useState([]);

  const [
    updates,
    setUpdates,
  ] = useState([]);

  const [
    formData,
    setFormData,
  ] = useState(
    emptyForm
  );

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


  async function fetchData() {
    setLoading(true);
    setError("");

    const [
      eventResult,
      updateResult,
    ] = await Promise.all([
      supabase
        .from("events")
        .select(`
          id,
          title,
          event_date,
          status,
          approval_status
        `)
        .order(
          "event_date",
          {
            ascending: true,
          }
        ),

      supabase
        .from("event_updates")
        .select(`
          id,
          event_id,
          title,
          message,
          update_type,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending: false,
          }
        ),
    ]);

    const errors = [];

    if (
      eventResult.error
    ) {
      console.error(
        "Could not load events:",
        eventResult.error
      );

      setEvents([]);

      errors.push(
        "events"
      );
    } else {
      setEvents(
        eventResult.data ||
        []
      );
    }

    if (
      updateResult.error
    ) {
      console.error(
        "Could not load live updates:",
        updateResult.error
      );

      setUpdates([]);

      errors.push(
        "live updates"
      );
    } else {
      setUpdates(
        updateResult.data ||
        []
      );
    }

    if (
      errors.length > 0
    ) {
      setError(
        `Could not load ${errors.join(
          " and "
        )}.`
      );
    }

    setLoading(false);
  }


  useEffect(() => {
    fetchData();
  }, []);


  const eventMap =
    useMemo(() => {
      return new Map(
        events.map(
          (event) => [
            String(
              event.id
            ),
            event,
          ]
        )
      );
    }, [
      events,
    ]);


  const availableEvents =
    useMemo(() => {
      return events.filter(
        (event) => {
          const status =
            event.status ||
            "upcoming";

          const approvalStatus =
            event.approval_status ||
            "draft";

          return (
            ![
              "completed",
              "cancelled",
            ].includes(
              status
            ) &&
            ![
              "rejected",
            ].includes(
              approvalStatus
            )
          );
        }
      );
    }, [
      events,
    ]);


  function getEventName(
    eventId
  ) {
    return (
      eventMap.get(
        String(
          eventId
        )
      )?.title ||
      "Unknown Event"
    );
  }


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

    const eventId =
      formData.event_id;

    const title =
      formData.title
        .trim();

    const message =
      formData.message
        .trim();

    const updateType =
      formData.update_type;

    if (
      !eventId ||
      !title ||
      !message ||
      !updateType
    ) {
      setError(
        "Complete all update fields before publishing."
      );

      return;
    }

    const selectedEvent =
      eventMap.get(
        String(
          eventId
        )
      );

    if (
      !selectedEvent
    ) {
      setError(
        "The selected event could not be found."
      );

      return;
    }

    if (
      selectedEvent.status ===
      "cancelled"
    ) {
      setError(
        "Live updates cannot be published to a cancelled event."
      );

      return;
    }

    if (
      selectedEvent.status ===
      "completed"
    ) {
      setError(
        "This event has already been completed."
      );

      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const {
      data,
      error:
        publishError,
    } = await supabase
      .from("event_updates")
      .insert({
        event_id:
          eventId,

        title,

        message,

        update_type:
          updateType,
      })
      .select(`
        id,
        event_id,
        title,
        message,
        update_type,
        created_at
      `)
      .single();

    if (
      publishError
    ) {
      console.error(
        "Could not publish update:",
        publishError
      );

      setError(
        getActionError(
          publishError,
          "Could not publish update."
        )
      );

      setSaving(false);

      return;
    }

    setUpdates(
      (current) => [
        data,
        ...current,
      ]
    );

    setFormData(
      emptyForm
    );

    setSuccess(
      `Update published for ${selectedEvent.title}.`
    );

    setSaving(false);
  }


  async function handleDelete(
    update
  ) {
    const confirmed =
      window.confirm(
        `Delete "${update.title}"?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setDeletingId(
      update.id
    );

    setError("");
    setSuccess("");

    const {
      error:
        deleteError,
    } = await supabase
      .from("event_updates")
      .delete()
      .eq(
        "id",
        update.id
      );

    if (
      deleteError
    ) {
      console.error(
        "Could not delete update:",
        deleteError
      );

      setError(
        getActionError(
          deleteError,
          "Could not delete update."
        )
      );

      setDeletingId(
        null
      );

      return;
    }

    setUpdates(
      (current) =>
        current.filter(
          (item) =>
            String(
              item.id
            ) !==
            String(
              update.id
            )
        )
    );

    setSuccess(
      "Live update deleted successfully."
    );

    setDeletingId(
      null
    );
  }


  const filteredUpdates =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return updates.filter(
        (update) => {
          const eventName =
            getEventName(
              update.event_id
            );

          const updateType =
            update.update_type ||
            "Live";

          const matchesSearch =
            !query ||
            update.title
              ?.toLowerCase()
              .includes(
                query
              ) ||
            update.message
              ?.toLowerCase()
              .includes(
                query
              ) ||
            updateType
              .toLowerCase()
              .includes(
                query
              ) ||
            eventName
              .toLowerCase()
              .includes(
                query
              );

          const matchesType =
            typeFilter ===
              "All" ||
            updateType ===
              typeFilter;

          return (
            matchesSearch &&
            matchesType
          );
        }
      );
    }, [
      updates,
      eventMap,
      search,
      typeFilter,
    ]);


  return (
    <AdminLayout>

      <div className="admin-page-heading">

        <div>

          <span className="admin-eyebrow">
            Live Event Management
          </span>

          <h1>
            Live updates
          </h1>

          <p>
            Publish results, highlights,
            schedule changes and important
            information while events are
            happening.
          </p>

        </div>


        <div className="admin-page-count">

          <strong>
            {updates.length}
          </strong>

          <span>
            Total updates
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


      <div className="admin-updates-layout">

        <section className="admin-editor-card">

          <div className="admin-editor-header">

            <div>

              <span>
                Live publishing
              </span>

              <h2>
                Publish update
              </h2>

            </div>


            <div className="admin-live-indicator">

              <span />

              Live

            </div>

          </div>


          <form
            className="admin-update-form"
            onSubmit={
              handleSubmit
            }
          >

            <div className="admin-field">

              <label htmlFor="update-event">
                Event
              </label>

              <select
                id="update-event"
                name="event_id"
                value={
                  formData.event_id
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
                  Select event
                </option>


                {availableEvents.map(
                  (event) => (
                    <option
                      key={
                        event.id
                      }
                      value={
                        event.id
                      }
                    >
                      {event.title}
                    </option>
                  )
                )}

              </select>

            </div>


            <div className="admin-field">

              <label htmlFor="update-type">
                Update type
              </label>

              <select
                id="update-type"
                name="update_type"
                value={
                  formData.update_type
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
                  Select type
                </option>


                {UPDATE_TYPES.map(
                  (type) => (
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

              <label htmlFor="update-title">
                Title
              </label>

              <input
                id="update-title"
                name="title"
                value={
                  formData.title
                }
                onChange={
                  handleChange
                }
                placeholder="100m Final Started"
                maxLength={150}
                disabled={
                  saving
                }
                required
              />

            </div>


            <div className="admin-field">

              <label htmlFor="update-message">
                Message
              </label>

              <textarea
                id="update-message"
                name="message"
                rows="6"
                value={
                  formData.message
                }
                onChange={
                  handleChange
                }
                placeholder="Enter the live event update..."
                disabled={
                  saving
                }
                required
              />

            </div>


            <button
              type="submit"
              className="btn btn-primary admin-save-button"
              disabled={
                saving ||
                availableEvents.length ===
                  0
              }
            >

              {saving
                ? "Publishing..."
                : "Publish update"}

              {!saving && (
                <span>
                  →
                </span>
              )}

            </button>

          </form>


          {!loading &&
            availableEvents.length ===
              0 && (
              <div className="admin-inline-error">

                <span>
                  !
                </span>

                <p>
                  There are no active events
                  available for live updates.
                </p>

              </div>
            )}

        </section>


        <section className="admin-updates-panel">

          <div className="admin-updates-panel-header">

            <div>

              <span>
                Activity feed
              </span>

              <h2>
                Recent updates
              </h2>

            </div>


            <div className="admin-update-tools">

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
                  placeholder="Search live updates..."
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
                    event.target
                      .value
                  )
                }
              >

                <option value="All">
                  All types
                </option>


                {UPDATE_TYPES.map(
                  (type) => (
                    <option
                      key={
                        type
                      }
                      value={
                        type
                      }
                    >
                      {type ===
                      "Result"
                        ? "Results"
                        : type ===
                            "Highlight"
                          ? "Highlights"
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
                filteredUpdates.length
              }{" "}
              of{" "}
              {
                updates.length
              }{" "}
              updates
            </span>

          </div>


          {loading ? (
            <LoadingState
              label="Loading live updates..."
            />
          ) : filteredUpdates
              .length ===
            0 ? (
            <EmptyState
              title={
                search ||
                typeFilter !==
                  "All"
                  ? "No matching updates"
                  : "No live updates yet"
              }
              description={
                search ||
                typeFilter !==
                  "All"
                  ? "Try changing the search or update type."
                  : "Published live updates will appear here."
              }
            />
          ) : (
            <div className="admin-live-feed">

              {filteredUpdates.map(
                (update) => {
                  const type =
                    update.update_type ||
                    "Live";

                  const deleting =
                    String(
                      deletingId
                    ) ===
                    String(
                      update.id
                    );

                  return (
                    <article
                      className="admin-live-update"
                      key={
                        update.id
                      }
                    >

                      <div className="admin-live-timeline">

                        <span
                          className={
                            `admin-update-dot ${getTypeClass(
                              type
                            )}`
                          }
                        />

                        <span className="admin-update-line" />

                      </div>


                      <div className="admin-live-update-content">

                        <div className="admin-live-update-top">

                          <div>

                            <span
                              className={
                                `admin-update-type ${getTypeClass(
                                  type
                                )}`
                              }
                            >
                              {type}
                            </span>


                            <span className="admin-update-event">
                              {getEventName(
                                update.event_id
                              )}
                            </span>

                          </div>


                          <span className="admin-update-time">
                            {formatDate(
                              update.created_at
                            )}
                          </span>

                        </div>


                        <h3>
                          {update.title}
                        </h3>

                        <p>
                          {update.message}
                        </p>

                      </div>


                      <button
                        type="button"
                        className="admin-action-button danger"
                        onClick={() =>
                          handleDelete(
                            update
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
      type ||
      ""
    ).toLowerCase();

  const classes = {
    important:
      "important",

    result:
      "result",

    highlight:
      "highlight",

    schedule:
      "schedule",

    live:
      "live",
  };

  return (
    classes[
      normalized
    ] ||
    "live"
  );
}


function formatDate(
  value
) {
  if (!value) {
    return "Unknown";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unknown";
  }

  return date.toLocaleString(
    "en-US",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}


function getActionError(
  error,
  fallback
) {
  const message =
    String(
      error?.message ||
      ""
    ).toLowerCase();

  if (
    message.includes(
      "permission"
    )
  ) {
    return "You do not have permission to perform this action.";
  }

  if (
    message.includes(
      "authentication"
    ) ||
    message.includes(
      "unauthorized"
    )
  ) {
    return "Your session is not authorized. Sign in again.";
  }

  if (
    message.includes(
      "foreign key"
    )
  ) {
    return "The selected event is no longer available.";
  }

  return fallback;
}


export default AdminUpdates;