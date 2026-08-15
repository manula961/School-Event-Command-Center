import { supabase } from "../services/supabase";


export async function refreshEventLifecycle() {
  const {
    error,
  } = await supabase.rpc(
    "refresh_event_lifecycle"
  );


  if (error) {
    console.error(
      "Could not refresh event lifecycle:",
      error
    );

    return false;
  }


  return true;
}