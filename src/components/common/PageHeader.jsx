function PageHeader({
  eyebrow,
  title,
  description,
  children,
}) {
  return (
    <section className="page-header">
      <div className="container">
        <div className="page-header-content">
          {eyebrow && (
            <span className="section-kicker">
              {eyebrow}
            </span>
          )}

          <h1>{title}</h1>

          {description && (
            <p>{description}</p>
          )}

          {children}
        </div>
      </div>
    </section>
  );
}

export default PageHeader;