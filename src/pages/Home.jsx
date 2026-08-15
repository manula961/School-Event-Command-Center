import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  supabase,
} from "../services/supabase";

import {
  refreshEventLifecycle,
} from "../utils/eventLifecycle";

import EventCard from "../components/events/EventCard";
import SectionHeader from "../components/common/SectionHeader";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";


function getEventDate(
  event
) {
  return (
    event.event_date ||
    event.date ||
    event.start_date ||
    event.start_time ||
    null
  );
}


function Home() {
  const [
    events,
    setEvents,
  ] = useState([]);

  const [
    announcements,
    setAnnouncements,
  ] = useState([]);

  const [
    loadingEvents,
    setLoadingEvents,
  ] = useState(true);

  const [
    loadingAnnouncements,
    setLoadingAnnouncements,
  ] = useState(true);


  useEffect(() => {
    async function loadEvents() {
      setLoadingEvents(
        true
      );


      await refreshEventLifecycle();


      const {
        data,
        error,
      } = await supabase
        .from("events")
        .select("*")
        .in(
          "approval_status",
          [
            "published",
            "live",
            "completed",
          ]
        )
        .order(
          "event_date",
          {
            ascending: true,
          }
        );


      if (error) {
        console.error(
          "Could not load events:",
          error
        );

        setEvents([]);
        setLoadingEvents(
          false
        );

        return;
      }


      const sorted =
        [
          ...(data || []),
        ].sort(
          (
            a,
            b
          ) => {
            const aDate =
              getEventDate(
                a
              );

            const bDate =
              getEventDate(
                b
              );


            if (!aDate) {
              return 1;
            }


            if (!bDate) {
              return -1;
            }


            return (
              new Date(
                aDate
              ) -
              new Date(
                bDate
              )
            );
          }
        );


      setEvents(
        sorted
      );

      setLoadingEvents(
        false
      );
    }


    async function loadAnnouncements() {
      setLoadingAnnouncements(
        true
      );


      const {
        data,
        error,
      } = await supabase
        .from(
          "announcements"
        )
        .select("*")
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(3);


      if (error) {
        console.error(
          "Could not load announcements:",
          error
        );

        setAnnouncements(
          []
        );

        setLoadingAnnouncements(
          false
        );

        return;
      }


      setAnnouncements(
        data || []
      );

      setLoadingAnnouncements(
        false
      );
    }


    loadEvents();
    loadAnnouncements();
  }, []);


  const upcomingEvents =
    useMemo(() => {
      const now =
        new Date();


      return events
        .filter(
          (event) => {
            const date =
              getEventDate(
                event
              );


            if (!date) {
              return false;
            }


            const eventEnd =
              new Date(
                `${date}T23:59:59`
              );


            return (
              eventEnd >=
                now &&
              ![
                "completed",
                "cancelled",
              ].includes(
                event.status
              )
            );
          }
        )
        .slice(
          0,
          3
        );
    }, [
      events,
    ]);


  const liveEvents =
    useMemo(() => {
      return events.filter(
        (event) =>
          event.status
            ?.toLowerCase() ===
          "live"
      );
    }, [
      events,
    ]);


  const totalUpcomingCount =
    useMemo(() => {
      const now =
        new Date();


      return events.filter(
        (event) => {
          const date =
            getEventDate(
              event
            );


          if (!date) {
            return false;
          }


          const eventEnd =
            new Date(
              `${date}T23:59:59`
            );


          return (
            eventEnd >= now &&
            ![
              "completed",
              "cancelled",
            ].includes(
              event.status
            )
          );
        }
      ).length;
    }, [
      events,
    ]);


  return (
    <main>

      <section className="home-hero">

        <div className="home-hero-glow home-hero-glow-one" />
        <div className="home-hero-glow home-hero-glow-two" />


        <div className="container home-hero-grid">

          <div className="home-hero-copy">

            <div className="home-eyebrow">

              <span />

              School Event Command Center

            </div>


            <h1>
              Every event.
              <br />

              <span>
                One place.
              </span>
            </h1>


            <p>
              Discover school events,
              register online, follow
              schedules and stay connected
              with announcements and live
              updates.
            </p>


            <div className="home-hero-actions">

              <Link
                to="/events"
                className="btn btn-primary home-main-button"
              >
                Explore events

                <span>
                  →
                </span>
              </Link>


              <Link
                to="/calendar"
                className="btn btn-outline"
              >
                View calendar
              </Link>

            </div>


            <div className="home-hero-stats">

              <div>

                <strong>
                  {events.length}
                </strong>

                <span>
                  Events
                </span>

              </div>


              <div className="hero-stat-divider" />


              <div>

                <strong>
                  {totalUpcomingCount}
                </strong>

                <span>
                  Upcoming
                </span>

              </div>


              <div className="hero-stat-divider" />


              <div>

                <strong>
                  {liveEvents.length}
                </strong>

                <span>
                  Live now
                </span>

              </div>

            </div>

          </div>


          <div className="home-preview">

            <div className="preview-card">

              <div className="preview-toolbar">

                <div className="preview-dots">
                  <span />
                  <span />
                  <span />
                </div>

                <span>
                  Event overview
                </span>

              </div>


              <div className="preview-content">

                <div className="preview-heading">

                  <div>

                    <span>
                      Command center
                    </span>

                    <h3>
                      Today&apos;s activity
                    </h3>

                  </div>


                  <div className="preview-live">

                    <span />

                    Live

                  </div>

                </div>


                <div className="preview-metrics">

                  <div>

                    <span>
                      Upcoming
                    </span>

                    <strong>
                      {String(
                        totalUpcomingCount
                      ).padStart(
                        2,
                        "0"
                      )}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Live
                    </span>

                    <strong>
                      {String(
                        liveEvents.length
                      ).padStart(
                        2,
                        "0"
                      )}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Total
                    </span>

                    <strong>
                      {String(
                        events.length
                      ).padStart(
                        2,
                        "0"
                      )}
                    </strong>

                  </div>

                </div>


                <div className="preview-schedule">

                  <div className="preview-schedule-label">
                    Upcoming schedule
                  </div>


                  {upcomingEvents
                    .slice(
                      0,
                      2
                    )
                    .map(
                      (
                        event,
                        index
                      ) => (
                        <Link
                          key={
                            event.id
                          }
                          to={`/events/${event.id}`}
                          className="preview-event"
                        >

                          <span
                            className={
                              `preview-event-line ${
                                index ===
                                1
                                  ? "cyan"
                                  : ""
                              }`
                            }
                          />


                          <div>

                            <strong>
                              {
                                event.title
                              }
                            </strong>

                            <span>
                              {event
                                .location ||
                                event
                                  .venue ||
                                "School event"}
                            </span>

                          </div>


                          <span className="preview-event-arrow">
                            →
                          </span>

                        </Link>
                      )
                    )}

                </div>


                <div className="preview-bottom">

                  <div>

                    <span>
                      Platform status
                    </span>

                    <strong>
                      All systems active
                    </strong>

                  </div>


                  <span className="preview-status-dot" />

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>


      {liveEvents.length >
        0 && (
        <section className="home-live-strip">

          <div className="container home-live-inner">

            <div>

              <span className="home-live-pulse" />

              <strong>
                Live now
              </strong>

              <span>
                {
                  liveEvents[0]
                    .title
                }
              </span>

            </div>


            <Link
              to={`/events/${liveEvents[0].id}`}
            >
              Follow event

              <span>
                →
              </span>
            </Link>

          </div>

        </section>
      )}


      <section className="page-section home-events-section">

        <div className="container">

          <SectionHeader
            eyebrow="Coming up"
            title="Upcoming events"
            description="Explore the latest school activities, competitions, exhibitions and special events."
            action={
              <Link
                to="/events"
                className="home-text-link"
              >
                View all events

                <span>
                  →
                </span>
              </Link>
            }
          />


          {loadingEvents ? (
            <LoadingState
              label="Loading events..."
            />
          ) : upcomingEvents
              .length ===
            0 ? (
            <EmptyState
              title="No upcoming events"
              description="New events will appear here when they are published."
            />
          ) : (
            <div className="home-events-grid">

              {upcomingEvents.map(
                (
                  event,
                  index
                ) => (
                  <EventCard
                    key={
                      event.id
                    }
                    event={{
                      ...event,

                      event_date:
                        getEventDate(
                          event
                        ),
                    }}
                    accent={
                      index === 0
                        ? "navy"
                        : index ===
                            1
                          ? "red"
                          : "cyan"
                    }
                  />
                )
              )}

            </div>
          )}

        </div>

      </section>


      <section className="home-command">

        <div className="container home-command-grid">

          <div className="home-command-copy">

            <span className="home-command-eyebrow">
              Built for everyone
            </span>


            <h2>
              Your school,
              <br />
              synchronized.
            </h2>


            <p>
              Students, teachers and parents
              can access everything they need
              without searching across
              multiple channels.
            </p>


            <Link
              to="/events"
              className="btn home-command-button"
            >
              Browse all events

              <span>
                →
              </span>
            </Link>

          </div>


          <div className="home-command-features">

            <div className="command-feature">

              <span>
                01
              </span>

              <div>

                <h3>
                  Event discovery
                </h3>

                <p>
                  Find upcoming events with
                  dates, locations and complete
                  event details.
                </p>

              </div>

            </div>


            <div className="command-feature">

              <span>
                02
              </span>

              <div>

                <h3>
                  Online registration
                </h3>

                <p>
                  Register for eligible events
                  directly through the
                  platform.
                </p>

              </div>

            </div>


            <div className="command-feature">

              <span>
                03
              </span>

              <div>

                <h3>
                  Interactive calendar
                </h3>

                <p>
                  See school activities
                  organized clearly across the
                  academic calendar.
                </p>

              </div>

            </div>


            <div className="command-feature">

              <span>
                04
              </span>

              <div>

                <h3>
                  Live updates
                </h3>

                <p>
                  Follow important
                  announcements and event
                  highlights as they happen.
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>


      <section className="page-section home-updates">

        <div className="container">

          <SectionHeader
            eyebrow="Stay informed"
            title="Latest announcements"
            description="Important information and updates from events around the school."
            action={
              <Link
                to="/announcements"
                className="home-text-link"
              >
                View all updates

                <span>
                  →
                </span>
              </Link>
            }
          />


          {loadingAnnouncements ? (
            <LoadingState
              label="Loading announcements..."
            />
          ) : announcements
              .length ===
            0 ? (
            <EmptyState
              title="No announcements yet"
              description="Important updates will appear here."
            />
          ) : (
            <div className="home-announcement-list">

              {announcements.map(
                (
                  announcement,
                  index
                ) => (
                  <article
                    className="home-announcement"
                    key={
                      announcement.id
                    }
                  >

                    <div className="announcement-index">
                      {String(
                        index +
                          1
                      ).padStart(
                        2,
                        "0"
                      )}
                    </div>


                    <div className="announcement-copy">

                      <span>
                        {announcement
                          .category ||
                          "Announcement"}
                      </span>

                      <h3>
                        {
                          announcement
                            .title
                        }
                      </h3>

                      <p>
                        {announcement
                          .content ||
                          announcement
                            .description ||
                          announcement
                            .message ||
                          ""}
                      </p>

                    </div>


                    <Link
                      to="/announcements"
                      className="announcement-arrow"
                    >
                      →
                    </Link>

                  </article>
                )
              )}

            </div>
          )}

        </div>

      </section>


      <section className="home-final-section">

        <div className="container">

          <div className="home-final-card">

            <div>

              <span>
                Ready to explore?
              </span>

              <h2>
                Find your next school
                event.
              </h2>

              <p>
                Browse upcoming events and
                stay connected with
                everything happening around
                school.
              </p>

            </div>


            <Link
              to="/events"
              className="btn btn-primary"
            >
              Explore events

              <span>
                →
              </span>
            </Link>

          </div>

        </div>

      </section>

    </main>
  );
}


export default Home;