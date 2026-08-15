import { useEffect, useState } from "react";

function calculateTimeLeft(targetDate) {
  if (!targetDate) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: true,
    };
  }

  const difference =
    new Date(targetDate).getTime() - Date.now();

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: true,
    };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor(
      (difference / (1000 * 60 * 60)) % 24
    ),
    minutes: Math.floor(
      (difference / (1000 * 60)) % 60
    ),
    seconds: Math.floor(
      (difference / 1000) % 60
    ),
    expired: false,
  };
}

function Countdown({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState(() =>
    calculateTimeLeft(targetDate)
  );

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(targetDate));

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.expired) {
    return (
      <div className="countdown-expired">
        Event started
      </div>
    );
  }

  const values = [
    ["Days", timeLeft.days],
    ["Hours", timeLeft.hours],
    ["Min", timeLeft.minutes],
    ["Sec", timeLeft.seconds],
  ];

  return (
    <div className="event-countdown">
      {values.map(([label, value]) => (
        <div className="countdown-unit" key={label}>
          <strong>
            {String(value).padStart(2, "0")}
          </strong>

          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default Countdown;