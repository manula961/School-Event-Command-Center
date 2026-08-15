export function getCapacityState(
  capacity,
  registrationCount
) {
  if (
    capacity === null ||
    capacity === undefined
  ) {
    return {
      remaining: null,
      percentage: 0,
      soldOut: false,
      lowAvailability: false,
      label: "Registration open",
    };
  }


  const total =
    Number(capacity);

  const registered =
    Number(
      registrationCount || 0
    );


  const remaining =
    Math.max(
      total - registered,
      0
    );


  const percentage =
    total > 0
      ? Math.min(
          (registered / total) *
            100,
          100
        )
      : 0;


  const soldOut =
    remaining === 0;


  const lowAvailability =
    !soldOut &&
    (
      remaining <= 10 ||
      percentage >= 85
    );


  let label =
    `${remaining} seat${
      remaining === 1
        ? ""
        : "s"
    } remaining`;


  if (soldOut) {
    label = "Sold out";
  } else if (
    lowAvailability
  ) {
    label =
      `Only ${remaining} left`;
  }


  return {
    remaining,
    percentage,
    soldOut,
    lowAvailability,
    label,
  };
}