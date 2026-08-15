function EventStatus({ status = "Upcoming" }) {
  const normalized = status.toLowerCase();

  const classMap = {
    upcoming: "status-upcoming",
    open: "status-open",
    live: "status-live",
    closed: "status-closed",
    completed: "status-completed",
  };

  const className =
    classMap[normalized] || "status-upcoming";

  return (
    <span className={`status-pill ${className}`}>
      {status}
    </span>
  );
}

export default EventStatus;