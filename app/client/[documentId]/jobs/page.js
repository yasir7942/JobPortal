"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/app/components/layouts/client/Header";

// same UI components you use in Candidate form (theme)
import { Field, Input, Textarea, Select, fetchJsonSafe } from "@/app/staff/ui/CandidateFormUI";

// enums.json
import ENUMS from "../../../../config/enums.json";

/* -------------------- helpers -------------------- */

function toIntOrNull(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "string" && v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toBlocksFromText(text) {
    const t = String(text || "").trim();
    if (!t) return [];
    const parts = t.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    return parts.map((p) => ({
        type: "paragraph",
        children: [{ type: "text", text: p }],
    }));
}

function blocksToPlainText(blocks) {
    if (!Array.isArray(blocks)) return "";
    return blocks
        .map((b) => {
            const ch = Array.isArray(b?.children) ? b.children : [];
            const line = ch.map((c) => c?.text || "").join("");
            return line.trim();
        })
        .filter(Boolean)
        .join("\n\n");
}

function StatusPill({ status }) {
    const s = String(status || "").toLowerCase();
    const cls =
        s === "open"
            ? "border-green-200 bg-green-50 text-green-700 text-base px-2.5 py-2"
            : s === "Closed"
                ? "border-gray-200 bg-gray-50 text-gray-700 px-2.5 text-base py-2"
                : "border-gray-200 bg-gray-50 text-gray-700 px-2.5 text-base  py-2";

    return (
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${cls}`}>
            {status || "—"}
        </span>
    );
}

/* -------------------- page -------------------- */

export default function ClientJobsPage() {
    const routeParams = useParams();
    const clientDocumentId = routeParams?.documentId;


    const pageSize = 10;

    const [page, setPage] = useState(1);
    const [items, setItems] = useState([]);
    const [pageCount, setPageCount] = useState(1);
    const [total, setTotal] = useState(0);

    const [showClosed, setShowClosed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    // modals
    const [openCreate, setOpenCreate] = useState(false);
    const [openView, setOpenView] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);

    const [saving, setSaving] = useState(false);
    const [saveErr, setSaveErr] = useState("");

    // form fields (schema) :contentReference[oaicite:2]{index=2}
    const [title, setTitle] = useState("");
    const [location, setLocation] = useState("");
    const [closingDate, setClosingDate] = useState(""); // yyyy-mm-dd
    const [statusList, setStatusList] = useState("open");
    const [industeryList, setIndusteryList] = useState("");
    const [jobTypeList, setJobTypeList] = useState("");
    const [showToCandidateList, setShowToCandidateList] = useState("");
    const [vacanciesNo, setVacanciesNo] = useState("");
    const [experience, setExperience] = useState("");
    const [shortDescription, setShortDescription] = useState("");
    const [detailsText, setDetailsText] = useState("");

    // enums (fallbacks safe)
    const statusOptions = useMemo(
        () => ENUMS?.statusList || ["open", "closed"],
        []
    );
    const industryOptions = useMemo(
        () => ENUMS?.industries || ENUMS?.industryList || [],
        []
    );
    const jobTypeOptions = useMemo(
        () => ENUMS?.jobTypeList || ENUMS?.jobTypes || ["Full-time", "Part-time", "Contract"],
        []
    );
    const showToCandidateOptions = useMemo(
        () => ENUMS?.showToCandidate || ["Yes", "No"],
        []
    );

    async function load(nextPage = page, includeClosed = showClosed) {
        if (!clientDocumentId) return;
        setLoading(true);
        setErr("");

        try {
            // your working list endpoint :contentReference[oaicite:3]{index=3}
            const url = `/api/jobs/list?clientDocumentId=${encodeURIComponent(
                clientDocumentId
            )}&page=${nextPage}&pageSize=${pageSize}&includeClosed=${includeClosed ? "1" : "0"}`;

            const json = await fetchJsonSafe(url);

            console.log("Fetched jobs list:", { url, json });

            setItems(Array.isArray(json.items) ? json.items : []);
            setPageCount(Number(json.pageCount || 1));
            setTotal(Number(json.total || 0));
        } catch (e) {
            setErr(e?.message || "Failed to load jobs");
            setItems([]);
            setPageCount(1);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showClosed, clientDocumentId]);

    useEffect(() => {
        load(page, showClosed);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, showClosed, clientDocumentId]);

    function resetForm() {
        setTitle("");
        setLocation("");
        setClosingDate("");
        setStatusList("Open");
        setIndusteryList("");
        setJobTypeList("");
        setShowToCandidateList("");
        setVacanciesNo("");
        setExperience("");
        setShortDescription("");
        setDetailsText("");
        setSaveErr("");
    }

    function closeCreate() {
        setOpenCreate(false);
        setSaving(false);
        setSaveErr("");
    }

    function openViewJob(job) {
        setSelectedJob(job);
        setOpenView(true);
    }

    function closeView() {
        setOpenView(false);
        setSelectedJob(null);
    }

    async function submitCreate(e) {
        e.preventDefault();
        setSaving(true);
        setSaveErr("");

        try {
            const payload = {
                clientDocumentId, // auto selected from URL
                title,
                location,
                closingDate: closingDate || null,
                statusList: statusList || "open",
                industeryList: industeryList || "",
                jobTypeList: jobTypeList || "",
                showToCandidateList: showToCandidateList || "",
                vacanciesNo: toIntOrNull(vacanciesNo),
                experience: toIntOrNull(experience),
                shortDescription,
                details: toBlocksFromText(detailsText),
            };

            const res = await fetch("/api/jobs/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                body: JSON.stringify(payload),
            });

            console.log("Create job response", res);


            const text = await res.text();
            let json;
            try {
                json = text ? JSON.parse(text) : null;
            } catch {
                throw new Error(`API returned non-JSON (status ${res.status}). First bytes: ${text.slice(0, 80)}`);
            }

            if (!res.ok || json?.ok === false) throw new Error(json?.error || "Create job failed");
            // console.log("Create job response", json);
            // const jobId = json?.created?.data?.id;

            // console.log("Created job with ID:", jobId);

            closeCreate();
            resetForm();
            setPage(1);
            await load(1, showClosed);
        } catch (e2) {
            setSaveErr(e2?.message || "Failed to create job");
        } finally {
            setSaving(false);
        }
    }

    async function closeJob(jobDocumentId) {
        /* if (!jobDocumentId) return;
         const yes = confirm("Close this job?");
         if (!yes) return;
 
         try {
             const res = await fetch(`/api/jobs/close/${jobDocumentId}`, {
                 method: "POST",
                 cache: "no-store",
             });
 
             const text = await res.text();
             let json;
             try {
                 json = text ? JSON.parse(text) : null;
             } catch {
                 throw new Error(`API returned non-JSON (status ${res.status}). First bytes: ${text.slice(0, 80)}`);
             }
 
             if (!res.ok || json?.ok === false) throw new Error(json?.error || "Close job failed");
 
             await load(page, showClosed);
         } catch (e) {
             alert(e?.message || "Failed to close job");
         }  */
    }

    const headerText = useMemo(() => {
        return `(${total} ${showClosed ? "Jobs" : "Open Jobs"})`;
    }, [total, showClosed]);

    return (
        <>
            <Header />

            {/* Top Title + Right Menu (same style like your old page) */}
            <div className="mt-10 px-6 py-5 border-b border-gray-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="font-bold text-2xl sm:text-5xl text-red-700">Jobs</div>

                <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-gray-800 select-none">
                        <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={showClosed}
                            onChange={(e) => setShowClosed(e.target.checked)}
                        />
                        Show closed jobs
                    </label>

                    <button
                        type="button"
                        onClick={() => load(page, showClosed)}
                        className="text-xs sm:text-sm rounded-full border border-red-600 text-gray-700 px-6 py-2 hover:bg-red-600 hover:text-white transition"
                    >
                        Refresh
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            resetForm();
                            setOpenCreate(true);
                        }}
                        className="text-xs sm:text-sm rounded-full bg-red-600 border border-red-600 text-white px-6 py-2 hover:bg-gray-50 hover:text-gray-800 transition"
                    >
                        + Create Job
                    </button>
                </div>
            </div>

            <div className="w-full mx-auto p-4 space-y-4">
                <div className="text-sm text-gray-700">
                    {headerText}{" "}
                    <span className="text-sm text-gray-600 ml-2"><span className="text-gray-600 font-semibold ">Client: </span>{items[0]?.companyName || "—"}</span>
                </div>

                {loading ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-800">
                        Loading jobs...
                    </div>
                ) : err ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                        {err}
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-800">
                        No jobs found.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((j) => (
                            <div
                                key={j.documentId || j.id}
                                className="w-full rounded-xl border border-gray-400 bg-white px-4 py-3 sm:px-4 sm:py-5"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    {/* LEFT: title + meta (compact) */}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div onClick={() => openViewJob(j)} className="truncate text-lg sm:text-xl font-bold text-red-700 hover:underline cursor-pointer">
                                                {j.title || "—"}
                                            </div>

                                            {/* small id pill (optional) */}
                                            <span className="hidden sm:inline text-base text-gray-800 pr-5">
                                                {j.referenceNo || j.id || "—"}
                                            </span>
                                            <span className="hidden sm:inline text-sm text-gray-700">
                                                <span className="  text-blue-500">Created At: </span>{j.createdAt ? new Date(j.createdAt).toLocaleDateString() : "—"}
                                            </span>
                                            <span className="hidden sm:inline text-sm text-gray-700">
                                                <span className="  text-blue-500">Closing Data: </span>{j.closingDate ? new Date(j.closingDate).toLocaleDateString() : "—"}
                                            </span>
                                        </div>

                                        {/* 1 compact line */}
                                        <div className="truncate text-sm sm:text-sm text-gray-700">

                                            <div className="flex items-center gap-4">
                                                <span className="text-sm px-2 py-1 text-blue-500 bg-gray-100">
                                                    📝 {j.jobTypeList}
                                                </span>
                                                <span className="text-sm px-2 py-1 text-blue-500 bg-gray-100">
                                                    🌍 {j.location}
                                                </span>
                                                <span className="text-sm px-2 py-1 text-blue-500 bg-gray-100">
                                                    👥 vacancies: {j.vacanciesNo}
                                                </span>
                                                |<span className="text-sm px-2 py-1 text-blue-500 bg-gray-100">
                                                    👷‍♂️ Experience: {j.experience ?? "—"}
                                                </span>

                                            </div>


                                        </div>
                                    </div>

                                    {/* RIGHT: status + actions (top-right) */}
                                    <div className="flex items-center gap-2  text-base shrink-0">
                                        <StatusPill status={j.statusList} />

                                        <button
                                            onClick={() => openViewJob(j)}
                                            className="rounded-md border border-gray-300 text-gray-300 px-3 py-1 text-base hover:bg-gray-50"
                                        >
                                            View
                                        </button>

                                        <button
                                            onClick={() => closeJob(j.documentId)}
                                            disabled={String(j.statusList || "").toLowerCase() === "closed"}
                                            className="rounded-md bg-red-700 text-white px-3 py-1 text-base hover:opacity-90 disabled:opacity-40"
                                        >
                                            Job Board
                                        </button>
                                    </div>
                                </div>

                                {/* Description single-line only (super slim) */}
                                <div className="mt-1 truncate text-sm sm:text-sm text-gray-700">
                                    {j.shortDescription || "—"}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between gap-3 pt-2">
                    <div className="text-sm text-gray-800">
                        Page {page} of {pageCount}
                        <span className="ml-2 text-xs text-gray-500">({total} jobs)</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1 || loading}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                        >
                            Prev
                        </button>
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                            disabled={page >= pageCount || loading}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* CREATE MODAL */}
            {openCreate && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeCreate();
                    }}
                >
                    <div className="absolute inset-0 bg-black/50" />

                    <div className="relative w-full sm:max-w-4xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-lg sm:text-xl font-bold truncate">Create Job</div>
                                <div className="text-sm text-gray-600 truncate">
                                    Client auto-selected: {items[0]?.companyName || "—"}
                                </div>
                            </div>

                            <button
                                onClick={closeCreate}
                                className="shrink-0 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                                type="button"
                            >
                                Close
                            </button>
                        </div>

                        {saveErr ? (
                            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                {saveErr}
                            </div>
                        ) : null}

                        <form onSubmit={submitCreate} className="mt-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Title *">
                                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title" />
                                </Field>

                                <Field label="Location">
                                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Dubai, UAE" />
                                </Field>

                                <Field label="Closing Date">
                                    <Input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} />

                                </Field>


                                <Field label="Industry">
                                    <Select value={industeryList} onChange={(e) => setIndusteryList(e.target.value)}>
                                        <option value="">Select</option>
                                        {industryOptions.map((x) => (
                                            <option key={x} value={x}>{x}</option>
                                        ))}
                                    </Select>
                                </Field>

                                <Field label="Job Type">
                                    <Select value={jobTypeList} onChange={(e) => setJobTypeList(e.target.value)}>
                                        <option value="">Select</option>
                                        {jobTypeOptions.map((x) => (
                                            <option key={x} value={x}>{x}</option>
                                        ))}
                                    </Select>
                                </Field>

                                <Field label="How To Candidate?">
                                    <Select value={showToCandidateList} onChange={(e) => setShowToCandidateList(e.target.value)}>
                                        <option value="">Select</option>
                                        {showToCandidateOptions.map((x) => (
                                            <option key={x} value={x}>{x}</option>
                                        ))}
                                    </Select>
                                </Field>

                                <Field label="Vacancies No">
                                    <Input value={vacanciesNo} onChange={(e) => setVacanciesNo(e.target.value)} placeholder="e.g. 5" />
                                </Field>

                                <Field label="Experience (years)">
                                    <Input value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 2" />
                                </Field>
                            </div>

                            <Field label="Short Description">
                                <Textarea rows={3} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
                            </Field>

                            <Field label="Details (Rich Text blocks)">
                                <Textarea
                                    rows={7}
                                    value={detailsText}
                                    onChange={(e) => setDetailsText(e.target.value)}
                                    placeholder="Write details here..."
                                />
                            </Field>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeCreate}
                                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving || !clientDocumentId || !title.trim()}
                                    className="rounded-xl bg-red-700 px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-40"
                                >
                                    {saving ? "Saving..." : "Create Job"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* VIEW MODAL */}
            {openView && selectedJob && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeView();
                    }}
                >
                    <div className="absolute inset-0 bg-black/50" />

                    <div className="relative w-full sm:max-w-5xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-lg sm:text-xl font-bold truncate">{selectedJob.title || "Job"}  </div>
                                <div className="text-sm text-gray-600 truncate">
                                    {selectedJob.location || "—"} • Job ID: {selectedJob.referenceNo || selectedJob.id || "—"}
                                </div>
                            </div>

                            <button
                                onClick={closeView}
                                className="shrink-0 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-4 rounded-xl border border-gray-200 p-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                {[
                                    ["Status", selectedJob.statusList],
                                    ["Industry", selectedJob.industeryList],
                                    ["Job Type", selectedJob.jobTypeList],
                                    ["How To Candidate?", selectedJob.showToCandidateList],
                                    ["created At", selectedJob.createdAt ? new Date(selectedJob.createdAt).toLocaleDateString() : "—"],
                                    ["Closing Date", selectedJob.closingDate ? new Date(selectedJob.closingDate).toLocaleDateString() : "—"],
                                    ["Vacancies", selectedJob.vacanciesNo],
                                    ["Experience", selectedJob.experience],

                                ].map(([k, v]) => (
                                    <div className="text-sm" key={k}>
                                        <div className="text-gray-600 font-semibold">{k}</div>
                                        <div className=" text-gray-800">{v ?? "—"}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="text-sm font-semibold text-gray-800">Short Description</div>
                            <div className="text-sm text-gray-700 mt-1">{selectedJob.shortDescription || "—"}</div>
                        </div>

                        <div className="mt-4">
                            <div className="text-sm font-semibold text-gray-800">Details</div>
                            <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-700 rounded-xl border border-gray-200 bg-gray-50 p-3">
                                {blocksToPlainText(selectedJob.details) || "—"}
                            </pre>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => closeJob(selectedJob.documentId)}
                                disabled={String(selectedJob.statusList || "").toLowerCase() === "closed"}
                                className="rounded-lg bg-red-700 text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-40"
                            >
                                Job Board
                            </button>
                            <button onClick={closeView} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}