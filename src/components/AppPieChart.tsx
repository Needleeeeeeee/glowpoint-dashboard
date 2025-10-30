"use client";

import { Cell, Label, Pie, PieChart } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface AppPieChartProps {
  data: {
    date: string;
    success: number;
    pending: number;
    failed: number;
    assigned: number;
    verified: number;
  }[];
  dateRangeText: string;
  config: ChartConfig;
}

// Fallback colors for appointment statuses
const STATUS_COLORS = {
  success: "#10b981", // Green
  pending: "#f59e0b", // Amber
  failed: "#ef4444",  // Red
  assigned: "#3b82f6", // Blue
  verified: "#8b5cf6", // Violet
};

const AppPieChart = ({ data: chartData, dateRangeText, config }: AppPieChartProps) => {
  console.log('Pie chart config:', config);
  console.log('Pie chart data:', chartData);

  const { totalSuccess, totalPending, totalFailed, totalAssigned, totalVerified, totalAppointments } = chartData.reduce(
    (acc, curr) => {
      acc.totalSuccess += curr.success;
      acc.totalPending += curr.pending;
      acc.totalFailed += curr.failed;
      acc.totalAssigned += curr.assigned;
      acc.totalVerified += curr.verified;
      acc.totalAppointments += curr.success + curr.pending + curr.failed + curr.assigned + curr.verified;
      return acc;
    },
    { totalSuccess: 0, totalPending: 0, totalFailed: 0, totalAssigned: 0, totalVerified: 0, totalAppointments: 0 }
  );

  const pieData = [
    { status: "success", name: "Success", count: totalSuccess },
    { status: "pending", name: "Pending", count: totalPending },
    { status: "failed", name: "Failed", count: totalFailed },
    { status: "assigned", name: "Assigned", count: totalAssigned },
    { status: "verified", name: "Verified", count: totalVerified },
  ].filter(item => item.count > 0);

  // Function to get color for a status
  const getStatusColor = (status: string) => {
    // First try to get from config
    if (config[status]?.color) return config[status].color;

    // Fallback to our color mapping
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.success;
  };

  if (!chartData || chartData.length === 0 || totalAppointments === 0) {
    return (
      <div className="flex h-full min-h-[250px] w-full flex-col items-center justify-center gap-2">
        <div className="flex w-full items-center justify-between px-2">
          <h1 className="text-lg font-medium">Appointment Status</h1>
        </div>
        <div className="flex flex-1 items-center">
          <p className="text-muted-foreground">No appointments to display for this period.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-medium">Appointment Status</h1>
      </div>
      <ChartContainer
        config={config}
        className="max-h-[280px] aspect-square mx-auto"
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={pieData}
            dataKey="count"
            nameKey="status"
            innerRadius={60}
            outerRadius={120}
            strokeWidth={2}
            stroke="white"
          >
            {pieData.map((entry, index) => {
              const color = getStatusColor(entry.status);
              console.log(`Cell color for ${entry.status}:`, color);

              return (
                <Cell
                  key={`cell-${entry.status}-${index}`}
                  fill={color}
                  className="hover:opacity-80 transition-all duration-200"
                  style={{
                    filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))'
                  }}
                />
              );
            })}
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-3xl font-bold"
                      >
                        {totalAppointments.toLocaleString()}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 24}
                        className="fill-muted-foreground text-sm"
                      >
                        Appointments
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {pieData.map((entry) => (
          <div key={`legend-${entry.status}`} className="flex items-center gap-2">
            <div
              className="size-3 rounded-full"
              style={{ backgroundColor: getStatusColor(entry.status) }}
            />
            <span className="text-sm text-muted-foreground">
              {entry.name}: {entry.count}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 items-center text-center text-sm text-muted-foreground leading-none">
        {dateRangeText}
      </div>
    </div>
  );
};

export default AppPieChart;
