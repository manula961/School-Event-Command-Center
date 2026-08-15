import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};


Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }


  try {
    const authHeader =
      req.headers.get("Authorization");


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
      Deno.env.get("SUPABASE_URL");

    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

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
            "Only the Principal can delete CMS accounts.",
        },
        403
      );
    }


    const {
      userId,
    } =
      await req.json();


    if (!userId) {
      return response(
        {
          error:
            "User ID is required.",
        },
        400
      );
    }


    if (
      userId ===
      caller.id
    ) {
      return response(
        {
          error:
            "The Principal cannot delete their own account.",
        },
        400
      );
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
          full_name,
          email,
          role,
          title,
          society_id,
          is_active,
          permission_overrides
        `)
        .eq(
          "id",
          userId
        )
        .maybeSingle();


    if (
      targetProfileError
    ) {
      console.error(
        "Could not load target profile:",
        targetProfileError
      );

      return response(
        {
          error:
            "Could not verify the CMS account.",
        },
        500
      );
    }


    if (
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
      "principal"
    ) {
      return response(
        {
          error:
            "The Principal account cannot be deleted.",
        },
        400
      );
    }


    const deletedUserDetails = {
      full_name:
        targetProfile.full_name ||
        null,

      email:
        targetProfile.email ||
        null,

      role:
        targetProfile.role ||
        null,

      title:
        targetProfile.title ||
        null,

      society_id:
        targetProfile.society_id ||
        null,

      is_active:
        targetProfile.is_active,

      permission_overrides:
        targetProfile
          .permission_overrides ||
        {},
    };


    const {
      error:
        deleteAuthError,
    } =
      await adminClient
        .auth
        .admin
        .deleteUser(
          userId
        );


    if (
      deleteAuthError
    ) {
      console.error(
        "Could not delete auth user:",
        deleteAuthError
      );

      return response(
        {
          error:
            deleteAuthError.message ||
            "Could not delete CMS account.",
        },
        500
      );
    }


    const {
      error:
        profileCleanupError,
    } =
      await adminClient
        .from("profiles")
        .delete()
        .eq(
          "id",
          userId
        );


    if (
      profileCleanupError
    ) {
      console.error(
        "Profile cleanup warning:",
        profileCleanupError
      );
    }


    const {
      error:
        logError,
    } =
      await adminClient
        .from("activity_logs")
        .insert({
          user_id:
            caller.id,

          action:
            "deleted_user",

          entity_type:
            "profile",

          entity_id:
            userId,

          details:
            deletedUserDetails,
        });


    if (logError) {
      console.error(
        "Could not save deletion activity log:",
        logError
      );
    }


    return response(
      {
        success: true,

        message:
          `${
            targetProfile.full_name ||
            targetProfile.email ||
            "CMS user"
          } was deleted successfully.`,
      },
      200
    );

  } catch (error) {
    console.error(error);


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