"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

interface LinePoint {
  label: string;
  myScore: number | null;
  classAvg: number | null;
}

interface BarPoint {
  type: string;
  myAvg: number | null;
  classAvg: number | null;
}

interface ProgressChartsProps {
  lineData: LinePoint[];
  barData: BarPoint[];
}

export function ProgressCharts({ lineData, barData }: ProgressChartsProps) {
  return (
    <div className="space-y-8">
      {/* Line chart */}
      <div>
        <h3 className="text-sm font-semibold mb-4">คะแนน % ของฉัน vs ค่าเฉลี่ยชั้น (เรียงตาม deadline)</h3>
        {lineData.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">ยังไม่มีข้อมูลคะแนน</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}%`]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="myScore"
                name="คะแนนของฉัน"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="classAvg"
                name="ค่าเฉลี่ยชั้น"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={{ r: 3 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bar chart */}
      <div>
        <h3 className="text-sm font-semibold mb-4">คะแนนเฉลี่ยแยกตามประเภทงาน</h3>
        {barData.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">ยังไม่มีข้อมูลคะแนน</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="type"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}%`]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="myAvg" name="คะแนนของฉัน" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="classAvg" name="ค่าเฉลี่ยชั้น" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
