import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};


const allowedRoles = [
  "vice_principal",
  "teacher",
  "student_admin",
  "event_staff",
];


const allowedPermissionOverrides = [
  "manageEvents",
  "publishEvents",
  "manageAnnouncements",
  "manageRegistrations",
  "manageMedia",
  "manageLiveUpdates",
  "approveEvents",
  "viewAnalytics",
  "checkInAttendees",
];


Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(
      "ok",
      {
        headers:
          corsHeaders,
      }
    );
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
        user:
          caller,
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
        .from(
          "profiles"
        )
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
            "Only the Principal can create CMS accounts.",
        },
        403
      );
    }


    const body =
      await req.json();


    const {
      fullName,
      email,
      password,
      role,
      societyId,
      title,
      permissionOverrides,
    } = body;


    if (
      !fullName ||
      !email ||
      !password ||
      !role
    ) {
      return response(
        {
          error:
            "Name, email, password and role are required.",
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


    const cleanRole =
      String(
        role
      ).trim();


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
      String(
        password
      ).length <
      8
    ) {
      return response(
        {
          error:
            "Temporary password must be at least 8 characters.",
        },
        400
      );
    }


    if (
      !allowedRoles.includes(
        cleanRole
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


    const requiresSociety =
      cleanRole ===
        "teacher" ||
      cleanRole ===
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
        ] =
          value;
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
        existingProfile,
      error:
        existingProfileError,
    } =
      await adminClient
        .from(
          "profiles"
        )
        .select(
          "id"
        )
        .eq(
          "email",
          cleanEmail
        )
        .maybeSingle();


    if (
      existingProfileError
    ) {
      console.error(
        "Could not check existing profile:",
        existingProfileError
      );


      return response(
        {
          error:
            "Could not verify whether this email is already in use.",
        },
        500
      );
    }


    if (
      existingProfile
    ) {
      return response(
        {
          error:
            "A CMS account with this email already exists.",
        },
        400
      );
    }


    const {
      data:
        createdUserData,
      error:
        createUserError,
    } =
      await adminClient
        .auth
        .admin
        .createUser({
          email:
            cleanEmail,

          password:
            String(
              password
            ),

          email_confirm:
            true,

          user_metadata: {
            full_name:
              cleanFullName,
          },
        });


    if (
      createUserError ||
      !createdUserData
        .user
    ) {
      console.error(
        "Could not create auth user:",
        createUserError
      );


      return response(
        {
          error:
            createUserError
              ?.message ||
            "Could not create authentication account.",
        },
        400
      );
    }


    const createdUser =
      createdUserData
        .user;


    const profilePayload = {
      id:
        createdUser.id,

      full_name:
        cleanFullName,

      email:
        cleanEmail,

      role:
        cleanRole,

      title:
        cleanTitle ||
        null,

      permission_overrides:
        safePermissionOverrides,

      society_id:
        requiresSociety
          ? societyId
          : null,

      is_active:
        true,

      updated_at:
        new Date()
          .toISOString(),
    };


    const {
      error:
        profileInsertError,
    } =
      await adminClient
        .from(
          "profiles"
        )
        .upsert(
          profilePayload,
          {
            onConflict:
              "id",
          }
        );


    if (
      profileInsertError
    ) {
      console.error(
        "Profile creation failed:",
        profileInsertError
      );


      const {
        error:
          cleanupError,
      } =
        await adminClient
          .auth
          .admin
          .deleteUser(
            createdUser.id
          );


      if (
        cleanupError
      ) {
        console.error(
          "Could not clean up auth user:",
          cleanupError
        );
      }


      return response(
        {
          error:
            profileInsertError.message ||
            "Authentication account was created, but the CMS profile could not be created.",
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
            "created_cms_user",

          entity_type:
            "profile",

          entity_id:
            createdUser.id,

          details: {
            full_name:
              cleanFullName,

            email:
              cleanEmail,

            role:
              cleanRole,

            title:
              cleanTitle ||
              null,

            society_id:
              requiresSociety
                ? societyId
                : null,

            permission_overrides:
              safePermissionOverrides,
          },
        });


    if (
      logError
    ) {
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
            createdUser.id,

          fullName:
            cleanFullName,

          email:
            cleanEmail,

          role:
            cleanRole,

          title:
            cleanTitle ||
            null,

          societyId:
            requiresSociety
              ? societyId
              : null,

          permissionOverrides:
            safePermissionOverrides,
        },
      },
      200
    );

  } catch (
    error
  ) {
    console.error(
      "create-cms-user error:",
      error
    );


    return response(
      {
        error:
          error instanceof
          Error
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