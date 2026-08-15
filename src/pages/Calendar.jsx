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

import PageHeader from "../components/common/PageHeader";
import LoadingState from "../components/common/LoadingState";
import EmptyState from "../components/common/EmptyState";


function Calendar() {
  const [
    events,
    setEvents,
  ] = useState([]);

  const [
    selectedEvent,
    setSelectedEvent,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    viewDate,
    setViewDate,
  ] = useState(
    new Date()
  );


  useEffect(() => {
    async function fetchEvents() {
      setLoading(
        true
      );


      try {
        await refreshEventLifecycle();
      } catch (
        lifecycleError
      ) {
        console.error(
          "Could not refresh event lifecycle:",
          lifecycleError
        );
      }


      const {
        data,
        error,
      } = await supabase
        .from("events")
        .select("*")
        .eq(
          "approval_status",
          "published"
        )
        .order(
          "event_date",
          {
            ascending:
              true,
          }
        );


      if (error) {
        console.error(
          error
        );

        setEvents([]);
        setSelectedEvent(
          null
        );
      } else {
        const publicEvents =
          (data || [])
            .filter(
              (event) =>
                ![
                  "cancelled",
                ].includes(
                  event.status
                )
            );


        setEvents(
          publicEvents
        );


        if (
          publicEvents.length >
          0
        ) {
          setSelectedEvent(
            publicEvents[0]
          );


          const firstDate =
            new Date(
              `${publicEvents[0].event_date}T00:00:00`
            );


          if (
            !Number.isNaN(
              firstDate.getTime()
            )
          ) {
            setViewDate(
              firstDate
            );
          }
        } else {
          setSelectedEvent(
            null
          );
        }
      }


      setLoading(
        false
      );
    }


    fetchEvents();
  }, []);


  const currentYear =
    viewDate.getFullYear();

  const currentMonth =
    viewDate.getMonth();


  const calendarDays =
    useMemo(() => {
      const firstDay =
        new Date(
          currentYear,
          currentMonth,
          1
        );


      const lastDay =
        new Date(
          currentYear,
          currentMonth +
            1,
          0
        );


      const days = [];


      const startOffset =
        firstDay.getDay();


      for (
        let i = 0;
        i < startOffset;
        i += 1
      ) {
        days.push({
          type:
            "empty",

          key:
            `empty-${i}`,
        });
      }


      for (
        let day = 1;
        day <=
        lastDay.getDate();
        day += 1
      ) {
        const date =
          new Date(
            currentYear,
            currentMonth,
            day
          );


        const isoDate =
          toLocalISO(
            date
          );


        const dayEvents =
          events.filter(
            (event) =>
              event.event_date ===
              isoDate
          );


        days.push({
          type:
            "day",

          key:
            isoDate,

          day,

          date,

          events:
            dayEvents,
        });
      }


      return days;
    }, [
      events,
      currentMonth,
      currentYear,
    ]);


  const monthEvents =
    useMemo(() => {
      return events.filter(
        (event) => {
          if (
            !event.event_date
          ) {
            return false;
          }


          const date =
            new Date(
              `${event.event_date}T00:00:00`
            );


          return (
            date.getFullYear() ===
              currentYear &&
            date.getMonth() ===
              currentMonth
          );
        }
      );
    }, [
      events,
      currentMonth,
      currentYear,
    ]);


  function previousMonth() {
    setViewDate(
      new Date(
        currentYear,
        currentMonth -
          1,
        1
      )
    );
  }


  function nextMonth() {
    setViewDate(
      new Date(
        currentYear,
        currentMonth +
          1,
        1
      )
    );
  }


  function goToday() {
    setViewDate(
      new Date()
    );
  }


  if (
    loading
  ) {
    return (
      <main>

        <LoadingState
          label="Loading calendar..."
        />

      </main>
    );
  }


  return (
    <main>

      <PageHeader
        eyebrow="Schedule"
        title="Event calendar"
        description="Explore school events by date, move between months and select an event to view its details."
      >

        <div className="calendar-header-metrics">

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
              {monthEvents.length}
            </strong>

            <span>
              This month
            </span>

          </div>

        </div>

      </PageHeader>


      <section className="calendar-page-section">

        <div className="container">

          {events.length ===
          0 ? (
            <EmptyState
              title="No events scheduled"
              description="Events will appear on the calendar once they are published."
            />
          ) : (
            <div className="calendar-page-grid">

              <section className="calendar-main-card">

                <div className="calendar-toolbar">

                  <div>

                    <span>
                      Monthly schedule
                    </span>

                    <h2>
                      {viewDate.toLocaleDateString(
                        "en-US",
                        {
                          month:
                            "long",

                          year:
                            "numeric",
                        }
                      )}
                    </h2>

                  </div>


                  <div className="calendar-toolbar-actions">

                    <button
                      type="button"
                      className="calendar-today-button"
                      onClick={
                        goToday
                      }
                    >
                      Today
                    </button>


                    <button
                      type="button"
                      className="calendar-nav-button"
                      onClick={
                        previousMonth
                      }
                      aria-label="Previous month"
                    >
                      ←
                    </button>


                    <button
                      type="button"
                      className="calendar-nav-button"
                      onClick={
                        nextMonth
                      }
                      aria-label="Next month"
                    >
                      →
                    </button>

                  </div>

                </div>


                <div className="calendar-weekdays">

                  {[
                    "Sun",
                    "Mon",
                    "Tue",
                    "Wed",
                    "Thu",
                    "Fri",
                    "Sat",
                  ].map(
                    (day) => (
                      <div
                        key={
                          day
                        }
                      >
                        {day}
                      </div>
                    )
                  )}

                </div>


                <div className="calendar-month-grid">

                  {calendarDays.map(
                    (item) => {
                      if (
                        item.type ===
                        "empty"
                      ) {
                        return (
                          <div
                            key={
                              item.key
                            }
                            className="calendar-cell calendar-cell-empty"
                          />
                        );
                      }


                      const isToday =
                        isSameDay(
                          item.date,
                          new Date()
                        );


                      return (
                        <div
                          key={
                            item.key
                          }
                          className={
                            `calendar-cell ${
                              isToday
                                ? "calendar-cell-today"
                                : ""
                            }`
                          }
                        >

                          <div className="calendar-cell-number">
                            {
                              item.day
                            }
                          </div>


                          <div className="calendar-cell-events">

                            {item.events
                              .slice(
                                0,
                                2
                              )
                              .map(
                                (
                                  event,
                                  index
                                ) => (
                                  <button
                                    type="button"
                                    key={
                                      event.id
                                    }
                                    className={
                                      `calendar-mini-event calendar-mini-event-${
                                        (
                                          index %
                                          3
                                        ) +
                                        1
                                      }`
                                    }
                                    onClick={() =>
                                      setSelectedEvent(
                                        event
                                      )
                                    }
                                  >
                                    <span>
                                      {
                                        event.title
                                      }
                                    </span>
                                  </button>
                                )
                              )}


                            {item.events
                              .length >
                              2 && (
                              <span className="calendar-more-events">
                                +
                                {item.events
                                  .length -
                                  2}{" "}
                                more
                              </span>
                            )}

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </section>


              <aside className="calendar-side-panel">

                {selectedEvent ? (
                  <>

                    <div className="calendar-selected-top">

                      <span>
                        {selectedEvent
                          .category ||
                          "School Event"}
                      </span>

                      <strong>
                        {formatDate(
                          selectedEvent
                            .event_date
                        )}
                      </strong>

                    </div>


                    <h2>
                      {
                        selectedEvent
                          .title
                      }
                    </h2>


                    <p>
                      {selectedEvent
                        .description ||
                        "More information about this event will be available soon."}
                    </p>


                    <div className="calendar-selected-meta">

                      <div>

                        <span>
                          Time
                        </span>

                        <strong>
                          {formatEventTime(
                            selectedEvent
                              .event_time
                          )}
                        </strong>

                      </div>


                      <div>

                        <span>
                          Venue
                        </span>

                        <strong>
                          {selectedEvent
                            .location ||
                            "TBA"}
                        </strong>

                      </div>


                      <div>

                        <span>
                          Status
                        </span>

                        <strong>
                          {formatEventStatus(
                            selectedEvent
                              .status
                          )}
                        </strong>

                      </div>

                    </div>


                    <Link
                      to={`/events/${selectedEvent.id}`}
                      className="btn btn-primary btn-full"
                    >
                      View event

                      <span>
                        →
                      </span>
                    </Link>

                  </>
                ) : (
                  <div className="calendar-side-empty">

                    <div>
                      +
                    </div>

                    <h3>
                      Select an event
                    </h3>

                    <p>
                      Choose an event from
                      the calendar to preview
                      its details.
                    </p>

                  </div>
                )}

              </aside>

            </div>
          )}

        </div>

      </section>

    </main>
  );
}


function toLocalISO(
  date
) {
  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return `${year}-${month}-${day}`;
}


function isSameDay(
  a,
  b
) {
  return (
    a.getFullYear() ===
      b.getFullYear() &&
    a.getMonth() ===
      b.getMonth() &&
    a.getDate() ===
      b.getDate()
  );
}


function formatDate(
  date
) {
  if (!date) {
    return "Date TBA";
  }


  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString(
    "en-US",
    {
      month:
        "long",

      day:
        "numeric",

      year:
        "numeric",
    }
  );
}


function formatEventTime(
  time
) {
  if (!time) {
    return "Time TBA";
  }


  const match =
    String(
      time
    ).match(
      /^(\d{2}):(\d{2})/
    );


  if (!match) {
    return String(
      time
    );
  }


  let hours =
    Number(
      match[1]
    );


  const minutes =
    match[2];


  const modifier =
    hours >= 12
      ? "PM"
      : "AM";


  hours =
    hours %
      12 ||
    12;


  return `${hours}:${minutes} ${modifier}`;
}


function formatEventStatus(
  status
) {
  const labels = {
    upcoming:
      "Upcoming",

    registration_open:
      "Registration Open",

    sold_out:
      "Sold Out",

    live:
      "Live",

    completed:
      "Completed",

    postponed:
      "Postponed",

    cancelled:
      "Cancelled",
  };


  return (
    labels[
      status
    ] ||
    "Upcoming"
  );
}


export default Calendar;