import { supabase } from "../services/supabase";

export async function logActivity({
  action,
  entityType,
  entityId = null,
  details = {},
}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn(
        "Activity log skipped: no authenticated user."
      );

      return;
    }

    const { error } = await supabase
      .from("activity_logs")
      .insert({
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id:
          entityId === null
            ? null
            : String(entityId),
        details,
      });

    if (error) {
      console.error(
        "Could not create activity log:",
        error
      );
    }
  } catch (error) {
    console.error(
      "Activity logger failed:",
      error
    );
  }
}