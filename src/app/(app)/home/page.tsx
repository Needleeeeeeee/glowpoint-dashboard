import { createClient } from "@/utils/supabase/server";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import AppPieChart from "@/components/AppPieChart";
import AppRadarChart from "@/components/AppRadarChart";
import AppHorizontalBarChart from "@/components/AppHorizontalBarChart";
import AppBarChart from "@/components/AppBarChart";
import { RecentActivity } from "@/components/RecentActivity";
import { RecentFeedback } from "@/components/RecentFeedback";
import { addDays, format, eachDayOfInterval, startOfDay } from "date-fns";
import { ChartConfig } from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TopServicesFilter } from "@/components/TopServicesFilter";
import { ActivitySearch } from "@/components/ActivitySearch";
import { AppointmentVerification } from "@/components/AppointmentVerification";
import { QueueWidget } from "@/components/QueueWidget";

async function getDashboardData(params: { from?: string; to?: string }, isAdmin: boolean) {
  const supabase = await createClient();

  const from = params.from ? new Date(params.from) : new Date();
  const to = params.to ? new Date(params.to) : addDays(new Date(), 30);
  const dateRangeText = `${format(from, "LLL dd, y")} - ${format(
    to,
    "LLL dd, y"
  )}`;

  let query = supabase
    .from("Appointments")
    .select("date_created, status, Services, Total, Time")
    .gte("date_created", from.toISOString())
    .lte("date_created", to.toISOString());

  const { data: appointments, error } = await query;

  if (error) {
    console.error("Error fetching dashboard data:", error);
    return {
      popularServicesData: [],
      appointmentTrendsData: [],
      revenueData: [],
      appointmentFrequencyData: [],
      dateRangeText,
      appointmentTrendsConfig: {},
      popularServicesConfig: {},
    };
  }

  const interval = eachDayOfInterval({
    start: startOfDay(from),
    end: startOfDay(to),
  });

  // --- Data for Pie Chart (Appointment Status) ---
  const statusCountsByDay: {
    [key: string]: {
      success: number;
      pending: number;
      failed: number;
      assigned: number;
    };
  } = {};
  interval.forEach((day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    statusCountsByDay[dayKey] = {
      success: 0,
      pending: 0,
      failed: 0,
      assigned: 0,
    };
  });

  appointments.forEach((app) => {
    const dayKey = format(new Date(app.date_created), "yyyy-MM-dd");
    if (statusCountsByDay[dayKey]) {
      if (app.status === "success") statusCountsByDay[dayKey].success++;
      if (app.status === "pending") statusCountsByDay[dayKey].pending++;
      if (app.status === "failed") statusCountsByDay[dayKey].failed++;
      if (app.status === "assigned") statusCountsByDay[dayKey].assigned++;
    }
  });

  const appointmentTrendsData = Object.entries(statusCountsByDay).map(
    ([date, counts]) => ({
      date: format(new Date(date), "MMM d"),
      ...counts,
    })
  );

  const appointmentTrendsConfig = {
    success: { label: "Success", color: "var(--chart-2)" },
    pending: { label: "Pending", color: "var(--chart-3)" },
    failed: { label: "Failed", color: "var(--chart-5)" },
    assigned: { label: "Assigned", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  // --- Data for Line Chart (Popular Services) ---
  const serviceCounts: { [key: string]: number } = {};
  appointments.forEach((app) => {
    if (typeof app.Services === "string") {
      app.Services.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((service) => {
          serviceCounts[service] = (serviceCounts[service] || 0) + 1;
        });
    }
  });

  const popularServicesData = Object.entries(serviceCounts)
    .map(([service, count]) => ({
      service,
      count,
      slug: service.toLowerCase().replace(/\s+/g, "-"),
    }))
    .sort((a, b) => b.count - a.count);

  const popularServicesConfig = popularServicesData.reduce(
    (acc, cur, index) => {
      const chartColorIndex = (index % 17) + 1;
      acc[cur.slug] = {
        label: cur.service,
        color: `var(--chart-${chartColorIndex})`,
      };
      return acc;
    },
    {} as ChartConfig
  );

  // --- Data for Bar Chart (Total Revenue) ---
  const revenueByDay: { [key: string]: { success: number; pending: number } } =
    {};
  interval.forEach((day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    revenueByDay[dayKey] = { success: 0, pending: 0 };
  });

  appointments.forEach((app) => {
    const dayKey = format(new Date(app.date_created), "yyyy-MM-dd");
    if (revenueByDay[dayKey] && app.Total) {
      if (app.status === "success") {
        revenueByDay[dayKey].success += app.Total;
      } else if (app.status === "pending" || app.status === "assigned") {
        revenueByDay[dayKey].pending += app.Total;
      }
    }
  });

  const revenueData = Object.entries(revenueByDay).map(([date, revenues]) => ({
    date: format(new Date(date), "MMM d"),
    ...revenues,
  }));

  // --- Data for Area Chart (Appointment Frequency) ---
  const appointmentsByHour: { [key: string]: number } = {};
  for (let i = 0; i < 24; i++) {
    appointmentsByHour[i.toString().padStart(2, "0") + ":00"] = 0;
  }

  appointments.forEach((app) => {
    if (app.Time) {
      const hour = app.Time.split(":")[0];
      const key = hour.padStart(2, "0") + ":00";
      if (appointmentsByHour.hasOwnProperty(key)) {
        appointmentsByHour[key]++;
      }
    }
  });

  const appointmentFrequencyData = Object.entries(appointmentsByHour).map(
    ([time, appointments]) => ({
      time,
      appointments,
    })
  );

  return {
    popularServicesData,
    appointmentTrendsData,
    revenueData,
    appointmentFrequencyData,
    dateRangeText,
    appointmentTrendsConfig,
    popularServicesConfig,
  };
}
async function getPendingAppointments() {
  const supabase = await createClient();

  const { data: appointments, error } = await supabase
    .from("Appointments")
    .select("*")
    .eq("status", "pending")
    .order("date_created", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching pending appointments:", error);
    return [];
  }

  return appointments || [];
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const from = searchParams?.from as string | undefined;
  const to = searchParams?.to as string | undefined;
  const topServices = searchParams?.top_services as string | undefined;
  const page = searchParams?.page as string | undefined;
  const rating = searchParams?.rating as string | undefined;
  const has_comment = searchParams?.has_comment as string | undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("Profiles")
    .select("isAdmin")
    .eq("id", user?.id)
    .single();

  const isAdmin = profile?.isAdmin || false;

  const {
    popularServicesData,
    appointmentTrendsData,
    revenueData,
    appointmentFrequencyData,
    dateRangeText,
    appointmentTrendsConfig,
    popularServicesConfig,
  } = await getDashboardData({ from, to });

  const topServicesCount = topServices ? parseInt(topServices, 10) : 5;
  const filteredPopularServices = popularServicesData.slice(
    0,
    topServicesCount
  );
  const pendingAppointments = await getPendingAppointments();
  return (
    <div className="space-y-4 md:space-y-6 py-4 md:py-6 px-3 md:px-4 lg:px-6 w-full max-w-[100vw] mx-auto overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <DateRangeFilter />
      </div>

      {/* Main Flex Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 w-full">
        {isAdmin && (
          <>
            {/* Queue Activity */}
            <Card className="lg:col-span-1">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-lg md:text-xl">
                  Queue Activity
                </CardTitle>
                <CardDescription className="text-sm md:text-base">
                  Real-time queue controls and statistics.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <QueueWidget />
              </CardContent>
            </Card>
          </>
        )}

        {/* Recent Activity */}
        <Card className={isAdmin ? "lg:col-span-1" : "lg:col-span-2"}>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Recent Activity</CardTitle>
            <CardDescription className="text-sm md:text-base">
              A feed of recent appointment claims by employees.
            </CardDescription>
            <ActivitySearch />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <RecentActivity />
          </CardContent>
        </Card>

        {/* Recent Feedback */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Recent Feedback</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <RecentFeedback
              page={page}
              rating={rating}
              hasComment={has_comment}
            />
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="lg:col-span-2">
            <AppointmentVerification initialAppointments={pendingAppointments} />
          </Card>
        )}

        {/* Revenue Bar Chart */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4 md:p-6 pt-6">
            <AppBarChart data={revenueData} />
          </CardContent>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Appointment Status Pie Chart */}
          <Card>
            <CardContent className="p-4 md:p-6 pt-6">
              <AppPieChart
                data={appointmentTrendsData}
                dateRangeText={dateRangeText}
                config={appointmentTrendsConfig}
              />
            </CardContent>
          </Card>

          {/* Appointment Frequency Radar Chart */}
          <Card>
            <CardContent className="p-4 md:p-6 pt-6">
              <AppRadarChart data={appointmentFrequencyData} />
            </CardContent>
          </Card>
        </div>

        {/* Top Popular Services  */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 md:p-6 flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-lg md:text-xl">
              Top {topServicesCount} Popular Services
            </CardTitle>
            <TopServicesFilter />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <AppHorizontalBarChart
              data={filteredPopularServices}
              config={popularServicesConfig}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
