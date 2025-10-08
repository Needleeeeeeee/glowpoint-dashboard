"use client";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartConfig = {
  success: {
    label: "Success",
    color: "var(--chart-2)",
  },
  pending: {
    label: "Pending",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

interface AppBarChartProps {
  data: {
    date: string;
    success: number;
    pending: number;
  }[];
}

const AppBarChart = ({ data: chartData }: AppBarChartProps) => {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2">
        <h1 className="text-lg font-medium">Total Billings</h1>
        <p className="text-muted-foreground">No data to display for this period.</p>
      </div>
    );
  }

  return (
    <div className="">
      <h1 className="text-lg font-medium mb-6">Total Billings</h1>
      <ChartContainer config={chartConfig} className="min-h-[150px] w-full max-h-[450px]">
        <BarChart accessibilityLayer data={chartData}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) => `₱${value}`}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => {
                  const capitalizedName =
                    typeof name === "string"
                      ? name.charAt(0).toUpperCase() + name.slice(1)
                      : name;

                  return (
                    <div className="w-full flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-muted-foreground">
                          {capitalizedName}
                        </span>
                      </div>
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        ₱{typeof value === "number" ? value.toLocaleString() : value}
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          <Bar dataKey="success" fill="var(--color-success)" radius={4} minPointSize={5} barSize={20} />
          <Bar dataKey="pending" fill="var(--color-pending)" radius={4} minPointSize={5} barSize={20} />
        </BarChart>
      </ChartContainer>
    </div>
  );
};

export default AppBarChart;
