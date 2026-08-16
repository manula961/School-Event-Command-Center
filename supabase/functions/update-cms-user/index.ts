import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const allowedRoles = [
  "principal",
  "vice_principal",
  "teacher",
  "student_admin",
  "event_staff",
];

const allowedPermissionOverrides = [
  "manageUsers",
  "manageEvents",
  "publishEvents",
  "manageAnnouncements",
  "manageRegistrations",
  "manageMedia",
  "manageLiveUpdates",
  "approveEvents",
  "viewAnalytics",
  "viewLogs",
  "checkInAttendees",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const authHeader =
      req.headers.get(
        "Authorization"
      );

    if (!authHeader) {
      return response(
        {
          error:
            "Missing authorization header.",
        },
        401
      );
    }

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL"
      );

    const anonKey =
      Deno.env.get(
        "SUPABASE_ANON_KEY"
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Missing Supabase environment variables."
      );
    }

    const callerClient =
      createClient(
        supabaseUrl,
        anonKey,
        {
          global: {
            headers: {
              Authorization:
                authHeader,
            },
          },
        }
      );

    const {
      data: {
        user: caller,
      },
      error:
        callerError,
    } =
      await callerClient
        .auth
        .getUser();

    if (
      callerError ||
      !caller
    ) {
      return response(
        {
          error:
            "Unauthorized.",
        },
        401
      );
    }

    const {
      data:
        callerProfile,
      error:
        callerProfileError,
    } =
      await callerClient
        .from("profiles")
        .select(`
          role,
          is_active
        `)
        .eq(
          "id",
          caller.id
        )
        .single();

    if (
      callerProfileError ||
      !callerProfile ||
      callerProfile.role !==
        "principal" ||
      !callerProfile.is_active
    ) {
      return response(
        {
          error:
            "Only the Principal can update CMS accounts.",
        },
        403
      );
    }

    const {
      userId,
      fullName,
      email,
      password,
      role,
      societyId,
      isActive,
      title,
      permissionOverrides,
    } =
      await req.json();

    if (
      !userId ||
      !fullName ||
      !email ||
      !role
    ) {
      return response(
        {
          error:
            "User ID, name, email and role are required.",
        },
        400
      );
    }

    const cleanFullName =
      String(
        fullName
      ).trim();

    const cleanEmail =
      String(
        email
      )
        .trim()
        .toLowerCase();

    const cleanTitle =
      typeof title ===
      "string"
        ? title.trim()
        : "";

    if (
      !cleanFullName ||
      !cleanEmail
    ) {
      return response(
        {
          error:
            "Name and email are required.",
        },
        400
      );
    }

    if (
      !allowedRoles.includes(
        role
      )
    ) {
      return response(
        {
          error:
            "Invalid CMS role.",
        },
        400
      );
    }

    if (
      password &&
      password.length <
        8
    ) {
      return response(
        {
          error:
            "New password must be at least 8 characters.",
        },
        400
      );
    }

    const requiresSociety =
      role ===
        "teacher" ||
      role ===
        "student_admin";

    if (
      requiresSociety &&
      !societyId
    ) {
      return response(
        {
          error:
            "Teachers and Student Admins must be assigned to a society.",
        },
        400
      );
    }

    const safePermissionOverrides:
      Record<
        string,
        boolean
      > = {};

    if (
      permissionOverrides !==
        undefined &&
      permissionOverrides !==
        null
    ) {
      if (
        typeof permissionOverrides !==
          "object" ||
        Array.isArray(
          permissionOverrides
        )
      ) {
        return response(
          {
            error:
              "Permission overrides must be an object.",
          },
          400
        );
      }

      for (
        const [
          permission,
          value,
        ] of Object.entries(
          permissionOverrides
        )
      ) {
        if (
          !allowedPermissionOverrides.includes(
            permission
          )
        ) {
          continue;
        }

        if (
          typeof value !==
          "boolean"
        ) {
          return response(
            {
              error:
                `Invalid value for permission "${permission}".`,
            },
            400
          );
        }

        safePermissionOverrides[
          permission
        ] = value;
      }
    }

    const adminClient =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken:
              false,

            persistSession:
              false,
          },
        }
      );

    const {
      data:
        targetProfile,
      error:
        targetProfileError,
    } =
      await adminClient
        .from("profiles")
        .select(`
          id,
          role,
          full_name,
          email,
          title,
          permission_overrides,
          society_id,
          is_active
        `)
        .eq(
          "id",
          userId
        )
        .single();

    if (
      targetProfileError ||
      !targetProfile
    ) {
      return response(
        {
          error:
            "CMS user not found.",
        },
        404
      );
    }

    if (
      targetProfile.role ===
        "principal" &&
      role !==
        "principal"
    ) {
      return response(
        {
          error:
            "The Principal role cannot be removed from this account.",
        },
        400
      );
    }

    if (
      targetProfile.role !==
        "principal" &&
      role ===
        "principal"
    ) {
      return response(
        {
          error:
            "Another account cannot be promoted to Principal.",
        },
        400
      );
    }

    if (
      targetProfile.role ===
        "principal" &&
      isActive ===
        false
    ) {
      return response(
        {
          error:
            "The Principal account cannot be disabled.",
        },
        400
      );
    }

    const authUpdates: {
      email?: string;
      password?: string;
      user_metadata?: {
        full_name: string;
      };
    } = {
      email:
        cleanEmail,

      user_metadata: {
        full_name:
          cleanFullName,
      },
    };

    if (password) {
      authUpdates.password =
        password;
    }

    const {
      error:
        authUpdateError,
    } =
      await adminClient
        .auth
        .admin
        .updateUserById(
          userId,
          authUpdates
        );

    if (
      authUpdateError
    ) {
      return response(
        {
          error:
            authUpdateError.message,
        },
        400
      );
    }

    const finalPermissionOverrides =
      role ===
      "principal"
        ? {}
        : safePermissionOverrides;

    const finalIsActive =
      targetProfile.role ===
      "principal"
        ? true
        : typeof isActive ===
            "boolean"
          ? isActive
          : targetProfile
              .is_active;

    const finalSocietyId =
      requiresSociety
        ? societyId
        : null;

    const {
      error:
        profileUpdateError,
    } =
      await adminClient
        .from("profiles")
        .update({
          full_name:
            cleanFullName,

          email:
            cleanEmail,

          role,

          title:
            cleanTitle ||
            null,

          permission_overrides:
            finalPermissionOverrides,

          society_id:
            finalSocietyId,

          is_active:
            finalIsActive,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          userId
        );

    if (
      profileUpdateError
    ) {
      console.error(
        profileUpdateError
      );

      return response(
        {
          error:
            "Authentication account was updated, but the CMS profile could not be updated.",
        },
        500
      );
    }

    const {
      error:
        logError,
    } =
      await adminClient
        .from(
          "activity_logs"
        )
        .insert({
          user_id:
            caller.id,

          action:
            "updated_cms_user",

          entity_type:
            "profile",

          entity_id:
            userId,

          details: {
            full_name:
              cleanFullName,

            email:
              cleanEmail,

            role,

            title:
              cleanTitle ||
              null,

            society_id:
              finalSocietyId,

            is_active:
              finalIsActive,

            permission_overrides:
              finalPermissionOverrides,

            previous_role:
              targetProfile.role,

            previous_title:
              targetProfile.title ||
              null,

            previous_permission_overrides:
              targetProfile
                .permission_overrides ||
              {},

            previous_society_id:
              targetProfile
                .society_id ||
              null,

            previous_is_active:
              targetProfile
                .is_active,
          },
        });

    if (logError) {
      console.error(
        "Could not save activity log:",
        logError
      );
    }

    return response(
      {
        success:
          true,

        user: {
          id:
            userId,

          fullName:
            cleanFullName,

          email:
            cleanEmail,

          role,

          title:
            cleanTitle ||
            null,

          societyId:
            finalSocietyId,

          permissionOverrides:
            finalPermissionOverrides,

          isActive:
            finalIsActive,
        },
      },
      200
    );
  } catch (error) {
    console.error(
      error
    );

    return response(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      500
    );
  }
});

function response(
  body: unknown,
  status: number
) {
  return new Response(
    JSON.stringify(
      body
    ),
    {
      status,

      headers: {
        ...corsHeaders,

        "Content-Type":
          "application/json",
      },
    }
  );
}