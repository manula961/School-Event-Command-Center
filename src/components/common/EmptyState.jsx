function EmptyState({
  title = "Nothing here yet",
  description = "Content will appear here when it becomes available.",
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        +
      </div>

      <h3>{title}</h3>

      <p>{description}</p>
    </div>
  );
}

export default EmptyState;