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
  event_id: "",
  caption: "",
  media_type: "image",
  media_url: "",
  is_published: true,
};

function AdminMedia() {
  const { user } = useAuth();

  const [media, setMedia] = useState([]);
  const [events, setEvents] = useState([]);
  const [formData, setFormData] = useState(emptyForm);

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchData() {
    setLoading(true);
    setError("");

    const [mediaResult, eventResult] = await Promise.all([
      supabase
        .from("event_media")
        .select(`
          id,
          event_id,
          media_url,
          media_type,
          caption,
          created_by,
          is_published,
          created_at
        `)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("events")
        .select(`
          id,
          title,
          event_date,
          category,
          location
        `)
        .order("event_date", {
          ascending: false,
        }),
    ]);

    if (mediaResult.error) {
      console.error(
        "Could not load event media:",
        mediaResult.error
      );

      setError("Could not load event media.");
      setMedia([]);
    } else {
      setMedia(mediaResult.data || []);
    }

    if (eventResult.error) {
      console.error(
        "Could not load events:",
        eventResult.error
      );

      setError("Could not load event information.");
      setEvents([]);
    } else {
      setEvents(eventResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    if (error) {
      setError("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.event_id) {
      setError("Select an event.");
      return;
    }

    if (!formData.media_url.trim()) {
      setError("Enter a media URL.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      event_id: Number(
        formData.event_id
      ),

      media_url:
        formData.media_url.trim(),

      media_type:
        formData.media_type,

      caption:
        formData.caption.trim() ||
        null,

      is_published:
        formData.is_published,
    };

    let result;

    if (editingId) {
      result = await supabase
        .from("event_media")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
    } else {
      result = await supabase
        .from("event_media")
        .insert({
          ...payload,
          created_by:
            user?.id || null,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error(
        "Could not save media:",
        result.error
      );

      setError(
        editingId
          ? "Could not update media item."
          : "Could not publish media item."
      );

      setSaving(false);
      return;
    }

    const linkedEvent =
      events.find(
        (item) =>
          String(item.id) ===
          String(payload.event_id)
      );

    await logActivity({
      action:
        editingId
          ? "updated_event_media"
          : "created_event_media",

      entityType:
        "event_media",

      entityId:
        String(result.data.id),

      details: {
        event_id:
          payload.event_id,

        event_title:
          linkedEvent?.title ||
          "Unknown event",

        media_type:
          payload.media_type,

        caption:
          payload.caption,

        is_published:
          payload.is_published,

        media_url:
          payload.media_url,
      },
    });

    setSuccess(
      editingId
        ? "Media item updated successfully."
        : "Media item published successfully."
    );

    setFormData(emptyForm);
    setEditingId(null);
    setSaving(false);

    await fetchData();
  }

  function handleEdit(item) {
    setEditingId(item.id);

    setFormData({
      event_id:
        String(item.event_id || ""),

      caption:
        item.caption || "",

      media_type:
        item.media_type || "image",

      media_url:
        item.media_url || "",

      is_published:
        item.is_published ?? true,
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    if (saving) {
      return;
    }

    setEditingId(null);
    setFormData(emptyForm);
    setError("");
  }

  async function handleDelete(item) {
    const confirmed =
      window.confirm(
        `Delete this ${
          item.media_type ||
          "media item"
        }?`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);
    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("event_media")
      .delete()
      .eq("id", item.id);

    if (error) {
      console.error(
        "Could not delete media:",
        error
      );

      setError(
        "Could not delete media item."
      );

      setDeletingId(null);
      return;
    }

    const linkedEvent =
      events.find(
        (event) =>
          String(event.id) ===
          String(item.event_id)
      );

    await logActivity({
      action:
        "deleted_event_media",

      entityType:
        "event_media",

      entityId:
        String(item.id),

      details: {
        event_id:
          item.event_id,

        event_title:
          linkedEvent?.title ||
          "Unknown event",

        media_type:
          item.media_type,

        caption:
          item.caption || null,

        media_url:
          item.media_url,
      },
    });

    if (editingId === item.id) {
      setEditingId(null);
      setFormData(emptyForm);
    }

    setSuccess(
      "Media item deleted successfully."
    );

    setDeletingId(null);

    await fetchData();
  }

  async function togglePublished(item) {
    setError("");
    setSuccess("");

    const nextValue =
      !item.is_published;

    const { error } = await supabase
      .from("event_media")
      .update({
        is_published: nextValue,
      })
      .eq("id", item.id);

    if (error) {
      console.error(
        "Could not update media visibility:",
        error
      );

      setError(
        "Could not update media visibility."
      );

      return;
    }

    await logActivity({
      action:
        nextValue
          ? "published_event_media"
          : "unpublished_event_media",

      entityType:
        "event_media",

      entityId:
        String(item.id),

      details: {
        event_id:
          item.event_id,

        media_type:
          item.media_type,

        caption:
          item.caption || null,

        is_published:
          nextValue,
      },
    });

    setSuccess(
      nextValue
        ? "Media item is now public."
        : "Media item was hidden from the public site."
    );

    await fetchData();
  }

  function getEvent(eventId) {
    return events.find(
      (event) =>
        String(event.id) ===
        String(eventId)
    );
  }

  function getEventName(eventId) {
    return (
      getEvent(eventId)?.title ||
      "Unknown Event"
    );
  }

  const filteredMedia =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return media.filter(
        (item) => {
          const event =
            getEvent(item.event_id);

          const searchableText = [
            item.caption,
            item.media_type,
            item.media_url,
            event?.title,
            event?.category,
            event?.location,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !query ||
            searchableText.includes(
              query
            );

          const matchesEvent =
            selectedEvent === "all" ||
            String(item.event_id) ===
              String(selectedEvent);

          const matchesType =
            typeFilter === "all" ||
            item.media_type ===
              typeFilter;

          const matchesVisibility =
            visibilityFilter === "all" ||
            (
              visibilityFilter ===
                "published" &&
              item.is_published
            ) ||
            (
              visibilityFilter ===
                "hidden" &&
              !item.is_published
            );

          return (
            matchesSearch &&
            matchesEvent &&
            matchesType &&
            matchesVisibility
          );
        }
      );
    }, [
      media,
      events,
      search,
      selectedEvent,
      typeFilter,
      visibilityFilter,
    ]);

  const imageCount =
    media.filter(
      (item) =>
        item.media_type === "image"
    ).length;

  const videoCount =
    media.filter(
      (item) =>
        item.media_type === "video"
    ).length;

  const publishedCount =
    media.filter(
      (item) =>
        item.is_published
    ).length;

  return (
    <AdminLayout>

      <div className="admin-page-heading">

        <div>

          <span className="admin-eyebrow">
            Event Content
          </span>

          <h1>
            Media & Highlights
          </h1>

          <p>
            Manage event images, videos
            and highlights published across
            the EventHub platform.
          </p>

        </div>

        <div className="admin-page-count">

          <strong>
            {media.length}
          </strong>

          <span>
            Media items
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

      <section className="admin-media-stats">

        <div>

          <span>
            Total Media
          </span>

          <strong>
            {media.length}
          </strong>

        </div>

        <div>

          <span>
            Images
          </span>

          <strong>
            {imageCount}
          </strong>

        </div>

        <div>

          <span>
            Videos
          </span>

          <strong>
            {videoCount}
          </strong>

        </div>

        <div>

          <span>
            Published
          </span>

          <strong>
            {publishedCount}
          </strong>

        </div>

      </section>

      <div className="admin-media-layout">

        <section className="admin-editor-card">

          <div className="admin-editor-header">

            <div>

              <span>
                {editingId
                  ? "Editing media"
                  : "New media"}
              </span>

              <h2>
                {editingId
                  ? "Update media"
                  : "Publish media"}
              </h2>

            </div>

            {editingId && (
              <button
                type="button"
                className="admin-editor-close"
                onClick={cancelEdit}
                disabled={saving}
                aria-label="Cancel editing"
              >
                ×
              </button>
            )}

          </div>

          <form
            className="admin-media-form"
            onSubmit={handleSubmit}
          >

            <div className="admin-field">

              <label htmlFor="media-event">
                Event
              </label>

              <select
                id="media-event"
                name="event_id"
                value={formData.event_id}
                onChange={handleChange}
                required
              >

                <option value="">
                  Select event
                </option>

                {events.map(
                  (event) => (
                    <option
                      key={event.id}
                      value={event.id}
                    >
                      {event.title}
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="admin-field">

              <label htmlFor="media-type">
                Media type
              </label>

              <select
                id="media-type"
                name="media_type"
                value={formData.media_type}
                onChange={handleChange}
                required
              >

                <option value="image">
                  Image
                </option>

                <option value="video">
                  Video
                </option>

              </select>

            </div>

            <div className="admin-field">

              <label htmlFor="media-url">
                Media URL
              </label>

              <input
                id="media-url"
                name="media_url"
                type="url"
                value={formData.media_url}
                onChange={handleChange}
                placeholder="https://example.com/media.jpg"
                required
              />

            </div>

            <div className="admin-field">

              <label htmlFor="media-caption">
                Caption
              </label>

              <textarea
                id="media-caption"
                name="caption"
                rows="5"
                value={formData.caption}
                onChange={handleChange}
                placeholder="Add a short caption or event highlight..."
              />

            </div>

            <label className="admin-media-publish-toggle">

              <input
                type="checkbox"
                name="is_published"
                checked={formData.is_published}
                onChange={handleChange}
              />

              <span className="admin-media-publish-switch" />

              <div>

                <strong>
                  Publish publicly
                </strong>

                <span>
                  Show this media item on
                  the public event page.
                </span>

              </div>

            </label>

            <div className="admin-form-actions">

              <button
                type="submit"
                className="btn btn-primary admin-save-button"
                disabled={saving}
              >

                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update media"
                    : "Publish media"}

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
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
              )}

            </div>

          </form>

        </section>

        <section className="admin-media-panel">

          <div className="admin-media-panel-header">

            <div>

              <span>
                Media Library
              </span>

              <h2>
                Event Highlights
              </h2>

            </div>

            <div className="admin-media-tools">

              <div className="admin-events-search">

                <span>
                  ⌕
                </span>

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search media..."
                />

              </div>

              <select
                value={selectedEvent}
                onChange={(event) =>
                  setSelectedEvent(
                    event.target.value
                  )
                }
              >

                <option value="all">
                  All events
                </option>

                {events.map(
                  (event) => (
                    <option
                      key={event.id}
                      value={event.id}
                    >
                      {event.title}
                    </option>
                  )
                )}

              </select>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(
                    event.target.value
                  )
                }
              >

                <option value="all">
                  All media
                </option>

                <option value="image">
                  Images
                </option>

                <option value="video">
                  Videos
                </option>

              </select>

              <select
                value={visibilityFilter}
                onChange={(event) =>
                  setVisibilityFilter(
                    event.target.value
                  )
                }
              >

                <option value="all">
                  All visibility
                </option>

                <option value="published">
                  Published
                </option>

                <option value="hidden">
                  Hidden
                </option>

              </select>

            </div>

          </div>

          <div className="admin-events-results">

            <span>
              Showing{" "}
              {filteredMedia.length}{" "}
              of{" "}
              {media.length}
            </span>

          </div>

          {loading ? (
            <LoadingState
              label="Loading media..."
            />
          ) : filteredMedia.length === 0 ? (
            <EmptyState
              title={
                search ||
                selectedEvent !==
                  "all" ||
                typeFilter !==
                  "all" ||
                visibilityFilter !==
                  "all"
                  ? "No matching media"
                  : "No media yet"
              }
              description={
                search ||
                selectedEvent !==
                  "all" ||
                typeFilter !==
                  "all" ||
                visibilityFilter !==
                  "all"
                  ? "Try changing the search or media filters."
                  : "Publish your first event image or video using the form."
              }
            />
          ) : (
            <div className="admin-media-grid">

              {filteredMedia.map(
                (item) => {
                  const deleting =
                    deletingId ===
                    item.id;

                  const event =
                    getEvent(
                      item.event_id
                    );

                  return (
                    <article
                      key={item.id}
                      className="admin-media-card"
                    >

                      <div className="admin-media-preview">

                        {item.media_type ===
                        "video" ? (
                          <video
                            src={item.media_url}
                            controls
                            preload="metadata"
                          />
                        ) : (
                          <img
                            src={item.media_url}
                            alt={
                              item.caption ||
                              event?.title ||
                              "Event media"
                            }
                            loading="lazy"
                          />
                        )}

                        <span
                          className={`admin-media-type admin-media-type--${item.media_type}`}
                        >
                          {item.media_type}
                        </span>

                        <span
                          className={
                            item.is_published
                              ? "admin-media-visibility published"
                              : "admin-media-visibility hidden"
                          }
                        >
                          {item.is_published
                            ? "Published"
                            : "Hidden"}
                        </span>

                      </div>

                      <div className="admin-media-card-body">

                        <span className="admin-media-event">
                          {getEventName(
                            item.event_id
                          )}
                        </span>

                        <h3>
                          {item.caption ||
                            (
                              item.media_type ===
                              "video"
                                ? "Event video"
                                : "Event image"
                            )}
                        </h3>

                        {event && (
                          <div className="admin-media-event-meta">

                            {event.category && (
                              <span>
                                {event.category}
                              </span>
                            )}

                            {event.event_date && (
                              <span>
                                {formatEventDate(
                                  event.event_date
                                )}
                              </span>
                            )}

                          </div>
                        )}

                        <div className="admin-media-meta">

                          <span>
                            Added{" "}
                            {formatDate(
                              item.created_at
                            )}
                          </span>

                        </div>

                        <div className="admin-media-actions">

                          <button
                            type="button"
                            className="admin-action-button"
                            disabled={deleting}
                            onClick={() =>
                              handleEdit(item)
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="admin-action-button"
                            disabled={deleting}
                            onClick={() =>
                              togglePublished(
                                item
                              )
                            }
                          >
                            {item.is_published
                              ? "Hide"
                              : "Publish"}
                          </button>

                          <button
                            type="button"
                            className="admin-action-button danger"
                            disabled={deleting}
                            onClick={() =>
                              handleDelete(item)
                            }
                          >
                            {deleting
                              ? "Deleting..."
                              : "Delete"}
                          </button>

                        </div>

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

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unknown";
  }

  return date.toLocaleDateString(
    "en-US",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatEventDate(value) {
  if (!value) {
    return "Date TBA";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Date TBA";
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

export default AdminMedia;