"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { TableContainer, Table, THead, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { BarList, GroupedBarChart } from "@/components/ui/charts";
import { BarChartIcon, CalendarIcon, CheckCircleIcon, RefreshIcon, XCircleIcon } from "@/components/ui/icons";

interface ReportData {
  daily: { entry_date: string; status: string; count: number }[];
  byMeal: { meal_type: string; status: string; count: number }[];
  byMess: { mess_id: number; mess_name: string; status: string; count: number }[];
  totals: { approved: number; rejected: number };
}

export default function ReportsPanel() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/reports?${params}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          icon={<BarChartIcon className="h-4 w-4" />}
          title="Report range"
          description="Choose a date range to summarize mess entries."
        />
        <CardBody>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="From" htmlFor="report-from">
              <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To" htmlFor="report-to">
              <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Button onClick={load} loading={loading} variant="outline">
              <RefreshIcon className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardBody>
      </Card>

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Approved entries"
              value={data.totals.approved}
              icon={<CheckCircleIcon className="h-4 w-4" />}
              tone="green"
              hint={`${from} → ${to}`}
            />
            <StatCard
              label="Rejected entries"
              value={data.totals.rejected}
              icon={<XCircleIcon className="h-4 w-4" />}
              tone="red"
              hint={`${from} → ${to}`}
            />
          </div>

          <Card>
            <CardHeader
              icon={<CalendarIcon className="h-4 w-4" />}
              title="Entries per day"
              description="Approved vs. rejected mess entries across the selected range."
            />
            <CardBody>
              <GroupedBarChart
                data={pivotDaily(data.daily)}
              />
            </CardBody>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader title="Entries by meal" description="Total entries, all statuses." />
              <CardBody>
                <BarList data={pivotTotals(data.byMeal, "meal_type")} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Entries by mess" description="Total entries, all statuses." />
              <CardBody>
                <BarList data={pivotTotals(data.byMess, "mess_name")} />
              </CardBody>
            </Card>
          </div>

          <ReportTable title="By meal type" rows={data.byMeal} labelKey="meal_type" capitalize />
          <ReportTable title="By mess" rows={data.byMess} labelKey="mess_name" />
          <ReportTable title="Daily breakdown" rows={data.daily} labelKey="entry_date" icon={<CalendarIcon className="h-4 w-4" />} />
        </>
      ) : null}
    </div>
  );
}

function ReportTable<T extends { status: string; count: number }>({
  title,
  rows,
  labelKey,
  capitalize = false,
  icon,
}: {
  title: string;
  rows: T[];
  labelKey: keyof T;
  capitalize?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        {icon}
        {title}
      </h3>
      {rows.length === 0 ? (
        <EmptyState title="No data for this range" />
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <Th>{String(labelKey).replace("_", " ")}</Th>
              <Th>Status</Th>
              <Th>Count</Th>
            </THead>
            <TBody>
              {rows.map((row, i) => (
                <Tr key={i}>
                  <Td className={`font-medium text-slate-900 ${capitalize ? "capitalize" : ""}`}>
                    {labelKey === "entry_date"
                      ? new Date(String(row[labelKey])).toLocaleDateString()
                      : String(row[labelKey])}
                  </Td>
                  <Td>
                    <Badge tone={row.status === "approved" ? "green" : "red"}>{row.status}</Badge>
                  </Td>
                  <Td>{row.count}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}

function pivotDaily(rows: ReportData["daily"]) {
  const byDate = new Map<string, { approved: number; rejected: number }>();
  for (const row of rows) {
    const entry = byDate.get(row.entry_date) ?? { approved: 0, rejected: 0 };
    if (row.status === "approved") entry.approved += row.count;
    else entry.rejected += row.count;
    byDate.set(row.entry_date, entry);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      label: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      ...counts,
    }));
}

function pivotTotals<T extends { status: string; count: number }>(rows: T[], labelKey: keyof T) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const label = String(row[labelKey]);
    totals.set(label, (totals.get(label) ?? 0) + row.count);
  }
  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}
