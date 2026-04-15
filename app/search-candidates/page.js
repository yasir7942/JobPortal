"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import ENUMS from "../../config/enums.json";
import { ClipLoader } from "react-spinners";

/* ---------------- helpers ---------------- */

function cls(...arr) {
    return arr.filter(Boolean).join(" ");
}

function safeArray(v) {
    return Array.isArray(v) ? v : [];
}

const DEFAULT_PROFILE_IMAGE = "https://placehold.net/avatar.svg";

function getCandidateImage(candidate) {
    const url = String(candidate?.profileImage?.url || "").trim();
    return url || DEFAULT_PROFILE_IMAGE;
}

function LikeChip({ icon, label, value }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2 py-1 text-[11px] text-gray-700">
            <span className="text-base leading-none">{icon}</span>
            <span className="truncate">{label}</span>
            <span className="font-semibold text-gray-900">{value ?? 0}</span>
        </span>
    );
}

function VerifiedBadge({ ok }) {
    return ok ? (
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-green-700">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-green-700">
                    <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                </svg>
            </span>
            Verified
        </span>
    ) : (
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-700">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-red-700">
                    <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
                </svg>
            </span>
            Not Verified
        </span>
    );
}

function SearchableSingleSelect({
    label,
    value,
    onChange,
    options,
    placeholder = "Select",
    disabled = false,
    renderOptionLabel,
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const wrapRef = useRef(null);

    useEffect(() => {
        function onDoc(e) {
            if (!wrapRef.current?.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const selected = options.find((x) => String(x.value) === String(value));
    const filtered = options.filter((x) =>
        String(renderOptionLabel ? renderOptionLabel(x) : x.label || "")
            .toLowerCase()
            .includes(q.toLowerCase())
    );

    return (
        <div ref={wrapRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>

            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen((s) => !s)}
                className={cls(
                    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-left text-sm",
                    disabled ? "opacity-60 cursor-not-allowed" : "hover:border-gray-400"
                )}
            >
                <div className="flex items-center justify-between gap-3">
                    <span className={selected ? "text-gray-900" : "text-gray-400"}>
                        {selected
                            ? (renderOptionLabel ? renderOptionLabel(selected) : selected.label)
                            : placeholder}
                    </span>
                    <span className="text-gray-400">▾</span>
                </div>
            </button>

            {open && !disabled ? (
                <div className="relative z-30 mt-2 rounded-xl border border-gray-200 bg-white shadow-lg">
                    <div className="p-2 border-b border-gray-100">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1">
                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                setOpen(false);
                                setQ("");
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                            {placeholder}
                        </button>

                        {filtered.map((opt) => (
                            <button
                                type="button"
                                key={opt.value}
                                onClick={() => {
                                    onChange(opt.value);
                                    setOpen(false);
                                    setQ("");
                                }}
                                className={cls(
                                    "w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50",
                                    String(value) === String(opt.value) ? "bg-red-50 text-red-700" : ""
                                )}
                            >
                                {renderOptionLabel ? renderOptionLabel(opt) : opt.label}
                            </button>
                        ))}

                        {filtered.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">No result found</div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function SearchableMultiSelect({
    label,
    values,
    onChange,
    options,
    placeholder = "Select",
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const wrapRef = useRef(null);

    useEffect(() => {
        function onDoc(e) {
            if (!wrapRef.current?.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const selectedOptions = options.filter((x) => values.includes(String(x.value)));
    const filtered = options.filter((x) =>
        String(x.label || "").toLowerCase().includes(q.toLowerCase())
    );

    function toggle(v) {
        const s = String(v);
        if (values.includes(s)) onChange(values.filter((x) => x !== s));
        else onChange([...values, s]);
    }

    return (
        <div ref={wrapRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>

            <button
                type="button"
                onClick={() => setOpen((s) => !s)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-left text-sm hover:border-gray-400"
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        {selectedOptions.length ? (
                            <div className="flex flex-wrap gap-1">
                                {selectedOptions.map((x) => (
                                    <span
                                        key={x.value}
                                        className="inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-xs"
                                    >
                                        {x.label}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-gray-400">{placeholder}</span>
                        )}
                    </div>
                    <span className="text-gray-400">▾</span>
                </div>
            </button>

            {open ? (
                <div className="relative z-30 mt-2 rounded-xl border border-gray-200 bg-white shadow-lg">
                    <div className="p-2 border-b border-gray-100">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1">
                        {filtered.map((opt) => {
                            const checked = values.includes(String(opt.value));
                            return (
                                <label
                                    key={opt.value}
                                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggle(opt.value)}
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            );
                        })}

                        {filtered.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">No result found</div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

/* ---------------- page ---------------- */

export default function SearchCandidatesPage() {
    const searchParams = useSearchParams();

    const clientDocumentIdFromUrl = String(searchParams.get("clientDocumentId") || "").trim();
    const jobDocumentIdFromUrl = String(searchParams.get("jobDocumentId") || "").trim();

    const [loadingMeta, setLoadingMeta] = useState(true);
    const [loadingResults, setLoadingResults] = useState(false);
    const [actionLoading, setActionLoading] = useState("");
    const [err, setErr] = useState("");

    const [clients, setClients] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [jobRoles, setJobRoles] = useState([]);

    const [clientDocumentId, setClientDocumentId] = useState("");
    const [jobDocumentId, setJobDocumentId] = useState("");
    const [searchText, setSearchText] = useState("");
    const [genderList, setGenderList] = useState("");
    const [nationalityList, setNationalityList] = useState("");
    const [selectedJobRoles, setSelectedJobRoles] = useState([]);

    const [clientLocked, setClientLocked] = useState(false);

    const [results, setResults] = useState([]);
    const [selectedCandidate, setSelectedCandidate] = useState(null);

    const genders = useMemo(
        () => safeArray(ENUMS?.genders).map((x) => ({ value: x, label: x })),
        []
    );

    const nationalities = useMemo(
        () => safeArray(ENUMS?.nationalities).map((x) => ({ value: x, label: x })),
        []
    );

    const filteredJobs = useMemo(() => {
        if (!clientDocumentId) return jobs;
        return jobs.filter((j) => String(j.clientDocumentId || "") === String(clientDocumentId));
    }, [jobs, clientDocumentId]);

    async function fetchJsonSafe(url, options) {
        let res;
        let text = "";

        try {
            res = await fetch(url, {
                cache: "no-store",
                ...(options || {}),
            });

            text = await res.text();
        } catch (networkError) {
            throw new Error("Unable to connect to server");
        }

        let json = null;

        try {
            json = text ? JSON.parse(text) : null;
        } catch {
            throw new Error(`API returned invalid response (status ${res.status})`);
        }

        if (!res.ok || json?.ok === false) {
            throw new Error(
                json?.error ||
                json?.message ||
                `Request failed${res?.status ? ` (${res.status})` : ""}`
            );
        }

        return json;
    }

    async function loadMeta() {
        setLoadingMeta(true);
        setErr("");

        try {
            const params = new URLSearchParams();

            if (clientDocumentIdFromUrl) {
                params.set("clientDocumentId", clientDocumentIdFromUrl);
            }

            if (jobDocumentIdFromUrl) {
                params.set("jobDocumentId", jobDocumentIdFromUrl);
            }

            const url = params.toString()
                ? `/api/search-candidates/meta?${params.toString()}`
                : "/api/search-candidates/meta";

            const json = await fetchJsonSafe(url);

            const clientsData = safeArray(json.clients);
            const jobsData = safeArray(json.jobs);
            const jobRolesData = safeArray(json.jobRoles);

            setClients(clientsData);
            setJobs(jobsData);
            setJobRoles(jobRolesData);

            const validClientFromUrl = clientsData.some(
                (x) => String(x.documentId) === String(clientDocumentIdFromUrl)
            )
                ? clientDocumentIdFromUrl
                : "";

            const jobsForSelectedClient = validClientFromUrl
                ? jobsData.filter(
                    (j) => String(j.clientDocumentId || "") === String(validClientFromUrl)
                )
                : jobsData;

            const validJobFromUrl = jobsForSelectedClient.some(
                (x) => String(x.documentId) === String(jobDocumentIdFromUrl)
            )
                ? jobDocumentIdFromUrl
                : "";

            setClientDocumentId(validClientFromUrl);
            setJobDocumentId(validJobFromUrl);

            setClientLocked(!!validClientFromUrl);

            await searchCandidates({
                clientDocumentId: validClientFromUrl,
                jobDocumentId: validJobFromUrl,
                q: "",
                genderList: "",
                nationalityList: "",
                jobRoles: [],
            });
        } catch (e) {
            setErr(e?.message || "Failed to load filters");
            setResults([]);
        } finally {
            setLoadingMeta(false);
        }
    }

    async function fetchCandidatesSafe(payload) {
        return fetchJsonSafe("/api/search-candidates/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    }

    async function searchCandidates(overridePayload = null) {
        setLoadingResults(true);
        setErr("");

        try {
            const payload = overridePayload || {
                clientDocumentId,
                jobDocumentId,
                q: searchText,
                genderList,
                nationalityList,
                jobRoles: selectedJobRoles,
            };

            const json = await fetchCandidatesSafe(payload);

            setResults(safeArray(json.items));
        } catch (e) {
            setErr(e?.message || "Failed to search candidates");
            setResults([]);
        } finally {
            setLoadingResults(false);
        }
    }

    useEffect(() => {
        loadMeta();
    }, []);

    useEffect(() => {
        if (!clientDocumentId) {
            if (jobDocumentId) {
                setJobDocumentId("");
            }
            return;
        }

        if (jobDocumentId) {
            const found = filteredJobs.some(
                (j) => String(j.documentId) === String(jobDocumentId)
            );
            if (!found) {
                setJobDocumentId("");
            }
        }
    }, [clientDocumentId, jobDocumentId, filteredJobs]);

    useEffect(() => {
        setResults([]);
        setSelectedCandidate(null);
        setErr("");
    }, [
        clientDocumentId,
        jobDocumentId,
        searchText,
        genderList,
        nationalityList,
        selectedJobRoles,
    ]);

    function resetFilters() {
        const validClient = clients.some(
            (x) => String(x.documentId) === String(clientDocumentIdFromUrl)
        )
            ? clientDocumentIdFromUrl
            : "";

        const validJobsForClient = validClient
            ? jobs.filter((j) => String(j.clientDocumentId || "") === String(validClient))
            : jobs;

        const validJob = validJobsForClient.some(
            (x) => String(x.documentId) === String(jobDocumentIdFromUrl)
        )
            ? jobDocumentIdFromUrl
            : "";

        setClientDocumentId(validClient);
        setJobDocumentId(validJob);
        setSearchText("");
        setGenderList("");
        setNationalityList("");
        setSelectedJobRoles([]);

        searchCandidates({
            clientDocumentId: validClient,
            jobDocumentId: validJob,
            q: "",
            genderList: "",
            nationalityList: "",
            jobRoles: [],
        });
    }

    async function moveCandidate(candidateDocumentId, action) {
        if (!clientDocumentId || !jobDocumentId) {
            alert("Please select both client and job first");
            return;
        }

        const actionKey = `${candidateDocumentId}:${action}`;
        setActionLoading(actionKey);

        try {
            const json = await fetchJsonSafe("/api/search-candidates/select", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidateDocumentId,
                    jobDocumentId,
                    action,
                }),
            });

            const processText = json?.candidateProcessList || "";

            setResults((prev) =>
                prev.filter((x) => String(x.documentId) !== String(candidateDocumentId))
            );

            setSelectedCandidate((prev) =>
                prev && String(prev.documentId) === String(candidateDocumentId)
                    ? {
                        ...prev,
                        candidateProcessListForSelectedJob: processText,
                    }
                    : prev
            );

            setSelectedCandidate(null);
        } catch (e) {
            alert(e?.message || "Failed to update candidate");
        } finally {
            setActionLoading("");
        }
    }

    const clientOptions = useMemo(
        () =>
            clients.map((x) => ({
                value: x.documentId,
                label: x.companyName || x.ownerName || x.documentId,
            })),
        [clients]
    );

    const jobOptions = useMemo(
        () =>
            filteredJobs.map((x) => ({
                value: x.documentId,
                label: x.title || "Untitled Job",
                referenceNumber: x.referenceNo || "",
                clientDocumentId: x.clientDocumentId || "",
            })),
        [filteredJobs]
    );

    const jobRoleOptions = useMemo(
        () =>
            jobRoles.map((x) => ({
                value: x.documentId,
                label: x.title || x.documentId,
            })),
        [jobRoles]
    );

    const selectedClientOption = useMemo(
        () => clientOptions.find((x) => String(x.value) === String(clientDocumentId)) || null,
        [clientOptions, clientDocumentId]
    );

    const selectedJobOption = useMemo(
        () => jobOptions.find((x) => String(x.value) === String(jobDocumentId)) || null,
        [jobOptions, jobDocumentId]
    );

    const canPerformAction = Boolean(clientDocumentId && jobDocumentId);

    return (
        <>
            <div className="topHeading">Search Candidates</div>

            <div className="w-full mx-auto p-4 space-y-6">
                {err ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {err}
                    </div>
                ) : null}

                <div className="border border-gray-200 rounded-2xl p-4 sm:p-6 bg-gray-50">
                    {loadingMeta ? (
                        <div className="flex justify-start items-center gap-3 text-sm text-gray-600">
                            <ClipLoader size={25} color="#b91c1c" speedMultiplier={1} />
                            <div className="text-left">Loading filters...</div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                <SearchableSingleSelect
                                    label="Client"
                                    value={clientDocumentId}
                                    onChange={setClientDocumentId}
                                    options={clientOptions}
                                    placeholder="All clients"
                                    disabled={clientLocked}
                                />

                                <SearchableSingleSelect
                                    label="Job"
                                    value={jobDocumentId}
                                    onChange={setJobDocumentId}
                                    options={jobOptions}
                                    placeholder="All jobs"
                                    renderOptionLabel={(opt) =>
                                        opt.referenceNumber
                                            ? `${opt.referenceNumber} - ${opt.label}`
                                            : opt.label
                                    }
                                />


                                <SearchableSingleSelect
                                    label="Gender"
                                    value={genderList}
                                    onChange={setGenderList}
                                    options={genders}
                                    placeholder="All genders"
                                />

                                <SearchableSingleSelect
                                    label="Nationality"
                                    value={nationalityList}
                                    onChange={setNationalityList}
                                    options={nationalities}
                                    placeholder="All nationalities"
                                />

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Search
                                    </label>
                                    <input
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        placeholder="Search fullName, firstName, lastName, shortSummary, referenceNumber"
                                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
                                    />
                                </div>





                                <SearchableMultiSelect
                                    label="Job Roles"
                                    values={selectedJobRoles}
                                    onChange={setSelectedJobRoles}
                                    options={jobRoleOptions}
                                    placeholder="Select job roles"
                                />
                            </div>

                            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    Reset
                                </button>
                                <button
                                    type="button"
                                    onClick={() => searchCandidates()}
                                    disabled={loadingResults}
                                    className="rounded-xl bg-red-700 px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                                >
                                    {loadingResults ? "Searching..." : "Search Candidates"}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div className="text-sm text-gray-600">
                    Results: <span className="font-semibold text-gray-900">{results.length}</span>
                </div>

                {loadingResults ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
                        <ClipLoader size={25} color="#b91c1c" speedMultiplier={1} />
                        <div className="text-left">Loading candidates...</div>
                    </div>
                ) : results.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
                        No candidates found.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {results.map((c) => (
                            <div key={c.documentId || c.id} className="bg-gray-100 rounded-2xl p-3">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={getCandidateImage(c)}
                                        alt={c.fullName || "Candidate"}
                                        className="h-16 w-16 rounded-full object-cover border border-white bg-white"
                                    />
                                    <div className="min-w-0">
                                        <div className="font-semibold text-red-600 text-sm truncate">
                                            {c.fullName || "—"}
                                        </div>
                                        <div className="text-xs text-gray-700 truncate">
                                            {c.nationality || "—"}
                                            {c.jobRoleTitles?.length
                                                ? ` • ${c.jobRoleTitles.join(", ")}`
                                                : ""}
                                        </div>
                                        <div className="text-[11px] text-gray-500 truncate">
                                            {c.referenceNumber || c.documentId || "—"}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-2  flex-wrap gap-2 hidden">
                                    <LikeChip
                                        icon="👍"
                                        label="Suggested to clients/jobs:"
                                        value={c.suggestedToClientsJobsCount ?? 0}
                                    />
                                    <LikeChip
                                        icon="⭐"
                                        label="Shortlisted/Interview by clients/jobs:"
                                        value={c.shortlistedByClientsJobsCount ?? 0}
                                    />
                                </div>

                                <p className="text-xs text-gray-700 mt-2 line-clamp-3">
                                    {c.shortSummary || "—"}
                                </p>

                                <div className="mt-2 text-[11px] text-gray-500">
                                    Current for selected job:{" "}
                                    <span className="font-semibold text-gray-700">
                                        {c.candidateProcessListForSelectedJob || "Not in selected job"}
                                    </span>
                                </div>

                                <button
                                    onClick={() => setSelectedCandidate(c)}
                                    className="mt-3 w-full text-white hover:text-gray-800 rounded-lg bg-red-600 border border-red-600 px-3 py-2 text-sm hover:bg-gray-50"
                                >
                                    View Details
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedCandidate ? (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setSelectedCandidate(null);
                    }}
                >
                    <div className="absolute inset-0 bg-black/50" />

                    <div className="relative w-full sm:max-w-6xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-lg sm:text-xl font-bold truncate">
                                    Candidate Details
                                </div>
                                <div className="text-sm text-gray-600 truncate">
                                    {selectedCandidate.fullName} • {selectedCandidate.referenceNumber}
                                </div>

                                <div className="mt-3 space-y-2">
                                    <div className="text-sm">
                                        <span className="font-semibold text-gray-800">Client: </span>
                                        {selectedClientOption ? (
                                            <span className="text-gray-700">{selectedClientOption.label}</span>
                                        ) : (
                                            <span className="font-semibold text-red-600">
                                                Select client or job for perfome action
                                            </span>
                                        )}
                                    </div>

                                    <div className="text-sm">
                                        <span className="font-semibold text-gray-800">Job: </span>
                                        {selectedJobOption ? (
                                            <span className="text-gray-700">
                                                {selectedJobOption.referenceNumber
                                                    ? `${selectedJobOption.referenceNumber} - ${selectedJobOption.label}`
                                                    : selectedJobOption.label}
                                            </span>
                                        ) : (
                                            <span className="font-semibold text-red-600">
                                                Select client or job for perfome action
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedCandidate(null)}
                                className="shrink-0 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:justify-end">
                            <button
                                onClick={() => moveCandidate(selectedCandidate.documentId, "suggested")}
                                disabled={!canPerformAction || actionLoading === `${selectedCandidate.documentId}:suggested`}
                                className="w-full sm:w-auto rounded-lg border bg-orange-500 text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {actionLoading === `${selectedCandidate.documentId}:suggested`
                                    ? "Updating..."
                                    : "Suggested Candidate"}
                            </button>

                            <button
                                onClick={() => moveCandidate(selectedCandidate.documentId, "shortlisted")}
                                disabled={!canPerformAction || actionLoading === `${selectedCandidate.documentId}:shortlisted`}
                                className="w-full sm:w-auto rounded-lg bg-green-600 text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {actionLoading === `${selectedCandidate.documentId}:shortlisted`
                                    ? "Updating..."
                                    : "Shortlist Candidate"}
                            </button>

                            <button
                                onClick={() => moveCandidate(selectedCandidate.documentId, "request interview")}
                                disabled={!canPerformAction || actionLoading === `${selectedCandidate.documentId}:request interview`}
                                className="w-full sm:w-auto rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {actionLoading === `${selectedCandidate.documentId}:request interview`
                                    ? "Updating..."
                                    : "Request Interview"}
                            </button>
                        </div>

                        {!canPerformAction ? (
                            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                                Select client or job for perfome action
                            </div>
                        ) : null}

                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex items-center gap-4">
                                <img
                                    src={getCandidateImage(selectedCandidate)}
                                    alt={selectedCandidate.fullName || "Candidate"}
                                    className="h-28 w-28 rounded-full object-cover bg-white border"
                                />
                                <div>
                                    <div className="text-xl text-red-600 font-bold">
                                        {selectedCandidate.fullName || "—"}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {selectedCandidate.nationality || "—"}
                                    </div>

                                    <div className="mt-2 hidden  flex-wrap gap-2">
                                        <LikeChip
                                            icon="👍"
                                            label="Suggested to clients/jobs:"
                                            value={selectedCandidate.suggestedToClientsJobsCount ?? 0}
                                        />
                                        <LikeChip
                                            icon="⭐"
                                            label="Shortlisted by clients/jobs:"
                                            value={selectedCandidate.shortlistedByClientsJobsCount ?? 0}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="sm:ml-auto">
                                <VerifiedBadge ok={!!selectedCandidate.isProfileVerified} />
                            </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-gray-200 p-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                {[
                                    ["Reference", selectedCandidate.referenceNumber],
                                    ["First Name", selectedCandidate.firstName],
                                    ["Last Name", selectedCandidate.lastName],
                                    ["Email", selectedCandidate.email],
                                    ["Mobile", selectedCandidate.mobile],
                                    ["Birth Date", selectedCandidate.birthDate],
                                    ["Nationality", selectedCandidate.nationality],
                                    ["Gender", selectedCandidate.genderList || selectedCandidate.gender],
                                    ["Marital Status", selectedCandidate.maritalStatusList || selectedCandidate.maritalStatus],
                                    ["English Level", selectedCandidate.englishLevelList || selectedCandidate.englishLevel],
                                    ["Selected Job Status", selectedCandidate.candidateProcessListForSelectedJob || "—"],
                                ].map(([k, v]) => (
                                    <div className="text-xs" key={k}>
                                        <div className="text-gray-500">{k}</div>
                                        <div className="font-semibold text-gray-800 break-words">{v || "—"}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="text-sm font-semibold text-gray-800">Job Roles</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {safeArray(selectedCandidate.jobRoleTitles).length ? (
                                    selectedCandidate.jobRoleTitles.map((x) => (
                                        <span
                                            key={x}
                                            className="inline-flex rounded-full border bg-gray-50 px-3 py-1 text-xs text-gray-700"
                                        >
                                            {x}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-500">—</span>
                                )}
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="text-sm font-semibold text-gray-800">Short Summary</div>
                            <div className="text-sm text-gray-700 mt-1">
                                {selectedCandidate.shortSummary || "—"}
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div className="rounded-xl border border-gray-200 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm font-semibold text-gray-800">CV</div>
                                    {selectedCandidate.cv?.url ? (
                                        <a
                                            href={selectedCandidate.cv.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm rounded-lg bg-gray-900 text-white px-3 py-2 hover:opacity-90"
                                        >
                                            Open CV
                                        </a>
                                    ) : (
                                        <span className="text-sm text-gray-500">No CV</span>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-200 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm font-semibold text-gray-800">Passport</div>
                                    {selectedCandidate.passport?.url ? (
                                        <a
                                            href={selectedCandidate.passport.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm rounded-lg bg-gray-900 text-white px-3 py-2 hover:opacity-90"
                                        >
                                            Open Passport
                                        </a>
                                    ) : (
                                        <span className="text-sm text-gray-500">No Passport</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-gray-200 p-3">
                            <div className="text-sm font-semibold text-gray-800">
                                Documents ({safeArray(selectedCandidate.documents).length})
                            </div>

                            <div className="mt-3 space-y-2">
                                {safeArray(selectedCandidate.documents).length ? (
                                    safeArray(selectedCandidate.documents).map((d, idx) => (
                                        <div
                                            key={`${d.name || "doc"}-${idx}`}
                                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-gray-100 p-3"
                                        >
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-gray-800 break-words">
                                                    {d.name || "Document"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {d.remarks || "—"}
                                                </div>
                                            </div>
                                            {d.file?.url ? (
                                                <a
                                                    href={d.file.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                                                >
                                                    Open
                                                </a>
                                            ) : (
                                                <span className="text-xs text-gray-400">No file</span>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-gray-500">No documents</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}