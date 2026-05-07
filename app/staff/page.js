"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";
import { ClipLoader } from "react-spinners";

const RED = "#b91c1c";

function shortStageName(name) {
    const map = {
        "Shortlisted Candidate": "Shortlisted",
        "Requested Interview": "Interview",
        "Hired Candidate": "Hired",
        Immigration: "Immigration",
        Placed: "Placed",
    };

    return map[name] || name;
}

function Card({ title, value, hint, icon, color = "red" }) {
    const colorMap = {
        red: "from-red-600 to-red-800",
        amber: "from-amber-500 to-orange-600",
        blue: "from-sky-500 to-blue-700",
        green: "from-emerald-500 to-green-700",
        purple: "from-violet-500 to-purple-700",
    };

    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className={`h-1.5 bg-gradient-to-r ${colorMap[color] || colorMap.red}`} />

            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-500">{title}</p>
                        <h2 className="mt-3 text-3xl font-extrabold text-gray-900">
                            {value}
                        </h2>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-2xl">
                        {icon}
                    </div>
                </div>

                {hint ? (
                    <div className="mt-4 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                        {hint}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function SkeletonCard() {
    return (
        <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="mt-5 h-8 w-20 rounded bg-gray-200" />
            <div className="mt-5 h-3 w-24 rounded bg-gray-100" />
        </div>
    );
}

function Section({ title, children, right, subtitle }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-lg font-extrabold text-gray-900">{title}</h2>
                    {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
                </div>
                {right}
            </div>

            {children}
        </div>
    );
}

function Badge({ children, color = "gray" }) {
    const map = {
        red: "bg-red-50 text-red-700 border-red-200",
        green: "bg-emerald-50 text-emerald-700 border-emerald-200",
        amber: "bg-amber-50 text-amber-700 border-amber-200",
        blue: "bg-sky-50 text-sky-700 border-sky-200",
        purple: "bg-purple-50 text-purple-700 border-purple-200",
        gray: "bg-gray-50 text-gray-700 border-gray-200",
    };

    return (
        <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${map[color] || map.gray
                }`}
        >
            {children}
        </span>
    );
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
            <div className="mb-1 text-sm font-bold text-gray-900">
                {shortStageName(label)}
            </div>

            {payload.map((item, index) => (
                <div key={index} className="text-sm text-gray-700">
                    {item.name}:{" "}
                    <span className="font-bold text-red-700">{item.value}</span>
                </div>
            ))}
        </div>
    );
}

export default function StaffDashboardPage() {
    const [data, setData] = useState(null);
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);
    const [chartReady, setChartReady] = useState(false);
    const [error, setError] = useState("");

    async function loadDashboard(selectedDays = days) {
        try {
            setLoading(true);
            setChartReady(false);
            setError("");

            const res = await fetch(`/api/staff/dashboard?days=${selectedDays}`, {
                cache: "no-store",
            });

            const json = await res.json();

            if (!res.ok || !json?.ok) {
                throw new Error(json?.error || "Failed to load dashboard");
            }

            setData(json);

            setTimeout(() => {
                setChartReady(true);
            }, 350);
        } catch (err) {
            setError(err?.message || "Dashboard error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDashboard(30);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stats = data?.stats || {};

    const totalPipeline = useMemo(() => {
        return (data?.pipelineChart || []).reduce(
            (sum, item) => sum + Number(item.value || 0),
            0
        );
    }, [data]);

    const vacancyProgress = useMemo(() => {
        const vacancies = Number(stats.totalVacancies || 0);
        const hired = Number(stats.totalPlacedOrHired || 0);
        if (!vacancies) return 0;
        return Math.min(100, Math.round((hired / vacancies) * 100));
    }, [stats]);

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/40 p-4 md:p-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-800 via-red-700 to-gray-950 p-6 text-white shadow-lg">
                    <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
                    <div className="absolute bottom-0 right-20 h-28 w-28 rounded-full bg-red-400/20" />

                    <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
                        <div>
                            <Badge color="red">Staff Reporting Dashboard</Badge>

                            <h1 className="mt-4 text-2xl font-extrabold md:text-4xl">
                                Hiring Process Overview
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-6 text-red-50">
                                Track open jobs, active clients, pipeline candidates, vacancies,
                                offer letters and hiring progress.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                value={days}
                                onChange={(e) => {
                                    const value = Number(e.target.value);
                                    setDays(value);
                                    loadDashboard(value);
                                }}
                                className="rounded-xl border border-white/20 bg-white px-4 py-2 text-sm font-bold text-gray-900 shadow-sm outline-none"
                            >
                                <option value={7}>Last 7 Days</option>
                                <option value={30}>Last 30 Days</option>
                                <option value={90}>Last 90 Days</option>
                            </select>

                            <button
                                onClick={() => loadDashboard(days)}
                                className="rounded-xl bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/25"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                        {error}
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {loading ? (
                        <>
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                        </>
                    ) : (
                        <>
                            <Card
                                title="Open Jobs"
                                value={stats.openJobs || 0}
                                hint="Currently open"
                                icon="💼"
                                color="red"
                            />

                            <Card
                                title="Hired Candidates"
                                value={stats.hiredCandidates || 0}
                                hint="Hired + Placed"
                                icon="✅"
                                color="green"
                            />

                            <Card
                                title="Pipeline Candidates"
                                value={stats.pipelineCandidates || 0}
                                hint={`${totalPipeline} in process`}
                                icon="📊"
                                color="blue"
                            />

                            <Card
                                title="Offer Letters"
                                value={stats.offerLetters || 0}
                                hint="Uploaded"
                                icon="📄"
                                color="amber"
                            />

                            <Card
                                title="Active Clients"
                                value={stats.activeClients || 0}
                                hint="Active clients"
                                icon="🏢"
                                color="purple"
                            />
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <Section
                        title="Hiring Pipeline"
                        subtitle="Stage wise candidate movement"
                        right={<Badge color="red">Live Report</Badge>}
                    >
                        {!chartReady ? (
                            <div className="flex h-[340px] items-center justify-center">
                                <div className="text-center">
                                    <ClipLoader size={42} color={RED} />
                                    <p className="mt-3 text-sm font-semibold text-gray-500">
                                        Loading pipeline chart...
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-[340px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.pipelineChart || []}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 11 }}
                                            interval={0}
                                            height={70}
                                            tickFormatter={shortStageName}
                                        />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar
                                            dataKey="value"
                                            name="Candidates"
                                            fill={RED}
                                            radius={[10, 10, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </Section>

                    <Section
                        title="Pipeline Summary"
                        subtitle="Current candidates by stage"
                        right={<Badge color="blue">Open Jobs</Badge>}
                    >
                        {!chartReady ? (
                            <div className="flex h-[340px] items-center justify-center">
                                <ClipLoader size={42} color={RED} />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {(data?.pipelineChart || []).map((item) => {
                                    const max = Math.max(
                                        ...(data?.pipelineChart || []).map((x) => Number(x.value || 0)),
                                        1
                                    );

                                    const percent = Math.round((Number(item.value || 0) / max) * 100);

                                    return (
                                        <div key={item.name}>
                                            <div className="mb-1 flex items-center justify-between text-sm">
                                                <span className="font-bold text-gray-800">
                                                    {shortStageName(item.name)}
                                                </span>
                                                <span className="font-extrabold text-red-700">
                                                    {item.value}
                                                </span>
                                            </div>

                                            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-800"
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Section>
                </div>

                <Section
                    title="Jobs Performance"
                    subtitle="Vacancies compared with hired and placed candidates"
                    right={<Badge color="green">Vacancy Progress</Badge>}
                >
                    {loading ? (
                        <div className="flex h-48 items-center justify-center">
                            <div className="text-center">
                                <ClipLoader size={38} color={RED} />
                                <p className="mt-3 text-sm font-semibold text-gray-500">
                                    Loading jobs report...
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-gray-100">
                            <table className="w-full min-w-[1150px] text-left text-sm">
                                <thead>
                                    <tr className="bg-gradient-to-r from-red-700 to-gray-900 text-xs uppercase text-white">
                                        <th className="px-4 py-4">Job</th>
                                        <th className="px-4 py-4">Client</th>
                                        <th className="px-4 py-4">Vacancies</th>
                                        <th className="px-4 py-4">Shortlisted</th>
                                        <th className="px-4 py-4">Interview</th>
                                        <th className="px-4 py-4">Hired</th>
                                        <th className="px-4 py-4">Immigration</th>
                                        <th className="px-4 py-4">Placed</th>
                                        <th className="px-4 py-4">Progress</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {(data?.jobsPerformance || []).length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={9}
                                                className="px-4 py-10 text-center text-sm font-semibold text-gray-500"
                                            >
                                                No open jobs found.
                                            </td>
                                        </tr>
                                    ) : (
                                        (data?.jobsPerformance || []).map((job, index) => {
                                            const vacancies = Number(job.vacanciesNo || 0);
                                            const hired = Number(job.progressHired || 0);
                                            const progress = vacancies
                                                ? Math.min(100, Math.round((hired / vacancies) * 100))
                                                : 0;

                                            return (
                                                <tr
                                                    key={`${job.documentId || job.referenceNo}-${index}`}
                                                    className="border-b bg-white transition hover:bg-red-50/40"
                                                >
                                                    <td className="px-4 py-4">
                                                        <div className="font-extrabold text-gray-900">
                                                            {job.title}
                                                        </div>
                                                        <div className="mt-1 text-xs font-semibold text-gray-500">
                                                            {job.referenceNo}
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4 text-gray-700">
                                                        {job.clientName}
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <Badge color="red">{job.vacanciesNo || 0}</Badge>
                                                    </td>

                                                    <td className="px-4 py-4 font-bold text-sky-700">
                                                        {job.shortlisted || 0}
                                                    </td>

                                                    <td className="px-4 py-4 font-bold text-amber-700">
                                                        {job.requestedInterview || 0}
                                                    </td>

                                                    <td className="px-4 py-4 font-bold text-emerald-700">
                                                        {job.hired || 0}
                                                    </td>

                                                    <td className="px-4 py-4 font-bold text-purple-700">
                                                        {job.immigration || 0}
                                                    </td>

                                                    <td className="px-4 py-4 font-bold text-red-700">
                                                        {job.placed || 0}
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-2.5 w-44 overflow-hidden rounded-full bg-gray-200">
                                                                <div
                                                                    className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-900"
                                                                    style={{ width: `${progress}%` }}
                                                                />
                                                            </div>

                                                            <span className="text-xs font-extrabold text-gray-700">
                                                                {progress}%
                                                            </span>
                                                        </div>

                                                        <div className="mt-1 text-xs font-semibold text-gray-500">
                                                            {hired}/{vacancies} hired / placed
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Section>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <Section
                        title="Recent Pipeline Activity"
                        subtitle="Latest movement from jobs pipeline"
                        right={<Badge color="purple">Recent</Badge>}
                    >
                        {loading ? (
                            <div className="flex h-36 items-center justify-center">
                                <ClipLoader size={32} color={RED} />
                            </div>
                        ) : data?.recentActivity?.length ? (
                            <div className="space-y-3">
                                {data.recentActivity.map((item, index) => (
                                    <div
                                        key={index}
                                        className="rounded-2xl border border-gray-200 bg-gradient-to-r from-white to-red-50/50 p-4"
                                    >
                                        <div className="text-sm font-bold text-gray-900">
                                            {item.text}
                                        </div>

                                        <div className="mt-1 text-xs font-semibold text-gray-500">
                                            {item.date ? new Date(item.date).toLocaleString() : ""}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm font-semibold text-gray-500">
                                No recent activity found.
                            </p>
                        )}
                    </Section>

                    <Section
                        title="Hiring Insights"
                        subtitle="Real-time summary from current report data"
                        right={<Badge color="amber">Insights</Badge>}
                    >
                        {loading ? (
                            <div className="flex h-36 items-center justify-center">
                                <ClipLoader size={32} color={RED} />
                            </div>
                        ) : (
                            <div className="space-y-3 text-sm text-gray-700">
                                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                                    <b className="text-red-800">Vacancy Coverage:</b>{" "}
                                    {stats.totalPlacedOrHired || 0} of {stats.totalVacancies || 0}{" "}
                                    required vacancies are hired or placed. Overall progress is{" "}
                                    <b>{vacancyProgress}%</b>.
                                </div>

                                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                                    <b className="text-amber-800">Interview Follow-up:</b>{" "}
                                    {stats.interviewCandidates || 0} candidate(s) are currently in
                                    interview stage.
                                </div>

                                <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
                                    <b className="text-purple-800">Immigration Stage:</b>{" "}
                                    {stats.immigrationCandidates || 0} candidate(s) are in
                                    immigration process.
                                </div>

                                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                                    <b className="text-sky-800">Open Jobs Attention:</b>{" "}
                                    {stats.jobsWithoutCandidates || 0} open job(s) have no assigned
                                    candidates, and {stats.jobsLowProgress || 0} job(s) are below
                                    50% hiring progress.
                                </div>
                            </div>
                        )}
                    </Section>
                </div>
            </div>
        </main>
    );
}