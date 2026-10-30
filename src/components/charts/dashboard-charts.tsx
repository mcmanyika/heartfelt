"use client";

import Link from "next/link";
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

const COLORS = ["#0b1f3a", "#8b1e3f", "#c9a227", "#94a3b8", "#0f766e", "#2563eb", "#b45309"];

type DashboardChartsProps = {
  givingOverTime: Array<Record<string, string | number>>;
  currencies: string[];
  byCategory: Array<{ name: string; count: number }>;
  byMethod: Array<{ name: string; value: number }>;
  membersByLocation: Array<{ name: string; members: number }>;
  hrefs?: {
    giving?: string;
    members?: string;
    transactions?: string;
  };
};

export function GivingTrendChart({
  givingOverTime,
  currencies,
  href,
}: Pick<DashboardChartsProps, "givingOverTime" | "currencies"> & { href?: string }) {
  return (
    <ChartCard title="Giving over time" href={href}>
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

export function MembersByGenderChart({
  membersByGender,
  href,
  animationDelayMs = 0,
}: {
  membersByGender: Array<{ name: string; value: number }>;
  href?: string;
  animationDelayMs?: number;
}) {
  const total = membersByGender.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <ChartCard
      title="Members by gender"
      className="h-full"
      href={href}
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      {membersByGender.length === 0 ? (
        <EmptyChart message="No members in this scope" />
      ) : (
        <LegendPieChart
          data={membersByGender}
          emptyLabel="All genders hidden"
          interactive={!href}
          animationBegin={animationDelayMs}
          centerValue={total.toLocaleString("en-US")}
          centerLabel="Members"
          formatValue={(value) => value.toLocaleString("en-US")}
          align="end"
        />
      )}
    </ChartCard>
  );
}

export function GivingByMethodChart({
  byMethod,
  href,
  animationDelayMs = 0,
  centerLabel = "Total giving",
}: {
  byMethod: Array<{ name: string; value: number }>;
  href?: string;
  animationDelayMs?: number;
  /** Kept for call-site compatibility; amounts render without a currency code. */
  currency?: string;
  centerLabel?: string;
}) {
  const total = byMethod.reduce((sum, entry) => sum + entry.value, 0);
  const formatValue = (value: number) =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <ChartCard
      title="Giving by method"
      className="h-full"
      href={href}
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      {byMethod.length === 0 ? (
        <EmptyChart message="No giving in this range" />
      ) : (
        <LegendPieChart
          data={byMethod}
          emptyLabel="All methods hidden"
          interactive={!href}
          animationBegin={animationDelayMs}
          centerValue={formatValue(total)}
          centerLabel={centerLabel}
          formatValue={formatValue}
          align="end"
        />
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
  hrefs,
}: DashboardChartsProps) {
  return (
    <section aria-label="Charts" className="mt-6 grid gap-4 lg:grid-cols-2">
      <GivingTrendChart
        givingOverTime={givingOverTime}
        currencies={currencies}
        href={hrefs?.giving}
      />

      <ChartCard title="Giving by category" href={hrefs?.giving}>
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

      <ChartCard title="Members by location" href={hrefs?.members}>
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

      <ChartCard title="Transactions by payment method" href={hrefs?.transactions}>
        {byMethod.length === 0 ? (
          <EmptyChart />
        ) : (
          <LegendPieChart
            data={byMethod}
            emptyLabel="All methods hidden"
            interactive={!hrefs?.transactions}
            centerValue={byMethod
              .reduce((sum, entry) => sum + entry.value, 0)
              .toLocaleString("en-US")}
            centerLabel="Gifts"
            formatValue={(value) => value.toLocaleString("en-US")}
          />
        )}
      </ChartCard>
    </section>
  );
}

function LegendPieChart({
  data,
  emptyLabel,
  interactive = true,
  animationBegin = 120,
  centerValue,
  centerLabel,
  formatValue = (value) => String(value),
  align = "start",
}: {
  data: Array<{ name: string; value: number }>;
  emptyLabel: string;
  interactive?: boolean;
  animationBegin?: number;
  centerValue?: string;
  centerLabel?: string;
  formatValue?: (value: number) => string;
  align?: "start" | "end";
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const visibleTotal = data.reduce(
    (sum, entry) => (interactive && hidden.has(entry.name) ? sum : sum + entry.value),
    0,
  );
  const chartData = data.map((entry) => ({
    name: entry.name,
    value: interactive && hidden.has(entry.name) ? 0 : entry.value,
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
    <div className="flex min-h-[180px] w-full">
      <div
        className={cn(
          "flex items-center gap-5 sm:gap-6",
          align === "end" && "ml-auto",
        )}
      >
        <div className="relative h-[160px] w-[160px] shrink-0 sm:h-[172px] sm:w-[172px]">
          {allHidden ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              {emptyLabel}
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={2}
                    stroke="#ffffff"
                    strokeWidth={2}
                    isAnimationActive
                    animationBegin={animationBegin}
                    animationDuration={900}
                    animationEasing="ease-out"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatValue(Number(value))}
                    contentStyle={{
                      borderRadius: 8,
                      borderColor: "#e5e7eb",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {centerValue ? (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
                  <p className="max-w-[5.5rem] text-lg font-semibold leading-tight tracking-tight text-navy sm:text-xl">
                    {centerValue}
                  </p>
                  {centerLabel ? (
                    <p className="mt-0.5 text-[11px] font-medium text-gray-500">{centerLabel}</p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        <ul className="w-[14rem] shrink-0 space-y-2.5 text-sm sm:w-[16rem]">
          {data.map((entry, index) => {
            const inactive = interactive && hidden.has(entry.name);
            const percent =
              visibleTotal > 0 && !inactive
                ? Math.round((entry.value / visibleTotal) * 100)
                : 0;
            const row = (
              <>
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate font-medium text-navy">{entry.name}</span>
                <span className="shrink-0 tabular-nums text-navy">{formatValue(entry.value)}</span>
                <span className="w-9 shrink-0 text-right tabular-nums text-gray-500">{percent}%</span>
              </>
            );

            return (
              <li key={entry.name}>
                {interactive ? (
                  <button
                    type="button"
                    aria-pressed={!inactive}
                    onClick={() => toggle(entry.name)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-1 py-0.5 text-left transition-opacity hover:bg-background",
                      inactive && "opacity-40 line-through",
                    )}
                  >
                    {row}
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5 px-1 py-0.5">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className,
  href,
  style,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  href?: string;
  style?: React.CSSProperties;
}) {
  const cardClassName = cn(
    "chart-rise rounded-md border border-border bg-card p-5",
    href && "block transition-colors hover:border-navy/25 hover:bg-background/60",
    className,
  );
  const body = (
    <>
      <p className="text-sm font-semibold text-navy">{title}</p>
      <div className="mt-4">{children}</div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName} style={style} aria-label={`View ${title}`}>
        {body}
      </Link>
    );
  }

  return (
    <div className={cardClassName} style={style}>
      {body}
    </div>
  );
}

function EmptyChart({ message = "No giving in this range" }: { message?: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-md bg-background text-sm text-gray-500">
      {message}
    </div>
  );
}
