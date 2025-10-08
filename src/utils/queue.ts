
import { createClient } from "@/utils/supabase/client";

export const subscribeToAdminQueueChanges = (
  client: ReturnType<typeof createClient>,
  callback: (payload: any) => void
) => {
  const subscription = client
    .channel("admin_queue_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "queue_entries" },
      (payload) => callback(payload)
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "queue_settings" },
      (payload) => callback(payload)
    )
    .subscribe();

  return subscription;
};
