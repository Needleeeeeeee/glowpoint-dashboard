import { createClient } from "@/utils/supabase/server";
import { CalendarView } from "@/components/CalendarView";

export default async function CalendarPage() {
  const supabase = await createClient();

  const { data: appointments, error } = await supabase
    .from("Appointments")
    .select("id, Date, Time, Services, Name");

  if (error) {
    console.error("Error fetching appointments:", error);
    return (
      <div className="text-center text-destructive">
        Error loading appointments. Please try again later.
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-10">
      <h1 className="text-2xl font-bold mb-4">Calendar of Appointments</h1>
      <CalendarView appointments={appointments || []} />
    </div>
  );
}
