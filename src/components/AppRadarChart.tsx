"use client";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface AppLineChartProps {
  data: {
    time: string;
    appointments: number;
  }[];
}

const chartConfig = {
  appointments: {
    label: "Appointments",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const AppLineChart = ({ data: chartData }: AppLineChartProps) => {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] w-full flex-col items-center justify-center gap-2">
        <h1 className="text-lg font-medium">Appointment Frequency</h1>
        <p className="text-muted-foreground">No data to display for this period.</p>
      </div>
    );
  }

  // Filter data to show only business hours (11:00 to 19:00 / 7:00 PM)
  const businessHoursData = chartData.filter(item => {
    if (!item?.time) {
      return false;
    }
    const hour = parseInt(item.time.split(':')[0], 10);
    return hour >= 11 && hour <= 19;
  }).map(item => ({
    ...item,
    // Convert 24-hour format to 12-hour format for display
    displayTime: formatTime(item.time)
  }));

  // Helper function to format time for display
  function formatTime(time24: string): string {
    const [hour24] = time24.split(':');
    const hour = parseInt(hour24, 10);

    if (hour === 12) return '12 PM';
    if (hour > 12) return `${hour - 12} PM`;
    if (hour === 0) return '12 AM';
    return `${hour} AM`;
  }

  if (businessHoursData.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] w-full flex-col items-center justify-center gap-2">
        <h1 className="text-lg font-medium">Appointment Frequency (11 AM - 7 PM)</h1>
        <p className="text-muted-foreground">No appointments during business hours for this period.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-lg font-medium mb-6">Appointment Frequency by Hour (11 AM - 7 PM)</h1>
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[400px]"
      >
        <RadarChart
          data={businessHoursData}
        >
          <defs>
            <radialGradient id="fillAppointmentsGradient">
              <stop offset="5%" stopColor={chartConfig.appointments.color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={chartConfig.appointments.color} stopOpacity={0.1} />
            </radialGradient>
          </defs>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" />}
          />
          <PolarAngleAxis dataKey="displayTime" />
          <PolarGrid />
          <Radar
            name="Appointments"
            dataKey="appointments"
            stroke={chartConfig.appointments.color}
            fill="url(#fillAppointmentsGradient)"
            dot={{
              r: 4,
              fill: chartConfig.appointments.color,
              fillOpacity: 1,
            }}
          />
        </RadarChart>
      </ChartContainer>
    </div>
  );
};

export default AppLineChart;
