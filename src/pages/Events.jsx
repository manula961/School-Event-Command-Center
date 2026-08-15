import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../services/supabase";
import { refreshEventLifecycle } from "../utils/eventLifecycle";

import EventCard from "../components/events/EventCard";
import PageHeader from "../components/common/PageHeader";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";


function Events() {
  const [
    events,
    setEvents,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    category,
    setCategory,
  ] = useState("All");


  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      setError("");


      await refreshEventLifecycle();


      const {
        data,
        error,
      } = await supabase
        .from("events")
        .select("*")
        .order(
          "event_date",
          {
            ascending: true,
          }
        );


      if (error) {
        console.error(
          error
        );

        setError(
          "Could not load events."
        );

        setEvents([]);
      } else {
        setEvents(
          data || []
        );
      }


      setLoading(false);
    }


    fetchEvents();
  }, []);


  const categories =
    useMemo(() => {
      const values =
        events
          .map(
            (event) =>
              event.category
          )
          .filter(Boolean);


      return [
        "All",
        ...new Set(
          values
        ),
      ];
    }, [
      events,
    ]);


  const filteredEvents =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();


      return events.filter(
        (event) => {
          const matchesSearch =
            !query ||
            event.title
              ?.toLowerCase()
              .includes(
                query
              ) ||
            event.description
              ?.toLowerCase()
              .includes(
                query
              ) ||
            event.location
              ?.toLowerCase()
              .includes(
                query
              ) ||
            event.category
              ?.toLowerCase()
              .includes(
                query
              );


          const matchesCategory =
            category ===
              "All" ||
            event.category ===
              category;


          return (
            matchesSearch &&
            matchesCategory
          );
        }
      );
    }, [
      events,
      search,
      category,
    ]);


  const upcomingCount =
    useMemo(() => {
      const now =
        new Date();


      return events.filter(
        (event) => {
          if (
            !event.event_date
          ) {
            return false;
          }


          const eventEnd =
            new Date(
              `${event.event_date}T23:59:59`
            );


          return (
            eventEnd >= now
          );
        }
      ).length;
    }, [
      events,
    ]);


  return (
    <main>

      <PageHeader
        eyebrow="Discover"
        title="All events"
        description="Explore competitions, sports meets, exhibitions and other school events from one place."
      >

        <div className="events-header-stats">

          <div>

            <strong>
              {events.length}
            </strong>

            <span>
              Total events
            </span>

          </div>


          <div>

            <strong>
              {upcomingCount}
            </strong>

            <span>
              Upcoming
            </span>

          </div>

        </div>

      </PageHeader>


      <section className="events-browser">

        <div className="container">

          <div className="events-toolbar">

            <div className="events-search">

              <span className="events-search-icon">
                ⌕
              </span>


              <input
                type="search"
                placeholder="Search events, categories, venues..."
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
              />

            </div>


            <div className="events-filter-group">

              <select
                value={
                  category
                }
                onChange={(
                  event
                ) =>
                  setCategory(
                    event.target
                      .value
                  )
                }
                aria-label="Filter by category"
              >

                {categories.map(
                  (item) => (
                    <option
                      key={
                        item
                      }
                      value={
                        item
                      }
                    >
                      {item ===
                      "All"
                        ? "All categories"
                        : item}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>


          <div className="events-results-bar">

            <div>

              <strong>
                {
                  filteredEvents
                    .length
                }
              </strong>

              <span>
                {filteredEvents
                  .length === 1
                  ? "event found"
                  : "events found"}
              </span>

            </div>


            {(search ||
              category !==
                "All") && (
              <button
                type="button"
                className="events-clear"
                onClick={() => {
                  setSearch("");
                  setCategory(
                    "All"
                  );
                }}
              >
                Clear filters
              </button>
            )}

          </div>


          {loading ? (
            <LoadingState
              label="Loading events..."
            />
          ) : error ? (
            <div className="admin-inline-error">

              <span>
                !
              </span>

              <p>
                {error}
              </p>

            </div>
          ) : filteredEvents
              .length ===
            0 ? (
            <EmptyState
              title={
                search ||
                category !==
                  "All"
                  ? "No matching events"
                  : "No events yet"
              }
              description={
                search ||
                category !==
                  "All"
                  ? "Try changing your search or category filter."
                  : "Upcoming school events will appear here."
              }
            />
          ) : (
            <div className="events-page-grid">

              {filteredEvents.map(
                (
                  event,
                  index
                ) => (
                  <EventCard
                    key={
                      event.id
                    }
                    event={
                      event
                    }
                    accent={
                      index %
                        3 ===
                      0
                        ? "navy"
                        : index %
                              3 ===
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

    </main>
  );
}


export default Events;