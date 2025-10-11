"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface AppAreaChartProps {
  data: {
    service: string;
    count: number;
    slug: string;
  }[];
  config: ChartConfig;
}

const AppAreaChart = ({ data: chartData, config }: AppAreaChartProps) => {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground">No data to display for this period.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px]">
      <ChartContainer config={config} className="w-full h-full">
        <BarChart
          accessibilityLayer
          data={chartData}
          layout="vertical"
          margin={{
            left: 20,
            right: 20,
            top: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid horizontal={false} />
          <YAxis
            dataKey="service"
            type="category"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            width={150}
            interval={0}
            tick={{
              fontSize: 12,
              fill: 'currentColor'
            }}
          />
          <XAxis
            dataKey="count"
            type="number"
            hide
          />
          <ChartTooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            content={<ChartTooltipContent />}
          />
          <Bar dataKey="count" radius={4}>
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.slug}`} fill={config[entry.slug]?.color} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
};

export default AppAreaChart;
