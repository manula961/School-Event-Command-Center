import { useEffect, useMemo, useState } from "react";

import { supabase } from "../services/supabase";

import PageHeader from "../components/common/PageHeader";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";

function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  useEffect(() => {
    async function fetchAnnouncements() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("published_at", { ascending: false });

      if (error) {
        console.error(error);
        setError("Could not load announcements.");
        setAnnouncements([]);
      } else {
        setAnnouncements(data || []);
      }

      setLoading(false);
    }

    fetchAnnouncements();
  }, []);

  const types = useMemo(() => {
    const values = announcements
      .map((announcement) => announcement.type)
      .filter(Boolean);

    return ["All", ...new Set(values)];
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return announcements.filter((announcement) => {
      const matchesSearch =
        !query ||
        announcement.title?.toLowerCase().includes(query) ||
        announcement.message?.toLowerCase().includes(query) ||
        announcement.type?.toLowerCase().includes(query);

      const matchesType =
        typeFilter === "All" ||
        announcement.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [announcements, search, typeFilter]);

  const featuredAnnouncement =
    filteredAnnouncements.length > 0
      ? filteredAnnouncements[0]
      : null;

  const remainingAnnouncements =
    filteredAnnouncements.slice(1);

  function formatDate(date) {
    if (!date) return "Date unavailable";

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-US",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function getTypeClass(type) {
    const normalized = type?.toLowerCase();

    if (normalized === "important") return "important";
    if (normalized === "registration") return "registration";
    if (normalized === "reminder") return "reminder";

    return "update";
  }

  if (loading) {
    return (
      <main>
        <LoadingState label="Loading announcements..." />
      </main>
    );
  }

  return (
    <main>
      <PageHeader
        eyebrow="Latest updates"
        title="Announcements"
        description="Important notices, registration updates and event changes from across the school."
      >
        <div className="announcements-header-metrics">
          <div>
            <strong>{announcements.length}</strong>
            <span>Total updates</span>
          </div>

          <div>
            <strong>
              {
                announcements.filter(
                  (item) =>
                    item.type?.toLowerCase() === "important"
                ).length
              }
            </strong>
            <span>Important</span>
          </div>
        </div>
      </PageHeader>

      <section className="announcements-page-section">
        <div className="container">
          {error && (
            <div className="admin-inline-error">
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          <div className="announcements-toolbar-new">
            <div className="announcements-search">
              <span>⌕</span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search announcements..."
              />
            </div>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value)
              }
              aria-label="Filter announcements by type"
            >
              {types.map((type) => (
                <option key={type} value={type}>
                  {type === "All"
                    ? "All announcement types"
                    : type}
                </option>
              ))}
            </select>
          </div>

          <div className="announcements-results">
            <span>
              Showing {filteredAnnouncements.length} of{" "}
              {announcements.length} announcements
            </span>
          </div>

          {filteredAnnouncements.length === 0 ? (
            <EmptyState
              title="No announcements found"
              description="Try changing your search or announcement type."
            />
          ) : (
            <>
              {featuredAnnouncement && (
                <article className="announcement-featured">
                  <div className="announcement-featured-accent" />

                  <div className="announcement-featured-content">
                    <div className="announcement-featured-top">
                      <span
                        className={`announcement-public-type ${getTypeClass(
                          featuredAnnouncement.type
                        )}`}
                      >
                        {featuredAnnouncement.type || "Update"}
                      </span>

                      <time>
                        {formatDate(
                          featuredAnnouncement.published_at
                        )}
                      </time>
                    </div>

                    <span className="announcement-featured-label">
                      Latest announcement
                    </span>

                    <h2>{featuredAnnouncement.title}</h2>

                    <p>{featuredAnnouncement.message}</p>
                  </div>
                </article>
              )}

              {remainingAnnouncements.length > 0 && (
                <div className="announcement-feed-heading">
                  <span>More updates</span>
                  <h2>Recent announcements</h2>
                </div>
              )}

              <div className="announcement-public-list">
                {remainingAnnouncements.map(
                  (announcement, index) => (
                    <article
                      className="announcement-public-card"
                      key={announcement.id}
                    >
                      <div className="announcement-public-number">
                        {String(index + 2).padStart(2, "0")}
                      </div>

                      <div className="announcement-public-main">
                        <div className="announcement-public-top">
                          <span
                            className={`announcement-public-type ${getTypeClass(
                              announcement.type
                            )}`}
                          >
                            {announcement.type || "Update"}
                          </span>

                          <time>
                            {formatDate(
                              announcement.published_at
                            )}
                          </time>
                        </div>

                        <h3>{announcement.title}</h3>

                        <p>{announcement.message}</p>
                      </div>

                      <span className="announcement-public-arrow">
                        →
                      </span>
                    </article>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default Announcements;