import { createClient } from "@/utils/supabase/server";
import { Payment, getColumns } from "./columns";
import { PaymentsClient } from "./payments-client";
import { decryptData } from "@/utils/encryption";

const getData = async (): Promise<Payment[]> => {
  const parseServicesString = (services: unknown): string[] => {
    if (typeof services !== "string" || !services.trim()) {
      return [];
    }
    return services.split(",").map((s) => s.trim()).filter(Boolean);
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("Appointments")
    .select(`
      *,
      claimed_by:Profiles (id, username)
    `);

  if (error) {
    console.error("Error fetching payments:", error);
    return [];
  }

  if (!data) {
    return [];
  }

  const payments: Payment[] = data.map((payment) => ({
    id: payment.id,
    username: payment.Name ?? "N/A",
    email: decryptData(payment.Email ?? "N/A"),
    phone: decryptData(payment.Phone ?? "N/A"),
    date: payment.Date ?? "N/A",
    time: payment.Time ?? "N/A",
    services: parseServicesString(payment.Services),
    amount: payment.Total,
    status: payment.status,
    date_created: payment.date_created,
    claimed_by_id: payment.claimed_by?.id,
    claimed_by_username: payment.claimed_by?.username,
    claimed_service: payment.claimed_service,
  }));

  return payments;
};

const PaymentsPage = async () => {
  const data = await getData();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let userId: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("Profiles")
      .select("id, isAdmin")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.isAdmin || false;
    userId = user.id;
  }

  return (
    <div className="w-full pt-4 pb-10 pl-4 pr-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">All Appointment Billings</h1>
      </div>
      <PaymentsClient data={data} isAdmin={isAdmin} userId={userId} />
    </div>
  );
};

export default PaymentsPage;
