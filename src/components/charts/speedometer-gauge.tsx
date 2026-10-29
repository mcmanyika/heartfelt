"use client";

import { useEffect, useState } from "react";
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils/cn";

type SpeedometerGaugeProps = {
  label: string;
  value: number;
  max: number;
  detail?: string;
  className?: string;
  animationDelayMs?: number;
};

function gaugeFill(percent: number) {
  if (percent >= 70) {
    return "#0b1f3a";
  }
  if (percent >= 40) {
    return "#c9a227";
  }
  return "#8b1e3f";
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    function onChange() {
      setReduced(media.matches);
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useCountUp(target: number, enabled: boolean, durationMs: number, delayMs: number) {
  const [display, setDisplay] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled) {
      setDisplay(target);
      return;
    }

    let frame = 0;
    let startAt = 0;
    const timeout = window.setTimeout(() => {
      startAt = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startAt) / durationMs);
        const eased = 1 - (1 - progress) ** 3;
        setDisplay(Math.round(target * eased));
        if (progress < 1) {
          frame = window.requestAnimationFrame(tick);
        }
      };
      frame = window.requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(frame);
    };
  }, [delayMs, durationMs, enabled, target]);

  return display;
}

export function SpeedometerGauge({
  label,
  value,
  max,
  detail,
  className,
  animationDelayMs = 0,
}: SpeedometerGaugeProps) {
  const reducedMotion = usePrefersReducedMotion();
  const safeMax = max > 0 ? max : 0;
  const percent = safeMax === 0 ? 0 : Math.min(100, Math.round((value / safeMax) * 100));
  const displayPercent = useCountUp(percent, !reducedMotion, 900, animationDelayMs);
  const data = [{ name: label, value: percent, fill: gaugeFill(percent) }];

  return (
    <article
      className={cn(
        "chart-rise rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_2px_rgba(11,31,58,0.04)]",
        className,
      )}
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <p className="text-center text-xs font-semibold tracking-[0.12em] text-gray-500 uppercase">
        {label}
      </p>
      <div className="relative mx-auto mt-1 h-40 w-full max-w-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="78%"
            innerRadius="68%"
            outerRadius="100%"
            barSize={16}
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              background={{ fill: "#e8eaee" }}
              dataKey="value"
              cornerRadius={10}
              isAnimationActive={!reducedMotion}
              animationBegin={animationDelayMs}
              animationDuration={1100}
              animationEasing="ease-out"
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center">
          <p className="text-3xl font-semibold tracking-tight text-navy">{displayPercent}%</p>
        </div>
      </div>
      {detail ? <p className="mt-1 text-center text-xs text-gray-500">{detail}</p> : null}
    </article>
  );
}
