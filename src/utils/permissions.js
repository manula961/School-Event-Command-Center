export const ROLES = {
  PRINCIPAL: "principal",
  VICE_PRINCIPAL: "vice_principal",
  TEACHER: "teacher",
  STUDENT_ADMIN: "student_admin",
  EVENT_STAFF: "event_staff",
};

export const ROLE_LABELS = {
  [ROLES.PRINCIPAL]: "Principal",
  [ROLES.VICE_PRINCIPAL]: "Vice Principal",
  [ROLES.TEACHER]: "Teacher-in-Charge",
  [ROLES.STUDENT_ADMIN]: "Student Admin",
  [ROLES.EVENT_STAFF]: "Event Staff",
};

export const permissions = {
  [ROLES.PRINCIPAL]: {
    manageUsers: true,
    manageEvents: true,
    publishEvents: true,
    manageAnnouncements: true,
    manageRegistrations: true,
    manageMedia: true,
    manageLiveUpdates: true,
    approveEvents: true,
    viewAnalytics: true,
    viewLogs: true,
    checkInAttendees: true,
  },

  [ROLES.VICE_PRINCIPAL]: {
    manageUsers: false,
    manageEvents: true,
    publishEvents: true,
    manageAnnouncements: true,
    manageRegistrations: false,
    manageMedia: true,
    manageLiveUpdates: true,
    approveEvents: true,
    viewAnalytics: true,
    viewLogs: false,
    checkInAttendees: false,
  },

  [ROLES.TEACHER]: {
    manageUsers: false,
    manageEvents: true,
    publishEvents: false,
    manageAnnouncements: false,
    manageRegistrations: true,
    manageMedia: true,
    manageLiveUpdates: true,
    approveEvents: true,
    viewAnalytics: false,
    viewLogs: false,
    checkInAttendees: false,
  },

  [ROLES.STUDENT_ADMIN]: {
    manageUsers: false,
    manageEvents: true,
    publishEvents: false,
    manageAnnouncements: false,
    manageRegistrations: false,
    manageMedia: true,
    manageLiveUpdates: true,
    approveEvents: false,
    viewAnalytics: false,
    viewLogs: false,
    checkInAttendees: false,
  },

  [ROLES.EVENT_STAFF]: {
    manageUsers: false,
    manageEvents: false,
    publishEvents: false,
    manageAnnouncements: false,
    manageRegistrations: false,
    manageMedia: false,
    manageLiveUpdates: false,
    approveEvents: false,
    viewAnalytics: false,
    viewLogs: false,
    checkInAttendees: true,
  },
};

export function can(
  role,
  permission
) {
  if (
    !role ||
    !permission
  ) {
    return false;
  }

  return Boolean(
    permissions[role]?.[
      permission
    ]
  );
}

export function canUser(
  role,
  permission,
  overrides = {}
) {
  if (
    !role ||
    !permission
  ) {
    return false;
  }

  if (
    Object.prototype
      .hasOwnProperty
      .call(
        overrides,
        permission
      )
  ) {
    return Boolean(
      overrides[
        permission
      ]
    );
  }

  return Boolean(
    permissions[role]?.[
      permission
    ]
  );
}