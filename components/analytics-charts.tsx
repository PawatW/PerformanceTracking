"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

interface ScoreDistributionProps {
  data: { range: string; count: number; fill: string }[];
  mean: number;
}

export function ScoreDistributionChart({ data, mean }: ScoreDistributionProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="range" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
        <Tooltip
          formatter={(value: number) => [value, "นักศึกษา"]}
          labelFormatter={(label) => `ช่วงคะแนน: ${label}`}
        />
        <ReferenceLine
          x={`${Math.floor(mean / 10) * 10}-${Math.floor(mean / 10) * 10 + 9}`}
          stroke="#6366f1"
          strokeDasharray="4 4"
          label={{ value: `mean ${mean.toFixed(1)}`, position: "top", fontSize: 11, fill: "#6366f1" }}
        />
        <Bar dataKey="count" name="นักศึกษา" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface CompletionRateProps {
  data: { name: string; onTime: number; late: number; missing: number }[];
}

export function CompletionRateChart({ data }: CompletionRateProps) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 48)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="onTime" name="ตรงเวลา" stackId="a" fill="var(--color-success, #22c55e)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="late" name="สาย" stackId="a" fill="var(--color-warning, #eab308)" />
        <Bar dataKey="missing" name="ไม่ส่ง" stackId="a" fill="var(--color-danger, #ef4444)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface RadarByTypeProps {
  data: { type: string; avg: number; fullMark: number }[];
}

export function RadarByTypeChart({ data }: RadarByTypeProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid />
        <PolarAngleAxis dataKey="type" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Radar
          name="คะแนนเฉลี่ย"
          dataKey="avg"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.35}
        />
        <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "คะแนนเฉลี่ย"]} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
