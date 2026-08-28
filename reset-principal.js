import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://qpxqpipnqniffaexohzt.supabase.co",
  process.env.SUPABASE_SECRET_KEY
);

const principalUserId =
  "45b8e08d-24b7-426b-bfb7-b1c19d5fa53a";

const { error } =
  await supabase.auth.admin.updateUserById(
    principalUserId,
    {
      password: "Principal@2026",
    }
  );

if (error) {
  console.error("Failed:", error.message);
} else {
  console.log("Principal password changed successfully.");
}