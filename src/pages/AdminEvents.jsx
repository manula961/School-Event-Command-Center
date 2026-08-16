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
  title: "",
  category: "",
  event_date: "",
  event_time: "",
  location: "",
  description: "",
  status: "upcoming",
  capacity: "",
  registration_enabled: true,
};

const STATUS_LABELS = {
  draft: "Draft",
  teacher_review: "Teacher Review",
  vp_review: "Vice Principal Review",
  approved: "Approved",
  published: "Published",
  changes_requested: "Changes Requested",
  rejected: "Rejected",
  live: "Live",
  completed: "Completed",
};

const EVENT_STATUS_LABELS = {
  upcoming: "Upcoming",
  registration_open: "Registration Open",
  sold_out: "Sold Out",
  live: "Live",
  completed: "Completed",
  postponed: "Postponed",
  cancelled: "Cancelled",
};

function AdminEvents() {
  const {
    user,
    profile,
    role,
  } = useAuth();

  const [events, setEvents] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [eventStaff, setEventStaff] = useState([]);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [staffEvent, setStaffEvent] = useState(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSavingId, setStaffSavingId] = useState(null);

  async function fetchEvents() {
    setLoading(true);
    setError("");

    const {
      data,
      error: fetchError,
    } = await supabase
      .from("events")
      .select("*")
      .order("event_date", {
        ascending: true,
      });

    if (fetchError) {
      console.error(
        "Could not load events:",
        fetchError
      );

      setError("Could not load events.");
      setEvents([]);
    } else {
      setEvents(data || []);
    }

    setLoading(false);
  }

  async function fetchEventStaff() {
    if (role !== "principal") {
      setEventStaff([]);
      return;
    }

    setStaffLoading(true);

    const {
      data,
      error: staffError,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        role,
        title,
        is_active
      `)
      .eq("role", "event_staff")
      .eq("is_active", true)
      .order("full_name", {
        ascending: true,
      });

    if (staffError) {
      console.error(
        "Could not load Event Staff:",
        staffError
      );

      setEventStaff([]);
      setStaffLoading(false);
      return;
    }

    setEventStaff(data || []);
    setStaffLoading(false);
  }

  async function fetchStaffAssignments() {
    if (role !== "principal") {
      setStaffAssignments([]);
      return;
    }

    const {
      data,
      error: assignmentError,
    } = await supabase
      .from("event_staff_assignments")
      .select(`
        id,
        event_id,
        user_id,
        assigned_by,
        created_at
      `);

    if (assignmentError) {
      console.error(
        "Could not load staff assignments:",
        assignmentError
      );

      setStaffAssignments([]);
      return;
    }

    setStaffAssignments(data || []);
  }

  useEffect(() => {
    async function loadPage() {
      await Promise.all([
        fetchEvents(),
        fetchEventStaff(),
        fetchStaffAssignments(),
      ]);
    }

    loadPage();
  }, [role]);

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!user?.id) {
      setError(
        "Your account could not be identified."
      );
      return;
    }

    const title = formData.title.trim();
    const category = formData.category.trim();
    const location = formData.location.trim();

    if (
      !title ||
      !category ||
      !formData.event_date ||
      !formData.event_time ||
      !location
    ) {
      setError(
        "Complete all required event fields."
      );
      return;
    }

    const capacity =
      formData.capacity === ""
        ? null
        : Number(formData.capacity);

    if (
      capacity !== null &&
      (
        !Number.isFinite(capacity) ||
        capacity < 1
      )
    ) {
      setError(
        "Capacity must be at least 1."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      title,
      category,
      event_date: formData.event_date,
      event_time: formData.event_time,
      location,
      description: formData.description.trim(),
      status: formData.status,
      capacity,
      registration_enabled:
        formData.registration_enabled,
    };

    let result;

    if (editingId) {
      result = await supabase
        .from("events")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
    } else {
      result = await supabase
        .from("events")
        .insert({
          ...payload,
          created_by: user.id,
          society_id:
            profile?.society_id || null,
          approval_status: "draft",
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error(
        "Could not save event:",
        result.error
      );

      setError(
        editingId
          ? "Could not update event."
          : "Could not create event."
      );

      setSaving(false);
      return;
    }

    const savedEvent = result.data;

    await logActivity({
      action:
        editingId
          ? "updated_event"
          : "created_event",

      entityType: "event",

      entityId: String(savedEvent.id),

      details: {
        title: savedEvent.title,
        category: savedEvent.category,
        approval_status:
          savedEvent.approval_status || "draft",
        event_status:
          savedEvent.status || "upcoming",
        capacity: savedEvent.capacity,
        registration_enabled:
          savedEvent.registration_enabled,
      },
    });

    setSuccess(
      editingId
        ? "Event updated successfully."
        : "Event created successfully."
    );

    setFormData({
      ...emptyForm,
    });

    setEditingId(null);
    setSaving(false);

    await fetchEvents();
  }

  function handleEdit(event) {
    if (!canEditEvent(event)) {
      setError(
        "You do not have permission to edit this event."
      );
      return;
    }

    setEditingId(event.id);

    setFormData({
      title: event.title || "",
      category: event.category || "",
      event_date: event.event_date || "",
      event_time:
        normalizeTimeForInput(
          event.event_time
        ),
      location: event.location || "",
      description: event.description || "",
      status: event.status || "upcoming",
      capacity: event.capacity ?? "",
      registration_enabled:
        event.registration_enabled ?? true,
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    setEditingId(null);

    setFormData({
      ...emptyForm,
    });

    setError("");
  }

  function canEditEvent(event) {
    if (
      role === "principal" ||
      role === "vice_principal"
    ) {
      return true;
    }

    if (role === "teacher") {
      return Boolean(
        profile?.society_id &&
        event.society_id ===
          profile.society_id
      );
    }

    if (role === "student_admin") {
      const ownsEvent =
        event.created_by === user?.id;

      const editableStatus = [
        "draft",
        "changes_requested",
      ].includes(
        event.approval_status || "draft"
      );

      return ownsEvent && editableStatus;
    }

    return false;
  }

  function canDeleteEvent() {
    return role === "principal";
  }

  async function recordApproval(
    eventId,
    action,
    comment
  ) {
    const {
      error: approvalError,
    } = await supabase
      .from("event_approvals")
      .insert({
        event_id: eventId,
        user_id: user.id,
        action,
        comment,
      });

    if (approvalError) {
      console.error(
        "Could not save approval history:",
        approvalError
      );
    }
  }

  async function changeEventStatus({
    eventId,
    status,
    action,
    comment,
    extraData = {},
  }) {
    setActionLoadingId(eventId);
    setError("");
    setSuccess("");

    const {
      error: statusError,
    } = await supabase
      .from("events")
      .update({
        approval_status: status,
        ...extraData,
      })
      .eq("id", eventId);

    if (statusError) {
      console.error(
        "Could not update event approval status:",
        statusError
      );

      setError(
        "Could not update the event approval status."
      );

      setActionLoadingId(null);
      return false;
    }

    await recordApproval(
      eventId,
      action,
      comment
    );

    const activityActionMap = {
      submitted: "submitted_event",
      approved: "approved_event",
      changes_requested:
        "changes_requested_event",
      published: "published_event",
      rejected: "rejected_event",
    };

    const eventRecord =
      events.find(
        (item) =>
          String(item.id) ===
          String(eventId)
      );

    await logActivity({
      action:
        activityActionMap[action] ||
        "updated_event_status",

      entityType: "event",

      entityId: String(eventId),

      details: {
        title:
          eventRecord?.title ||
          "Unknown event",
        status,
        comment,
      },
    });

    if (
      String(editingId) ===
      String(eventId)
    ) {
      cancelEdit();
    }

    await fetchEvents();

    setActionLoadingId(null);

    return true;
  }

  async function submitForTeacherReview(
    eventId
  ) {
    const changed =
      await changeEventStatus({
        eventId,
        status: "teacher_review",
        action: "submitted",
        comment:
          "Event submitted for Teacher-in-Charge review.",
        extraData: {
          submitted_at:
            new Date().toISOString(),
        },
      });

    if (changed) {
      setSuccess(
        "Event submitted to the Teacher-in-Charge."
      );
    }
  }

  async function submitTeacherEventToVP(
    eventId
  ) {
    const now =
      new Date().toISOString();

    const changed =
      await changeEventStatus({
        eventId,
        status: "vp_review",
        action: "submitted",
        comment:
          "Teacher-created event submitted directly to Vice Principal review.",
        extraData: {
          submitted_at: now,
          teacher_approved_at: now,
        },
      });

    if (changed) {
      setSuccess(
        "Event submitted to the Vice Principal."
      );
    }
  }

  async function approveByTeacher(
    eventId
  ) {
    const changed =
      await changeEventStatus({
        eventId,
        status: "vp_review",
        action: "approved",
        comment:
          "Approved by Teacher-in-Charge and forwarded to the Vice Principal.",
        extraData: {
          teacher_approved_at:
            new Date().toISOString(),
        },
      });

    if (changed) {
      setSuccess(
        "Event approved and forwarded to the Vice Principal."
      );
    }
  }

  async function requestChanges(
    eventId
  ) {
    const confirmed =
      window.confirm(
        "Return this event for changes?"
      );

    if (!confirmed) {
      return;
    }

    const changed =
      await changeEventStatus({
        eventId,
        status: "changes_requested",
        action: "changes_requested",
        comment:
          role === "vice_principal"
            ? "Changes requested by Vice Principal."
            : role === "principal"
              ? "Changes requested by Principal."
              : "Changes requested by Teacher-in-Charge.",
      });

    if (changed) {
      setSuccess(
        "Event returned for changes."
      );
    }
  }

  async function publishEvent(
    eventId
  ) {
    const eventRecord =
      events.find(
        (event) =>
          String(event.id) ===
          String(eventId)
      );

    const confirmed =
      window.confirm(
        `Publish ${
          eventRecord?.title ||
          "this event"
        } now?`
      );

    if (!confirmed) {
      return;
    }

    const now =
      new Date().toISOString();

    const changed =
      await changeEventStatus({
        eventId,
        status: "published",
        action: "published",
        comment:
          role === "principal"
            ? "Published by Principal override."
            : "Final publication approved by Vice Principal.",
        extraData: {
          vp_approved_at: now,
          published_at: now,
          published_by: user.id,
        },
      });

    if (changed) {
      setSuccess(
        "Event published successfully."
      );
    }
  }

  async function rejectEvent(
    eventId
  ) {
    const confirmed =
      window.confirm(
        "Reject this event?"
      );

    if (!confirmed) {
      return;
    }

    const changed =
      await changeEventStatus({
        eventId,
        status: "rejected",
        action: "rejected",
        comment:
          role === "principal"
            ? "Event rejected by Principal."
            : "Event rejected by Vice Principal.",
      });

    if (changed) {
      setSuccess("Event rejected.");
    }
  }

  async function handleDelete(id) {
    if (!canDeleteEvent()) {
      setError(
        "Only the Principal can permanently delete events."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to permanently delete this event?"
      );

    if (!confirmed) {
      return;
    }

    setActionLoadingId(id);
    setError("");
    setSuccess("");

    const eventToDelete =
      events.find(
        (event) =>
          String(event.id) ===
          String(id)
      );

    const {
      error: deleteError,
    } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        "Could not delete event:",
        deleteError
      );

      setError(
        "Could not delete event."
      );

      setActionLoadingId(null);
      return;
    }

    await logActivity({
      action: "deleted_event",
      entityType: "event",
      entityId: String(id),

      details: {
        title:
          eventToDelete?.title ||
          "Unknown event",
        category:
          eventToDelete?.category ||
          null,
      },
    });

    if (
      String(editingId) ===
      String(id)
    ) {
      cancelEdit();
    }

    if (
      String(staffEvent?.id) ===
      String(id)
    ) {
      setStaffEvent(null);
    }

    setSuccess(
      "Event deleted successfully."
    );

    await Promise.all([
      fetchEvents(),
      fetchStaffAssignments(),
    ]);

    setActionLoadingId(null);
  }

  function openStaffManager(event) {
    if (role !== "principal") {
      return;
    }

    setStaffEvent(event);
    setError("");
    setSuccess("");
  }

  function closeStaffManager() {
    if (staffSavingId) {
      return;
    }

    setStaffEvent(null);
  }

  function isStaffAssigned(
    eventId,
    userId
  ) {
    return staffAssignments.some(
      (assignment) =>
        String(assignment.event_id) ===
          String(eventId) &&
        String(assignment.user_id) ===
          String(userId)
    );
  }

  function getAssignedStaffCount(
    eventId
  ) {
    return staffAssignments.filter(
      (assignment) =>
        String(assignment.event_id) ===
        String(eventId)
    ).length;
  }

  async function toggleStaffAssignment(
    staff
  ) {
    if (
      role !== "principal" ||
      !staffEvent
    ) {
      return;
    }

    const assigned =
      isStaffAssigned(
        staffEvent.id,
        staff.id
      );

    setStaffSavingId(staff.id);
    setError("");
    setSuccess("");

    if (assigned) {
      const {
        error: removeError,
      } = await supabase
        .from("event_staff_assignments")
        .delete()
        .eq(
          "event_id",
          staffEvent.id
        )
        .eq(
          "user_id",
          staff.id
        );

      if (removeError) {
        console.error(
          "Could not remove staff assignment:",
          removeError
        );

        setError(
          "Could not remove this Event Staff assignment."
        );

        setStaffSavingId(null);
        return;
      }

      await logActivity({
        action:
          "removed_event_staff",
        entityType: "event",
        entityId:
          String(staffEvent.id),

        details: {
          event_title:
            staffEvent.title,
          staff_id: staff.id,
          staff_name:
            staff.full_name,
          staff_title:
            staff.title || null,
        },
      });

      setSuccess(
        `${staff.full_name || staff.email} was removed from ${staffEvent.title}.`
      );
    } else {
      const {
        error: assignError,
      } = await supabase
        .from("event_staff_assignments")
        .insert({
          event_id:
            staffEvent.id,
          user_id:
            staff.id,
          assigned_by:
            user.id,
        });

      if (assignError) {
        console.error(
          "Could not assign Event Staff:",
          assignError
        );

        if (
          assignError.code ===
          "23505"
        ) {
          setError(
            "This staff member is already assigned to the event."
          );
        } else {
          setError(
            "Could not assign this Event Staff member."
          );
        }

        setStaffSavingId(null);
        return;
      }

      await logActivity({
        action:
          "assigned_event_staff",
        entityType: "event",
        entityId:
          String(staffEvent.id),

        details: {
          event_title:
            staffEvent.title,
          staff_id: staff.id,
          staff_name:
            staff.full_name,
          staff_title:
            staff.title || null,
        },
      });

      setSuccess(
        `${staff.full_name || staff.email} was assigned to ${staffEvent.title}.`
      );
    }

    await fetchStaffAssignments();

    setStaffSavingId(null);
  }

  const filteredEvents =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return events;
      }

      return events.filter(
        (event) => {
          const approvalStatus =
            STATUS_LABELS[
              event.approval_status
            ] || "";

          const eventStatus =
            EVENT_STATUS_LABELS[
              event.status
            ] || "";

          return (
            event.title
              ?.toLowerCase()
              .includes(query) ||
            event.category
              ?.toLowerCase()
              .includes(query) ||
            event.location
              ?.toLowerCase()
              .includes(query) ||
            event.description
              ?.toLowerCase()
              .includes(query) ||
            approvalStatus
              .toLowerCase()
              .includes(query) ||
            eventStatus
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [
      events,
      search,
    ]);

  function renderWorkflowActions(
    event
  ) {
    const status =
      event.approval_status ||
      "draft";

    const processing =
      String(actionLoadingId) ===
      String(event.id);

    const principalCanPublish =
      role === "principal" &&
      [
        "draft",
        "teacher_review",
        "vp_review",
        "changes_requested",
        "approved",
      ].includes(status);

    const vicePrincipalCanPublish =
      role === "vice_principal" &&
      status === "vp_review";

    return (
      <>
        {canEditEvent(event) && (
          <button
            type="button"
            className="admin-action-button"
            onClick={() =>
              handleEdit(event)
            }
            disabled={processing}
          >
            Edit
          </button>
        )}

        {role === "principal" && (
          <button
            type="button"
            className="admin-action-button"
            onClick={() =>
              openStaffManager(
                event
              )
            }
            disabled={processing}
          >
            Staff
            {getAssignedStaffCount(
              event.id
            ) > 0 && (
              <span>
                {" "}
                (
                {getAssignedStaffCount(
                  event.id
                )}
                )
              </span>
            )}
          </button>
        )}

        {role ===
          "student_admin" &&
          event.created_by ===
            user?.id &&
          [
            "draft",
            "changes_requested",
          ].includes(status) && (
            <button
              type="button"
              className="admin-action-button"
              onClick={() =>
                submitForTeacherReview(
                  event.id
                )
              }
              disabled={processing}
            >
              {processing
                ? "Submitting..."
                : "Submit to Teacher"}
            </button>
          )}

        {role === "teacher" &&
          event.created_by ===
            user?.id &&
          event.society_id ===
            profile?.society_id &&
          [
            "draft",
            "changes_requested",
          ].includes(status) && (
            <button
              type="button"
              className="admin-action-button"
              onClick={() =>
                submitTeacherEventToVP(
                  event.id
                )
              }
              disabled={processing}
            >
              {processing
                ? "Submitting..."
                : "Submit to VP"}
            </button>
          )}

        {role === "teacher" &&
          event.society_id ===
            profile?.society_id &&
          status ===
            "teacher_review" && (
            <>
              <button
                type="button"
                className="admin-action-button"
                onClick={() =>
                  approveByTeacher(
                    event.id
                  )
                }
                disabled={processing}
              >
                {processing
                  ? "Processing..."
                  : "Approve to VP"}
              </button>

              <button
                type="button"
                className="admin-action-button"
                onClick={() =>
                  requestChanges(
                    event.id
                  )
                }
                disabled={processing}
              >
                Request changes
              </button>
            </>
          )}

        {principalCanPublish && (
          <>
            <button
              type="button"
              className="admin-action-button"
              onClick={() =>
                publishEvent(
                  event.id
                )
              }
              disabled={processing}
            >
              {processing
                ? "Publishing..."
                : "Publish"}
            </button>

            {status !== "draft" && (
              <button
                type="button"
                className="admin-action-button"
                onClick={() =>
                  requestChanges(
                    event.id
                  )
                }
                disabled={processing}
              >
                Request changes
              </button>
            )}

            {status ===
              "vp_review" && (
              <button
                type="button"
                className="admin-action-button danger"
                onClick={() =>
                  rejectEvent(
                    event.id
                  )
                }
                disabled={processing}
              >
                Reject
              </button>
            )}
          </>
        )}

        {vicePrincipalCanPublish && (
          <>
            <button
              type="button"
              className="admin-action-button"
              onClick={() =>
                publishEvent(
                  event.id
                )
              }
              disabled={processing}
            >
              {processing
                ? "Publishing..."
                : "Publish"}
            </button>

            <button
              type="button"
              className="admin-action-button"
              onClick={() =>
                requestChanges(
                  event.id
                )
              }
              disabled={processing}
            >
              Request changes
            </button>

            <button
              type="button"
              className="admin-action-button danger"
              onClick={() =>
                rejectEvent(
                  event.id
                )
              }
              disabled={processing}
            >
              Reject
            </button>
          </>
        )}

        {canDeleteEvent() && (
          <button
            type="button"
            className="admin-action-button danger"
            onClick={() =>
              handleDelete(
                event.id
              )
            }
            disabled={processing}
          >
            Delete
          </button>
        )}
      </>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            Event Management
          </span>

          <h1>
            Manage events
          </h1>

          <p>
            Create events, manage approvals,
            assign event staff and control
            publication across the EventHub
            workflow.
          </p>
        </div>

        <div className="admin-page-count">
          <strong>
            {events.length}
          </strong>

          <span>
            Total events
          </span>
        </div>
      </div>

      {error && (
        <div className="admin-inline-error">
          <span>!</span>
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="admin-inline-success">
          <span>✓</span>
          <p>{success}</p>
        </div>
      )}

      <div className="admin-events-layout">
        <section className="admin-editor-card">
          <div className="admin-editor-header">
            <div>
              <span>
                {editingId
                  ? "Editing event"
                  : "New event"}
              </span>

              <h2>
                {editingId
                  ? "Update event"
                  : "Create event"}
              </h2>
            </div>

            {editingId && (
              <button
                type="button"
                className="admin-editor-close"
                onClick={cancelEdit}
                aria-label="Cancel editing"
              >
                ×
              </button>
            )}
          </div>

          <form
            className="admin-event-form"
            onSubmit={handleSubmit}
          >
            <div className="admin-field">
              <label htmlFor="event-title">
                Event title
              </label>

              <input
                id="event-title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Annual Sports Meet"
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="event-category">
                Category
              </label>

              <input
                id="event-category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="Sports, Academic, Exhibition..."
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="event-status">
                Event status
              </label>

              <select
                id="event-status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                {Object.entries(
                  EVENT_STATUS_LABELS
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="admin-form-row">
              <div className="admin-field">
                <label htmlFor="event-capacity">
                  Capacity
                </label>

                <input
                  id="event-capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  value={
                    formData.capacity
                  }
                  onChange={handleChange}
                  placeholder="250"
                />
              </div>

              <div className="admin-field">
                <label htmlFor="event-registration">
                  Registration
                </label>

                <select
                  id="event-registration"
                  name="registration_enabled"
                  value={
                    formData
                      .registration_enabled
                      ? "true"
                      : "false"
                  }
                  onChange={(event) => {
                    setFormData(
                      (current) => ({
                        ...current,
                        registration_enabled:
                          event.target.value ===
                          "true",
                      })
                    );

                    setError("");
                    setSuccess("");
                  }}
                >
                  <option value="true">
                    Enabled
                  </option>

                  <option value="false">
                    Disabled
                  </option>
                </select>
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-field">
                <label htmlFor="event-date">
                  Date
                </label>

                <input
                  id="event-date"
                  name="event_date"
                  type="date"
                  value={
                    formData.event_date
                  }
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="admin-field">
                <label htmlFor="event-time">
                  Time
                </label>

                <input
                  id="event-time"
                  name="event_time"
                  type="time"
                  value={
                    formData.event_time
                  }
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="admin-field">
              <label htmlFor="event-location">
                Location
              </label>

              <input
                id="event-location"
                name="location"
                value={
                  formData.location
                }
                onChange={handleChange}
                placeholder="Main Ground"
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="event-description">
                Description
              </label>

              <textarea
                id="event-description"
                name="description"
                rows="6"
                value={
                  formData.description
                }
                onChange={handleChange}
                placeholder="Add a clear summary of the event..."
              />
            </div>

            <div className="admin-form-actions">
              <button
                type="submit"
                className="btn btn-primary admin-save-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update event"
                    : "Create event"}

                {!saving && (
                  <span>→</span>
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

        <section className="admin-events-panel">
          <div className="admin-events-panel-header">
            <div>
              <span>
                Approval workflow
              </span>

              <h2>
                Current events
              </h2>
            </div>

            <div className="admin-events-search">
              <span>⌕</span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search events..."
              />
            </div>
          </div>

          <div className="admin-events-results">
            <span>
              Showing{" "}
              {filteredEvents.length}{" "}
              of{" "}
              {events.length}
            </span>
          </div>

          {loading ? (
            <LoadingState
              label="Loading events..."
            />
          ) : filteredEvents.length ===
            0 ? (
            <EmptyState
              title={
                search
                  ? "No matching events"
                  : "No events yet"
              }
              description={
                search
                  ? "Try searching with a different title, category, venue or status."
                  : "Create your first event using the form."
              }
            />
          ) : (
            <div className="admin-event-list-new">
              {filteredEvents.map(
                (event) => {
                  const approvalStatus =
                    event.approval_status ||
                    "draft";

                  const publicStatus =
                    event.status ||
                    "upcoming";

                  const assignedCount =
                    getAssignedStaffCount(
                      event.id
                    );

                  return (
                    <article
                      className="admin-event-row-new"
                      key={event.id}
                    >
                      <div className="admin-event-date-block">
                        <strong>
                          {getDay(
                            event.event_date
                          )}
                        </strong>

                        <span>
                          {getMonth(
                            event.event_date
                          )}
                        </span>
                      </div>

                      <div className="admin-event-row-main">
                        <div className="admin-event-row-top">
                          <span className="admin-event-category">
                            {event.category ||
                              "School Event"}
                          </span>

                          <span
                            className={`admin-event-status admin-event-status--${approvalStatus}`}
                          >
                            {STATUS_LABELS[
                              approvalStatus
                            ] ||
                              approvalStatus}
                          </span>

                          <span
                            className={`admin-event-public-status admin-event-public-status--${publicStatus}`}
                          >
                            {EVENT_STATUS_LABELS[
                              publicStatus
                            ] ||
                              publicStatus}
                          </span>

                          <span className="admin-event-id">
                            #
                            {String(
                              event.id
                            ).slice(0, 8)}
                          </span>
                        </div>

                        <h3>
                          {event.title}
                        </h3>

                        <div className="admin-event-row-meta">
                          <span>
                            ◷{" "}
                            {formatEventTime(
                              event.event_time
                            )}
                          </span>

                          <span>
                            ⌖{" "}
                            {event.location ||
                              "Venue TBA"}
                          </span>

                          {event.capacity && (
                            <span>
                              Capacity{" "}
                              {event.capacity}
                            </span>
                          )}

                          <span>
                            {event.registration_enabled
                              ? "Registration open"
                              : "Registration disabled"}
                          </span>

                          {role ===
                            "principal" && (
                            <span>
                              Staff{" "}
                              {assignedCount}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="admin-event-row-actions">
                        {renderWorkflowActions(
                          event
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

      {staffEvent && (
        <div
          className="admin-user-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeStaffManager();
            }
          }}
        >
          <section className="admin-user-modal admin-event-staff-modal">
            <div className="admin-editor-header">
              <div>
                <span>
                  Event Operations
                </span>

                <h2>
                  Assign Event Staff
                </h2>
              </div>

              <button
                type="button"
                className="admin-editor-close"
                onClick={
                  closeStaffManager
                }
                disabled={Boolean(
                  staffSavingId
                )}
                aria-label="Close Event Staff manager"
              >
                ×
              </button>
            </div>

            <div className="admin-event-staff-summary">
              <span>
                Event
              </span>

              <strong>
                {staffEvent.title}
              </strong>

              <p>
                {formatEventDate(
                  staffEvent.event_date
                )}
                {" · "}
                {staffEvent.location ||
                  "Venue TBA"}
              </p>
            </div>

            <div className="admin-event-staff-heading">
              <div>
                <span>
                  Gate access
                </span>

                <h3>
                  Assigned staff
                </h3>
              </div>

              <strong>
                {getAssignedStaffCount(
                  staffEvent.id
                )}
              </strong>
            </div>

            {staffLoading ? (
              <LoadingState
                label="Loading Event Staff..."
              />
            ) : eventStaff.length ===
              0 ? (
              <EmptyState
                title="No Event Staff"
                description="Create an Event Staff CMS account from Users & Roles first."
              />
            ) : (
              <div className="admin-event-staff-list">
                {eventStaff.map(
                  (staff) => {
                    const assigned =
                      isStaffAssigned(
                        staffEvent.id,
                        staff.id
                      );

                    const savingStaff =
                      String(
                        staffSavingId
                      ) ===
                      String(staff.id);

                    return (
                      <article
                        key={staff.id}
                        className={
                          assigned
                            ? "admin-event-staff-row assigned"
                            : "admin-event-staff-row"
                        }
                      >
                        <div className="admin-event-staff-avatar">
                          {getInitials(
                            staff.full_name
                          )}
                        </div>

                        <div className="admin-event-staff-main">
                          <div>
                            <h4>
                              {staff.full_name ||
                                "Event Staff"}
                            </h4>

                            <span
                              className={
                                assigned
                                  ? "admin-event-staff-state assigned"
                                  : "admin-event-staff-state"
                              }
                            >
                              {assigned
                                ? "Assigned"
                                : "Not assigned"}
                            </span>
                          </div>

                          <p>
                            {staff.title ||
                              "Event Staff"}
                          </p>

                          <small>
                            {staff.email}
                          </small>
                        </div>

                        <button
                          type="button"
                          className={
                            assigned
                              ? "admin-action-button danger"
                              : "admin-action-button"
                          }
                          disabled={
                            savingStaff
                          }
                          onClick={() =>
                            toggleStaffAssignment(
                              staff
                            )
                          }
                        >
                          {savingStaff
                            ? "Saving..."
                            : assigned
                              ? "Remove"
                              : "Assign"}
                        </button>
                      </article>
                    );
                  }
                )}
              </div>
            )}

            <div className="admin-event-staff-note">
              <span>i</span>

              <p>
                Only assigned Event Staff can
                verify or check in tickets for
                this event.
              </p>
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}

function normalizeTimeForInput(time) {
  if (!time) {
    return "";
  }

  const match =
    String(time).match(
      /^(\d{2}):(\d{2})/
    );

  if (!match) {
    return "";
  }

  return `${match[1]}:${match[2]}`;
}

function formatEventTime(time) {
  if (!time) {
    return "Time TBA";
  }

  const match =
    String(time).match(
      /^(\d{2}):(\d{2})/
    );

  if (!match) {
    return String(time);
  }

  let hours =
    Number(match[1]);

  const minutes =
    match[2];

  const modifier =
    hours >= 12
      ? "PM"
      : "AM";

  hours =
    hours % 12 || 12;

  return `${hours}:${minutes} ${modifier}`;
}

function getValidEventDate(date) {
  if (!date) {
    return null;
  }

  const value =
    new Date(
      `${date}T00:00:00`
    );

  if (
    Number.isNaN(
      value.getTime()
    )
  ) {
    return null;
  }

  return value;
}

function formatEventDate(date) {
  const value =
    getValidEventDate(date);

  if (!value) {
    return "Date TBA";
  }

  return value.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

function getDay(date) {
  const value =
    getValidEventDate(date);

  if (!value) {
    return "--";
  }

  return value.toLocaleDateString(
    "en-US",
    {
      day: "2-digit",
    }
  );
}

function getMonth(date) {
  const value =
    getValidEventDate(date);

  if (!value) {
    return "TBA";
  }

  return value
    .toLocaleDateString(
      "en-US",
      {
        month: "short",
      }
    )
    .toUpperCase();
}

function getInitials(name) {
  if (!name) {
    return "?";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase()
    )
    .join("");
}

export default AdminEvents;