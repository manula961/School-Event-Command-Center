function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && (
          <span className="section-kicker">
            {eyebrow}
          </span>
        )}

        <h2 className="section-heading">
          {title}
        </h2>

        {description && (
          <p className="section-description">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="section-header-action">
          {action}
        </div>
      )}
    </div>
  );
}

export default SectionHeader;