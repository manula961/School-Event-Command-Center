function LoadingState({ label = "Loading..." }) {
  return (
    <div className="loading-state">
      <span className="loading-spinner" />

      <span>{label}</span>
    </div>
  );
}

export default LoadingState;