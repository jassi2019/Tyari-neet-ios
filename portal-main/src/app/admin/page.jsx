"use client";

import * as Icons from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState, useEffect } from "react";
import { getStats } from "@/services/stats";
import Loader from "@/components/custom/loader";
import useToast from "@/hooks/useToast";

export default function Dashboard() {
  const [metrics, setMetrics] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data } = await getStats();
      setMetrics(data);
      setSelectedMetric(data[0]);
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName, color) => {
    const Icon = Icons[iconName];
    return Icon ? <Icon className="h-5 w-5" style={{ color }} /> : null;
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading || !selectedMetric) return <Loader />;

  const now = new Date();
  const timeGreeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 px-6 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {timeGreeting} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Here&apos;s what&apos;s happening with Taiyari NEET Ki today.
            </p>
          </div>
          <div className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full border border-border">
            {now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => {
            const isSelected = selectedMetric.id === metric.id;
            return (
              <button
                key={metric.id}
                onClick={() => setSelectedMetric(metric)}
                className={cn(
                  "text-left rounded-xl p-5 border transition-all duration-200 cursor-pointer w-full",
                  isSelected
                    ? "border-primary/60 bg-primary/10 shadow-lg shadow-primary/10"
                    : "border-border bg-card hover:border-primary/30 hover:bg-secondary/50"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </span>
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${metric.color}20` }}
                  >
                    {getIcon(metric.icon, metric.color)}
                  </div>
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {metric.total}
                </div>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
                <p
                  className={`text-xs mt-1 font-medium ${
                    metric.trend < 0 ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {metric.trend >= 0 ? "+" : ""}{metric.trend} from last month
                </p>
              </button>
            );
          })}
        </div>

        {/* Chart */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-foreground">
              {selectedMetric.title} — Monthly Trend
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click a card above to switch metric
            </p>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={selectedMetric.data}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={selectedMetric.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={selectedMetric.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 9%)",
                    border: "1px solid hsl(222, 47%, 15%)",
                    borderRadius: "8px",
                    color: "hsl(213, 31%, 91%)",
                    fontSize: "12px",
                  }}
                  formatter={(value) =>
                    selectedMetric.formatValue
                      ? [selectedMetric.formatValue(value), selectedMetric.title]
                      : [value.toLocaleString(), selectedMetric.title]
                  }
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={selectedMetric.color}
                  strokeWidth={2}
                  fill="url(#colorGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
