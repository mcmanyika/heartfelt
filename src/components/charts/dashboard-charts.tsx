"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils/cn";

const COLORS = ["#0b1f3a", "#8b1e3f", "#c9a227", "#334155", "#0f766e", "#2563eb", "#b45309"];

type DashboardChartsProps = {
  givingOverTime: Array<Record<string, string | number>>;
  currencies: string[];
  byCategory: Array<{ name: string; count: number }>;
  byMethod: Array<{ name: string; value: number }>;
  membersByLocation: Array<{ name: string; members: number }>;
};

export function GivingTrendChart({
  givingOverTime,
  currencies,
}: Pick<DashboardChartsProps, "givingOverTime" | "currencies">) {
  return (
    <ChartCard title="Giving over time">
      {givingOverTime.length === 0 ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={givingOverTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {currencies.map((currency, index) => (
              <Line
                key={currency}
                type="monotone"
                dataKey={currency}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function DashboardCharts({
  givingOverTime,
  currencies,
  byCategory,
  byMethod,
  membersByLocation,
}: DashboardChartsProps) {
  return (
    <section aria-label="Charts" className="mt-6 grid gap-4 lg:grid-cols-2">
      <GivingTrendChart givingOverTime={givingOverTime} currencies={currencies} />

      <ChartCard title="Giving by category">
        {byCategory.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b1e3f" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Members by location">
        {membersByLocation.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={membersByLocation}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="members" fill="#0b1f3a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Transactions by payment method">
        {byMethod.length === 0 ? <EmptyChart /> : <PaymentMethodChart byMethod={byMethod} />}
      </ChartCard>
    </section>
  );
}

function PaymentMethodChart({ byMethod }: { byMethod: Array<{ name: string; value: number }> }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const chartData = byMethod.map((entry) => ({
    name: entry.name,
    value: hidden.has(entry.name) ? 0 : entry.value,
  }));
  const allHidden = chartData.every((entry) => entry.value === 0);

  function toggle(name: string) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  return (
    <div className="flex h-[220px] items-center gap-4">
      <div className="h-full min-w-0 flex-1">
        {allHidden ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">All methods hidden</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <ul className="shrink-0 space-y-1 text-sm">
        {byMethod.map((entry, index) => {
          const inactive = hidden.has(entry.name);
          return (
            <li key={entry.name}>
              <button
                type="button"
                aria-pressed={!inactive}
                onClick={() => toggle(entry.name)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-navy transition-opacity hover:bg-background",
                  inactive && "opacity-40 line-through",
                )}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  aria-hidden="true"
                />
                <span>{entry.name}</span>
                <span className="tabular-nums text-gray-500">{entry.value}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-semibold text-navy">{title}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl bg-background text-sm text-gray-500">
      No giving in this range
    </div>
  );
}
