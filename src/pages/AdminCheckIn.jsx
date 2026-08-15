import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Html5Qrcode,
} from "html5-qrcode";

import { supabase } from "../services/supabase";

import AdminLayout from "../components/layout/AdminLayout";


const SCANNER_ID =
  "eventhub-checkin-reader";


function AdminCheckIn() {
  const scannerRef =
    useRef(null);

  const scanningRef =
    useRef(false);

  const scanLockedRef =
    useRef(false);


  const [
    ticketCode,
    setTicketCode,
  ] = useState("");

  const [
    registration,
    setRegistration,
  ] = useState(null);

  const [
    recentCheckIns,
    setRecentCheckIns,
  ] = useState([]);

  const [
    searching,
    setSearching,
  ] = useState(false);

  const [
    checkingIn,
    setCheckingIn,
  ] = useState(false);

  const [
    recentLoading,
    setRecentLoading,
  ] = useState(true);

  const [
    scannerStarting,
    setScannerStarting,
  ] = useState(false);

  const [
    scannerActive,
    setScannerActive,
  ] = useState(false);

  const [
    scannerError,
    setScannerError,
  ] = useState("");

  const [
    recentError,
    setRecentError,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");


  const checkedInTime =
    useMemo(() => {
      if (
        !registration
          ?.checked_in_at
      ) {
        return null;
      }

      const date =
        new Date(
          registration
            .checked_in_at
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return null;
      }

      return date.toLocaleString(
        "en-US",
        {
          year:
            "numeric",
          month:
            "short",
          day:
            "numeric",
          hour:
            "numeric",
          minute:
            "2-digit",
        }
      );
    }, [
      registration,
    ]);


  useEffect(() => {
    fetchRecentCheckIns();

    return () => {
      stopScannerSilently();
    };
  }, []);


  async function fetchRecentCheckIns() {
    setRecentLoading(true);
    setRecentError("");

    const {
      data,
      error:
        recentCheckInError,
    } = await supabase
      .rpc(
        "recent_checkins",
        {
          p_limit: 10,
          p_event_id: null,
        }
      );

    if (
      recentCheckInError
    ) {
      console.error(
        "Could not load recent check-ins:",
        recentCheckInError
      );

      setRecentError(
        "Could not load recent check-ins."
      );

      setRecentCheckIns([]);
      setRecentLoading(false);

      return;
    }

    setRecentCheckIns(
      data || []
    );

    setRecentLoading(false);
  }


  function resetResult() {
    setRegistration(null);
    setError("");
    setSuccess("");
  }


  function normalizeTicketCode(
    value
  ) {
    return String(
      value || ""
    )
      .trim()
      .toUpperCase();
  }


  function mapTicketRecord(
    record
  ) {
    if (!record) {
      return null;
    }

    return {
      id:
        record.id,

      created_at:
        record.created_at,

      name:
        record.name,

      email:
        record.email,

      ticket_code:
        record.ticket_code,

      checked_in:
        record.checked_in,

      checked_in_at:
        record.checked_in_at,

      checked_in_by:
        record.checked_in_by,

      event_id:
        record.event_id,

      student_user_id:
        record.student_user_id,

      events: {
        id:
          record.event_id,

        title:
          record.event_title,

        category:
          record.event_category,

        event_date:
          record.event_date,

        event_time:
          record.event_time,

        location:
          record.event_location,

        status:
          record.event_status,
      },
    };
  }


  function handleTicketChange(
    event
  ) {
    setTicketCode(
      event.target.value
        .toUpperCase()
    );

    if (
      registration ||
      error ||
      success
    ) {
      resetResult();
    }
  }


  async function findRegistration(
    rawCode
  ) {
    const code =
      normalizeTicketCode(
        rawCode
      );

    if (!code) {
      setError(
        "Enter a ticket code."
      );

      setRegistration(null);
      setSuccess("");

      return null;
    }

    setSearching(true);
    setError("");
    setSuccess("");
    setRegistration(null);

    const {
      data: rows,
      error:
        searchError,
    } = await supabase
      .rpc(
        "verify_ticket",
        {
          p_ticket_code:
            code,
        }
      );

    if (
      searchError
    ) {
      console.error(
        "Ticket lookup failed:",
        searchError
      );

      const message =
        (
          searchError.message ||
          ""
        ).toLowerCase();

      if (
        message.includes(
          "permission"
        )
      ) {
        setError(
          "You are not assigned to verify tickets for this event."
        );
      } else if (
        message.includes(
          "unauthorized"
        ) ||
        message.includes(
          "authentication"
        )
      ) {
        setError(
          "Your account is not authorized to verify tickets."
        );
      } else {
        setError(
          "Could not verify this ticket."
        );
      }

      setSearching(false);

      return null;
    }

    const record =
      Array.isArray(
        rows
      )
        ? rows[0]
        : rows;

    if (
      !record
    ) {
      setError(
        "No registration was found for this ticket code."
      );

      setSearching(false);

      return null;
    }

    const data =
      mapTicketRecord(
        record
      );

    setTicketCode(
      data.ticket_code
    );

    setRegistration(
      data
    );

    setSearching(false);

    return data;
  }


  async function handleSearch(
    event
  ) {
    event.preventDefault();

    await stopScanner();

    await findRegistration(
      ticketCode
    );
  }


  async function startScanner() {
    if (
      scannerStarting ||
      scannerActive
    ) {
      return;
    }

    setScannerStarting(true);
    setScannerError("");
    setError("");
    setSuccess("");

    scanLockedRef.current =
      false;

    try {
      if (
        !scannerRef.current
      ) {
        scannerRef.current =
          new Html5Qrcode(
            SCANNER_ID
          );
      }

      await scannerRef.current
        .start(
          {
            facingMode:
              "environment",
          },
          {
            fps:
              10,
            qrbox: {
              width:
                240,
              height:
                240,
            },
            aspectRatio:
              1,
          },
          async (
            decodedText
          ) => {
            if (
              scanLockedRef
                .current
            ) {
              return;
            }

            scanLockedRef.current =
              true;

            const code =
              normalizeTicketCode(
                decodedText
              );

            if (
              !code.startsWith(
                "EVT-"
              )
            ) {
              setScannerError(
                "This QR code is not an EventHub ticket."
              );

              scanLockedRef.current =
                false;

              return;
            }

            setTicketCode(
              code
            );

            await stopScanner();

            await findRegistration(
              code
            );
          },
          () => {}
        );

      scanningRef.current =
        true;

      setScannerActive(
        true
      );
    } catch (
      scannerStartError
    ) {
      console.error(
        "Could not start scanner:",
        scannerStartError
      );

      scannerRef.current =
        null;

      scanningRef.current =
        false;

      setScannerActive(
        false
      );

      setScannerError(
        getCameraErrorMessage(
          scannerStartError
        )
      );
    } finally {
      setScannerStarting(
        false
      );
    }
  }


  async function stopScanner() {
    const scanner =
      scannerRef.current;

    if (!scanner) {
      scanningRef.current =
        false;

      setScannerActive(
        false
      );

      scanLockedRef.current =
        false;

      return;
    }

    try {
      if (
        scanningRef.current
      ) {
        await scanner.stop();
      }
    } catch (
      stopError
    ) {
      console.error(
        "Could not stop scanner:",
        stopError
      );
    }

    try {
      scanner.clear();
    } catch {
    }

    scannerRef.current =
      null;

    scanningRef.current =
      false;

    scanLockedRef.current =
      false;

    setScannerActive(
      false
    );
  }


  async function stopScannerSilently() {
    const scanner =
      scannerRef.current;

    if (!scanner) {
      return;
    }

    try {
      if (
        scanningRef.current
      ) {
        await scanner.stop();
      }
    } catch {
    }

    try {
      scanner.clear();
    } catch {
    }

    scannerRef.current =
      null;

    scanningRef.current =
      false;

    scanLockedRef.current =
      false;
  }


  async function handleCheckIn() {
    if (
      !registration
    ) {
      return;
    }

    if (
      registration.checked_in
    ) {
      setError(
        "This ticket has already been checked in."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Check in ${registration.name}?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setCheckingIn(true);
    setError("");
    setSuccess("");

    const {
      data:
        checkInResult,
      error:
        checkInError,
    } = await supabase
      .rpc(
        "check_in_registration",
        {
          p_ticket_code:
            registration
              .ticket_code,
        }
      );

    if (
      checkInError
    ) {
      console.error(
        "Check-in failed:",
        checkInError
      );

      const message =
        (
          checkInError.message ||
          ""
        ).toLowerCase();

      if (
        message.includes(
          "already been checked in"
        )
      ) {
        setError(
          "This ticket has already been checked in."
        );
      } else if (
        message.includes(
          "permission"
        )
      ) {
        setError(
          "You are not assigned to check in attendees for this event."
        );
      } else if (
        message.includes(
          "authentication"
        ) ||
        message.includes(
          "unauthorized"
        )
      ) {
        setError(
          "Your account is not authorized to perform check-ins."
        );
      } else if (
        message.includes(
          "disabled"
        )
      ) {
        setError(
          "Your CMS account is disabled."
        );
      } else if (
        message.includes(
          "ticket not found"
        )
      ) {
        setError(
          "This ticket could not be found."
        );
      } else {
        setError(
          "Could not check in this attendee."
        );
      }

      setCheckingIn(false);

      return;
    }

    if (
      !checkInResult ||
      checkInResult
        .success !== true
    ) {
      setError(
        "Could not check in this attendee."
      );

      setCheckingIn(false);

      return;
    }

    const {
      data:
        refreshedRows,
      error:
        refreshError,
    } = await supabase
      .rpc(
        "verify_ticket",
        {
          p_ticket_code:
            registration
              .ticket_code,
        }
      );

    if (
      refreshError
    ) {
      console.error(
        "Could not refresh registration:",
        refreshError
      );

      setRegistration(
        (current) => ({
          ...current,
          checked_in:
            true,
          checked_in_at:
            checkInResult
              .checked_in_at,
          checked_in_by:
            checkInResult
              .checked_in_by,
        })
      );
    } else {
      const refreshedRecord =
        Array.isArray(
          refreshedRows
        )
          ? refreshedRows[0]
          : refreshedRows;

      if (
        refreshedRecord
      ) {
        setRegistration(
          mapTicketRecord(
            refreshedRecord
          )
        );
      } else {
        setRegistration(
          (current) => ({
            ...current,
            checked_in:
              true,
            checked_in_at:
              checkInResult
                .checked_in_at,
            checked_in_by:
              checkInResult
                .checked_in_by,
          })
        );
      }
    }

    setSuccess(
      `${registration.name} checked in successfully.`
    );

    await fetchRecentCheckIns();

    setCheckingIn(false);
  }


  async function handleNewScan() {
    await stopScanner();

    setTicketCode("");
    setRegistration(null);
    setError("");
    setSuccess("");
    setScannerError("");
  }


  const eventData =
    registration?.events;


  return (
    <AdminLayout>

      <div className="admin-page-heading">

        <div>

          <span className="admin-eyebrow">
            Attendance
          </span>

          <h1>
            Event check-in
          </h1>

          <p>
            Scan EventHub QR tickets or
            enter ticket codes manually
            to verify attendees.
          </p>

        </div>


        <div className="admin-page-count">

          <strong>
            {recentCheckIns.length}
          </strong>

          <span>
            Recent check-ins
          </span>

        </div>

      </div>


      <div className="admin-checkin-layout">

        <section className="admin-editor-card">

          <div className="admin-editor-header">

            <div>

              <span>
                Ticket scanner
              </span>

              <h2>
                Verify ticket
              </h2>

            </div>

          </div>


          <div className="admin-checkin-scanner">

            <div className="admin-checkin-scanner-header">

              <div>

                <span>
                  Camera scanner
                </span>

                <strong>
                  Scan QR ticket
                </strong>

              </div>


              <span
                className={
                  scannerActive
                    ? "admin-checkin-camera-state active"
                    : "admin-checkin-camera-state"
                }
              >
                {scannerActive
                  ? "Camera active"
                  : "Camera off"}
              </span>

            </div>


            <div
              className={
                scannerActive ||
                scannerStarting
                  ? "admin-checkin-reader active"
                  : "admin-checkin-reader"
              }
            >

              <div
                id={
                  SCANNER_ID
                }
              />


              {!scannerActive &&
                !scannerStarting && (
                  <div className="admin-checkin-reader-placeholder">

                    <span>
                      ◇
                    </span>

                    <strong>
                      QR scanner
                    </strong>

                    <p>
                      Start the camera and
                      point it at the QR code
                      on the attendee&apos;s
                      ticket.
                    </p>

                  </div>
                )}


              {scannerStarting && (
                <div className="admin-checkin-reader-loading">

                  <div className="loading-spinner" />

                  <span>
                    Starting camera...
                  </span>

                </div>
              )}

            </div>


            {scannerError && (
              <div className="admin-checkin-scanner-error">

                <span>
                  !
                </span>

                <p>
                  {scannerError}
                </p>

              </div>
            )}


            <div className="admin-checkin-scanner-actions">

              {!scannerActive ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={
                    startScanner
                  }
                  disabled={
                    scannerStarting ||
                    searching ||
                    checkingIn
                  }
                >
                  {scannerStarting
                    ? "Starting..."
                    : "Start camera"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={
                    stopScanner
                  }
                  disabled={
                    checkingIn
                  }
                >
                  Stop camera
                </button>
              )}

            </div>

          </div>


          <div className="admin-checkin-manual-divider">

            <span>
              or enter manually
            </span>

          </div>


          <form
            className="admin-checkin-form"
            onSubmit={
              handleSearch
            }
          >

            <div className="admin-field">

              <label htmlFor="checkin-ticket">
                Ticket code
              </label>

              <input
                id="checkin-ticket"
                type="text"
                value={
                  ticketCode
                }
                onChange={
                  handleTicketChange
                }
                placeholder="EVT-ABC123-XY9Z"
                autoComplete="off"
                disabled={
                  searching ||
                  checkingIn
                }
              />

            </div>


            <button
              type="submit"
              className="btn btn-primary admin-save-button"
              disabled={
                searching ||
                checkingIn ||
                !ticketCode.trim()
              }
            >

              {searching
                ? "Checking..."
                : "Check ticket"}

              {!searching && (
                <span>
                  →
                </span>
              )}

            </button>

          </form>


          <div className="admin-checkin-help">

            <span>
              Ticket format
            </span>

            <strong>
              EVT-XXXXXXXX-XXXX
            </strong>

            <p>
              Scan the QR code or enter the
              ticket ID shown on the digital
              ticket.
            </p>

          </div>

        </section>


        <section className="admin-checkin-result">

          {!registration &&
            !error &&
            !success && (
              <div className="admin-checkin-empty">

                <div className="admin-checkin-empty-icon">
                  ◇
                </div>

                <span>
                  EventHub Check-in
                </span>

                <h2>
                  Ready to verify a ticket.
                </h2>

                <p>
                  Scan a QR ticket or enter
                  its code to view attendee
                  and event information.
                </p>

              </div>
            )}


          {error && (
            <div className="admin-checkin-error">

              <div className="admin-checkin-result-icon">
                !
              </div>

              <div>

                <span>
                  Verification
                </span>

                <h2>
                  Check-in unavailable
                </h2>

                <p>
                  {error}
                </p>

              </div>

            </div>
          )}


          {success && (
            <div className="admin-checkin-success">

              <div className="admin-checkin-result-icon">
                ✓
              </div>

              <div>

                <span>
                  Attendance recorded
                </span>

                <h2>
                  Check-in successful
                </h2>

                <p>
                  {success}
                </p>

              </div>

            </div>
          )}


          {registration && (
            <article className="admin-checkin-ticket">

              <div className="admin-checkin-ticket-top">

                <div>

                  <span>
                    Ticket verification
                  </span>

                  <h2>
                    {registration.name}
                  </h2>

                </div>


                <span
                  className={
                    registration.checked_in
                      ? "admin-checkin-status checked-in"
                      : "admin-checkin-status valid"
                  }
                >

                  {registration.checked_in
                    ? "Checked in"
                    : "Valid ticket"}

                </span>

              </div>


              <div className="admin-checkin-ticket-grid">

                <div>
                  <span>Event</span>

                  <strong>
                    {eventData?.title ||
                      "Unknown event"}
                  </strong>
                </div>


                <div>
                  <span>Category</span>

                  <strong>
                    {eventData?.category ||
                      "School Event"}
                  </strong>
                </div>


                <div>
                  <span>Attendee</span>

                  <strong>
                    {registration.name}
                  </strong>
                </div>


                <div>
                  <span>Email</span>

                  <strong>
                    {registration.email}
                  </strong>
                </div>


                <div>
                  <span>Date</span>

                  <strong>
                    {formatEventDate(
                      eventData
                        ?.event_date
                    )}
                  </strong>
                </div>


                <div>
                  <span>Time</span>

                  <strong>
                    {formatEventTime(
                      eventData
                        ?.event_time
                    )}
                  </strong>
                </div>


                <div>
                  <span>Venue</span>

                  <strong>
                    {eventData?.location ||
                      "Venue TBA"}
                  </strong>
                </div>


                <div>
                  <span>Ticket ID</span>

                  <strong className="admin-checkin-code">
                    {
                      registration
                        .ticket_code
                    }
                  </strong>
                </div>

              </div>


              {registration.checked_in && (
                <div className="admin-checkin-history">

                  <span>
                    Checked in
                  </span>

                  <strong>
                    {checkedInTime ||
                      "Recorded"}
                  </strong>

                </div>
              )}


              <div className="admin-checkin-actions">

                {!registration.checked_in && (
                  <button
                    type="button"
                    className="btn btn-primary admin-checkin-confirm"
                    onClick={
                      handleCheckIn
                    }
                    disabled={
                      checkingIn
                    }
                  >

                    {checkingIn
                      ? "Checking in..."
                      : "Confirm check-in"}

                    {!checkingIn && (
                      <span>
                        ✓
                      </span>
                    )}

                  </button>
                )}


                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={
                    handleNewScan
                  }
                  disabled={
                    checkingIn
                  }
                >
                  Check another ticket
                </button>

              </div>

            </article>
          )}

        </section>

      </div>


      <section className="admin-recent-checkins">

        <div className="admin-recent-checkins-header">

          <div>

            <span className="admin-eyebrow">
              Gate Activity
            </span>

            <h2>
              Recent check-ins
            </h2>

            <p>
              Latest attendance activity
              from events you are authorized
              to operate.
            </p>

          </div>


          <button
            type="button"
            className="btn btn-outline"
            onClick={
              fetchRecentCheckIns
            }
            disabled={
              recentLoading
            }
          >
            {recentLoading
              ? "Refreshing..."
              : "Refresh"}
          </button>

        </div>


        {recentError && (
          <div className="admin-inline-error">

            <span>
              !
            </span>

            <p>
              {recentError}
            </p>

          </div>
        )}


        {recentLoading ? (
          <div className="admin-recent-checkins-loading">

            <div className="loading-spinner" />

            <span>
              Loading recent activity...
            </span>

          </div>
        ) : recentCheckIns.length ===
          0 ? (
          <div className="admin-recent-checkins-empty">

            <span>
              ◇
            </span>

            <strong>
              No check-ins yet
            </strong>

            <p>
              Successful attendee check-ins
              will appear here.
            </p>

          </div>
        ) : (
          <div className="admin-recent-checkins-list">

            {recentCheckIns.map(
              (
                item
              ) => (
                <article
                  key={
                    item.registration_id
                  }
                  className="admin-recent-checkin-row"
                >

                  <div className="admin-recent-checkin-icon">
                    ✓
                  </div>


                  <div className="admin-recent-checkin-main">

                    <div className="admin-recent-checkin-heading">

                      <strong>
                        {item.attendee_name}
                      </strong>

                      <span>
                        {formatCheckInTime(
                          item.checked_in_at
                        )}
                      </span>

                    </div>


                    <p>
                      {item.event_title ||
                        "Unknown event"}
                    </p>


                    <div className="admin-recent-checkin-meta">

                      <span>
                        {item.event_location ||
                          "Venue TBA"}
                      </span>

                      <span>
                        {item.ticket_code}
                      </span>

                    </div>

                  </div>


                  <span className="admin-recent-checkin-status">
                    Checked in
                  </span>

                </article>
              )
            )}

          </div>
        )}

      </section>

    </AdminLayout>
  );
}


function getCameraErrorMessage(
  error
) {
  const message =
    String(
      error?.message ||
      error ||
      ""
    ).toLowerCase();

  if (
    message.includes(
      "permission"
    ) ||
    message.includes(
      "notallowed"
    )
  ) {
    return "Camera permission was denied. Allow camera access in your browser and try again.";
  }

  if (
    message.includes(
      "notfound"
    ) ||
    message.includes(
      "no camera"
    )
  ) {
    return "No compatible camera was found on this device.";
  }

  if (
    message.includes(
      "secure"
    ) ||
    message.includes(
      "https"
    )
  ) {
    return "Camera scanning requires a secure HTTPS connection or localhost.";
  }

  return "Could not start the camera. Check camera permissions and try again.";
}


function formatEventDate(
  date
) {
  if (!date) {
    return "Date TBA";
  }

  const eventDate =
    new Date(
      `${date}T00:00:00`
    );

  if (
    Number.isNaN(
      eventDate.getTime()
    )
  ) {
    return "Date TBA";
  }

  return eventDate.toLocaleDateString(
    "en-US",
    {
      year:
        "numeric",
      month:
        "short",
      day:
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

  if (
    !match
  ) {
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
    hours % 12 ||
    12;

  return `${hours}:${minutes} ${modifier}`;
}


function formatCheckInTime(
  value
) {
  if (!value) {
    return "Just now";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Recorded";
  }

  return date.toLocaleString(
    "en-US",
    {
      month:
        "short",
      day:
        "numeric",
      hour:
        "numeric",
      minute:
        "2-digit",
    }
  );
}


export default AdminCheckIn;