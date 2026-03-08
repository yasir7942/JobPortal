"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/app/components/layouts/client/Header";

export default function Dashboard() {
    // Dummy jobs (replace with DB later)
    const initialJobs = useMemo(
        () => [
            {
                id: "101",
                title: "CNC Machine Operator",
                type: "Full-time",
                location: "Dubai, UAE",
                salaryMin: 2500,
                salaryMax: 3200,
                experience: "2+ years",
                description:
                    "Operate CNC machines, read drawings, measure parts, maintain quality standards, and follow safety procedures. Handle routine maintenance, tooling changes, and production reporting.",
                requirements: [
                    "2+ years CNC experience",
                    "Can read technical drawings",
                    "Basic measuring tools knowledge",
                ],
            },
            {
                id: "102",
                title: "Electrician",
                type: "Contract",
                location: "Abu Dhabi, UAE",
                salaryMin: 2200,
                salaryMax: 2800,
                experience: "1+ year",
                description:
                    "Install and maintain electrical wiring, troubleshoot faults, ensure compliance with safety standards, and complete assigned site tasks efficiently.",
                requirements: ["1+ year experience", "Basic troubleshooting", "Safety compliance"],
            },
            {
                id: "103",
                title: "Car Mechanic",
                type: "Full-time",
                location: "Sharjah, UAE",
                salaryMin: 2400,
                salaryMax: 3000,
                experience: "2+ years",
                description:
                    "Diagnose vehicle issues, perform repairs and maintenance, use diagnostic tools, and ensure quality workmanship in a timely manner.",
                requirements: ["2+ years experience", "Engine diagnostics", "Good communication"],
            },
            {
                id: "104",
                title: "Fabricator",
                type: "Full-time",
                location: "Dubai, UAE",
                salaryMin: 2300,
                salaryMax: 3100,
                experience: "2+ years",
                description:
                    "Read fabrication drawings, cut/assemble parts, handle welding/finishing tasks, and maintain product quality according to standards.",
                requirements: ["Drawing reading", "Welding basics", "Quality focus"],
            },
        ],
        []
    );

    // ✅ Make jobs editable so we can add new job from popup
    const [jobs, setJobs] = useState(initialJobs);

    const [viewJob, setViewJob] = useState(null); // job object or null
    const closeView = () => setViewJob(null);

    // ✅ Create Job popup state
    const [createOpen, setCreateOpen] = useState(false);
    const [createErrors, setCreateErrors] = useState({});
    const [reqInput, setReqInput] = useState("");

    const [newJob, setNewJob] = useState({
        title: "",
        type: "Full-time",
        location: "",
        salaryMin: "",
        salaryMax: "",
        experience: "",
        description: "",
        requirements: [],
    });

    const closeCreate = () => {
        setCreateOpen(false);
        setCreateErrors({});
        setReqInput("");
        setNewJob({
            title: "",
            type: "Full-time",
            location: "",
            salaryMin: "",
            salaryMax: "",
            experience: "",
            description: "",
            requirements: [],
        });
    };

    // ESC to close create popup
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") {
                if (createOpen) closeCreate();
                if (viewJob) closeView();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [createOpen, viewJob]);

    const onNewJobChange = (key, value) => {
        setNewJob((p) => ({ ...p, [key]: value }));
        setCreateErrors((p) => ({ ...p, [key]: "" }));
    };

    const addRequirement = () => {
        const val = reqInput.trim();
        if (!val) return;
        setNewJob((p) => ({
            ...p,
            requirements: p.requirements.includes(val) ? p.requirements : [...p.requirements, val],
        }));
        setReqInput("");
    };

    const removeRequirement = (idx) => {
        setNewJob((p) => {
            const next = [...p.requirements];
            next.splice(idx, 1);
            return { ...p, requirements: next };
        });
    };

    const validateCreate = () => {
        const e = {};
        if (!newJob.title.trim()) e.title = "Job title is required";
        if (!newJob.location.trim()) e.location = "Location is required";
        if (!newJob.experience.trim()) e.experience = "Experience is required";
        if (!newJob.description.trim()) e.description = "Description is required";

        const min = Number(newJob.salaryMin);
        const max = Number(newJob.salaryMax);

        if (!newJob.salaryMin || Number.isNaN(min) || min <= 0) e.salaryMin = "Enter valid min salary";
        if (!newJob.salaryMax || Number.isNaN(max) || max <= 0) e.salaryMax = "Enter valid max salary";
        if (!e.salaryMin && !e.salaryMax && min > max) e.salaryMax = "Max salary must be >= min salary";

        if (!newJob.requirements.length) e.requirements = "Add at least 1 requirement";

        setCreateErrors(e);
        return Object.keys(e).length === 0;
    };

    const submitCreateJob = async () => {
        if (!validateCreate()) return;

        // ✅ create a dummy ID (replace with Strapi response ID later)
        const id = String(Date.now());

        const jobToAdd = {
            id,
            title: newJob.title.trim(),
            type: newJob.type,
            location: newJob.location.trim(),
            salaryMin: Number(newJob.salaryMin),
            salaryMax: Number(newJob.salaryMax),
            experience: newJob.experience.trim(),
            description: newJob.description.trim(),
            requirements: newJob.requirements,
        };

        // ✅ update UI
        setJobs((prev) => [jobToAdd, ...prev]);

        // ✅ TODO: Strapi API call here (create job)
        // await fetch("/api/jobs", { method:"POST", body: JSON.stringify(jobToAdd) })

        closeCreate();
    };

    return (
        <>
            <Header />

            <div className="mt-10 p-6 font-bold text-5xl text-red-700 border-b border-gray-300">
                Jobs
            </div>

            <div className="w-full mx-auto p-4">
                <div className="flex items-center justify-end mb-4">
                    {/* ✅ open popup */}
                    <button
                        onClick={() => setCreateOpen(true)}
                        className="px-8 py-3 text-base rounded-lg bg-red-700 text-white hover:opacity-90 whitespace-nowrap"
                    >
                        + Create Job
                    </button>
                </div>

                <div className="space-y-3">
                    {jobs.map((job) => (
                        <div
                            key={job.id}
                            className="border border-gray-200 rounded-xl p-2 flex flex-col md:flex-row md:items-center gap-3"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/client/jobs/${job.id}`}
                                        className="text-lg font-semibold text-red-700 hover:underline"
                                    >
                                        {job.title}
                                    </Link>

                                    <span className="text-xs px-2 py-1 text-blue-500 bg-gray-100">
                                        {job.type}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-600 mt-1">
                                    Location: {job.location} • Salary: AED {job.salaryMin}–{job.salaryMax} •
                                    Experience: {job.experience}
                                </p>

                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                                    {job.description}
                                </p>
                            </div>

                            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2 sm:justify-end">
                                <button
                                    onClick={() => setViewJob(job)}
                                    className="text-sm rounded-lg border px-6 py-3 border-gray-300 hover:bg-gray-50 w-full sm:w-auto"
                                >
                                    View Job
                                </button>

                                <Link
                                    href={`/client/jobs/${job.id}`}
                                    className="px-6 py-3 text-sm rounded-lg bg-blue-500 text-white hover:opacity-90 w-full sm:w-auto text-center"
                                >
                                    Select Job
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ✅ Create Job Dialog */}
            {createOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeCreate();
                    }}
                >
                    <div className="absolute inset-0 bg-black/50" />

                    <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-3 mb-4 ">
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold text-red-700">Create New Job</h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    Fill the job details and press <b>Create</b>.
                                </p>
                            </div>

                            <button
                                onClick={closeCreate}
                                className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Title */}
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Job Title</label>
                                <input
                                    value={newJob.title}
                                    onChange={(e) => onNewJobChange("title", e.target.value)}
                                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ${createErrors.title ? "border-red-400" : "border-gray-300"
                                        }`}
                                    placeholder="e.g. CNC Machine Operator"
                                />
                                {createErrors.title && (
                                    <div className="text-xs text-red-600 mt-1">{createErrors.title}</div>
                                )}
                            </div>

                            {/* Type */}
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Job Type</label>
                                <select
                                    value={newJob.type}
                                    onChange={(e) => onNewJobChange("type", e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                                >
                                    <option>Full-time</option>
                                    <option>Part-time</option>
                                    <option>Contract</option>
                                    <option>Temporary</option>
                                </select>
                            </div>

                            {/* Location */}
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Location</label>
                                <input
                                    value={newJob.location}
                                    onChange={(e) => onNewJobChange("location", e.target.value)}
                                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ${createErrors.location ? "border-red-400" : "border-gray-300"
                                        }`}
                                    placeholder="e.g. Dubai, UAE"
                                />
                                {createErrors.location && (
                                    <div className="text-xs text-red-600 mt-1">{createErrors.location}</div>
                                )}
                            </div>

                            {/* Experience */}
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Experience</label>
                                <input
                                    value={newJob.experience}
                                    onChange={(e) => onNewJobChange("experience", e.target.value)}
                                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ${createErrors.experience ? "border-red-400" : "border-gray-300"
                                        }`}
                                    placeholder="e.g. 2+ years"
                                />
                                {createErrors.experience && (
                                    <div className="text-xs text-red-600 mt-1">{createErrors.experience}</div>
                                )}
                            </div>

                            {/* Salary Min */}
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Salary Min (AED)</label>
                                <input
                                    type="number"
                                    value={newJob.salaryMin}
                                    onChange={(e) => onNewJobChange("salaryMin", e.target.value)}
                                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ${createErrors.salaryMin ? "border-red-400" : "border-gray-300"
                                        }`}
                                    placeholder="2500"
                                />
                                {createErrors.salaryMin && (
                                    <div className="text-xs text-red-600 mt-1">{createErrors.salaryMin}</div>
                                )}
                            </div>

                            {/* Salary Max */}
                            <div>
                                <label className="text-sm font-semibold text-gray-700">Salary Max (AED)</label>
                                <input
                                    type="number"
                                    value={newJob.salaryMax}
                                    onChange={(e) => onNewJobChange("salaryMax", e.target.value)}
                                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ${createErrors.salaryMax ? "border-red-400" : "border-gray-300"
                                        }`}
                                    placeholder="3200"
                                />
                                {createErrors.salaryMax && (
                                    <div className="text-xs text-red-600 mt-1">{createErrors.salaryMax}</div>
                                )}
                            </div>

                            {/* Description */}
                            <div className="md:col-span-2">
                                <label className="text-sm font-semibold text-gray-700">Description</label>
                                <textarea
                                    value={newJob.description}
                                    onChange={(e) => onNewJobChange("description", e.target.value)}
                                    rows={4}
                                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ${createErrors.description ? "border-red-400" : "border-gray-300"
                                        }`}
                                    placeholder="Write job description..."
                                />
                                {createErrors.description && (
                                    <div className="text-xs text-red-600 mt-1">{createErrors.description}</div>
                                )}
                            </div>

                            {/* Requirements */}
                            <div className="md:col-span-2">
                                <label className="text-sm font-semibold text-gray-700">Requirements</label>

                                <div className="mt-1 flex gap-2">
                                    <input
                                        value={reqInput}
                                        onChange={(e) => setReqInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addRequirement();
                                            }
                                        }}
                                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
                                        placeholder="Type requirement and press Enter"
                                    />
                                    <button
                                        type="button"
                                        onClick={addRequirement}
                                        className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm hover:opacity-90"
                                    >
                                        Add
                                    </button>
                                </div>

                                {createErrors.requirements && (
                                    <div className="text-xs text-red-600 mt-1">{createErrors.requirements}</div>
                                )}

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {newJob.requirements.map((r, idx) => (
                                        <span
                                            key={`${r}-${idx}`}
                                            className="inline-flex items-center gap-2 rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-sm"
                                        >
                                            {r}
                                            <button
                                                type="button"
                                                onClick={() => removeRequirement(idx)}
                                                className="h-6 w-6 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                                                aria-label="Remove requirement"
                                                title="Remove"
                                            >
                                                <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-700">
                                                    <path
                                                        fill="currentColor"
                                                        d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z"
                                                    />
                                                </svg>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer actions */}
                        <div className="mt-8 flex flex-col sm:flex-row gap-2 sm:justify-end">
                            <button
                                type="button"
                                onClick={closeCreate}
                                className="w-full sm:w-auto rounded-lg border px-5 py-3 text-sm hover:bg-gray-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={submitCreateJob}
                                className="w-full sm:w-auto rounded-lg bg-red-700 text-white px-6 py-3 text-sm hover:opacity-90"
                            >
                                Create Job
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Job Dialog */}
            {viewJob && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeView();
                    }}
                >
                    <div className="absolute inset-0 bg-black/50" />

                    <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold">{viewJob.title}</h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    {viewJob.type} • {viewJob.location}
                                </p>
                            </div>

                            <button
                                onClick={closeView}
                                className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="rounded-lg border border-gray-200 p-3">
                                    <div className="text-xs text-gray-500">Salary</div>
                                    <div className="font-semibold">
                                        AED {viewJob.salaryMin} – {viewJob.salaryMax}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-gray-200 p-3">
                                    <div className="text-xs text-gray-500">Experience</div>
                                    <div className="font-semibold">{viewJob.experience}</div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-200 p-3">
                                <div className="text-xs text-gray-500">Job Description</div>
                                <p className="mt-1 text-sm text-gray-700">{viewJob.description}</p>
                            </div>

                            <div className="rounded-lg border border-gray-200 p-3">
                                <div className="text-xs text-gray-500">Requirements</div>
                                <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
                                    {viewJob.requirements?.map((r, idx) => (
                                        <li key={idx}>{r}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2">
                                <Link
                                    href={`/client/jobs/${viewJob.id}`}
                                    className="w-full sm:w-auto text-center rounded-lg bg-blue-500 text-white px-5 py-2.5 text-sm hover:opacity-90"
                                >
                                    Select Job
                                </Link>
                                <button
                                    onClick={closeView}
                                    className="w-full sm:w-auto rounded-lg border px-5 py-2.5 text-sm hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}