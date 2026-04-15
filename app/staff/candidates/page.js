"use client";

import useAuthClient from "@/lib/useAuthClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ClipLoader } from "react-spinners";


/* ✅ Default profile image (fallback) */
const DEFAULT_AVATAR =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <circle cx="150" cy="120" r="55" fill="#d1d5db"/>
    <rect x="70" y="200" width="160" height="30" rx="15" fill="#d1d5db"/>
    <text x="150" y="265" text-anchor="middle" font-family="Arial" font-size="18" fill="#6b7280">
      Profile
    </text>
  </svg>
`);

function safeImgSrc(src) {
    const s = (src || "").trim();
    return s ? s : DEFAULT_AVATAR;
}

function isPdfUrl(url) {
    if (!url) return false;
    return String(url).toLowerCase().includes(".pdf");
}

function isValidLink(url) {
    return url;
}

async function fetchJsonSafe(url) {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    let json;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        throw new Error(`API returned non-JSON (status ${res.status}). First bytes: ${text.slice(0, 80)}`);
    }
    if (!res.ok || json?.ok === false) throw new Error(json?.error || `Request failed (${res.status})`);
    return json;
}

function VerifiedIcon({ ok }) {
    return (
        <span title={ok ? "Verified" : "Not Verified"} className="inline-flex items-center justify-center">
            {ok ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-green-700">
                    <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                </svg>
            ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-500">
                    <path
                        fill="currentColor"
                        d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z"
                    />
                </svg>
            )}
        </span>
    );
}

function StatusPill({ status }) {
    const s = (status || "").toLowerCase();
    const cls =
        s === "available"
            ? "border-green-200 bg-green-50 text-green-700"
            : s === "working"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : s === "on hold"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : s === "blacklisted"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-gray-200 bg-gray-50 text-gray-700";

    return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${cls}`}>{status || "—"}</span>;
}

function InfoChip({ label, value }) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700">
            <span className="text-gray-800">{label}</span>
            <span className="text-gray-900">{value}</span>
        </span>
    );
}

function rolesLabel(roles = []) {
    if (!roles?.length) return "—";
    if (roles.length === 1) return roles[0];
    return `${roles[0]} +${roles.length - 1}`;
}

function isVerifiedValue(v) {
    const s = String(v || "").toLowerCase();
    return s === "verified" || s === "yes" || s === "true";
}

export default function CandidatesPage() {
    const pageSize = 15;



    const router = useRouter();
    const { user, role, authLoading } = useAuthClient();


    useEffect(() => {
        if (authLoading) return; // wait until auth finishes

        if (role === "clients" || role === "staff") {
            // do nothing
        } else if (role === "candidates") {
            router.replace("/candidate");
        }

    }, [role, authLoading, router]);


    const [search, setSearch] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");

    const [page, setPage] = useState(1);

    const [rows, setRows] = useState([]);
    const [pageCount, setPageCount] = useState(1);
    const [total, setTotal] = useState(0);

    const [loadingTable, setLoadingTable] = useState(true);
    const [tableError, setTableError] = useState("");

    const [selectedCandidate, setSelectedCandidate] = useState(null);

    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");
    const [detail, setDetail] = useState(null);

    const [cvLoading, setCvLoading] = useState(false);
    const [cvFailed, setCvFailed] = useState(false);
    const cvLoadedRef = useRef(false);
    const cvTimeoutRef = useRef(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(search.trim()), 350);
        return () => clearTimeout(t);
    }, [search]);

    async function loadCandidates(nextPage = page, q = debouncedQ) {
        setLoadingTable(true);
        setTableError("");
        try {
            const url = `/api/candidates/list?page=${nextPage}&pageSize=${pageSize}&q=${encodeURIComponent(q || "")}`;
            const json = await fetchJsonSafe(url);
            setRows(Array.isArray(json.items) ? json.items : []);
            setPageCount(Number(json.pageCount || 1));
            setTotal(Number(json.total || 0));
        } catch (e) {
            setTableError(e?.message || "Failed to load candidates");
            setRows([]);
            setPageCount(1);
            setTotal(0);
        } finally {
            setLoadingTable(false);
        }
    }

    useEffect(() => {
        loadCandidates(page, debouncedQ);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, debouncedQ]);

    function closeCandidate() {
        setSelectedCandidate(null);
        setDetail(null);
        setDetailError("");
        setDetailLoading(false);

        setCvLoading(false);
        setCvFailed(false);

        if (cvTimeoutRef.current) {
            clearTimeout(cvTimeoutRef.current);
            cvTimeoutRef.current = null;
        }
    }

    useEffect(() => {
        if (!selectedCandidate) return;
        const onKey = (e) => e.key === "Escape" && closeCandidate();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selectedCandidate]);

    useEffect(() => {
        if (!selectedCandidate) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => (document.body.style.overflow = prev);
    }, [selectedCandidate]);

    async function openCandidate(c) {
        setSelectedCandidate(c);
        setDetail(null);
        setDetailError("");
        setDetailLoading(true);

        try {
            const json = await fetchJsonSafe(`/api/candidates/getcandidate/${c.documentId}`);
            setDetail(json);

            const cvUrl = json?.existingMedia?.CV?.url || "";
            if (isPdfUrl(cvUrl)) {
                setCvLoading(true);
                setCvFailed(false);
                cvLoadedRef.current = false;

                if (cvTimeoutRef.current) clearTimeout(cvTimeoutRef.current);
                cvTimeoutRef.current = setTimeout(() => {
                    if (!cvLoadedRef.current) {
                        setCvFailed(true);
                        setCvLoading(false);
                    }
                }, 6000);
            } else {
                setCvLoading(false);
                setCvFailed(false);
            }
        } catch (e) {
            setDetailError(e?.message || "Failed to load candidate details");
        } finally {
            setDetailLoading(false);
        }
    }

    const headerText = useMemo(() => {
        const q = (debouncedQ || "").trim();
        if (!q) return `(${total} candidates)`;
        return `(${total} results for "${q}")`;
    }, [debouncedQ, total]);

    return (
        <div className="min-h-screen bg-gray-50">


            <div className="topHeading">
                Candidates
            </div>

            <main className="mt-10 mx-auto w-[95%] lg:w-[90%] px-2 sm:px-4 py-5">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <header className="border-b border-gray-200 bg-white px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="text-lg text-gray-900">Candidates</div>
                                <div className="text-sm text-gray-800">Number Of Candidates • {headerText}</div>
                            </div>

                            <div className="flex w-full sm:w-auto items-center gap-2 sm:justify-end">
                                <div className="relative w-full sm:w-lg">
                                    <input
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Search (name/ref/phone/email/role)..."
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 pr-10 text-sm text-gray-800 outline-none  focus:border-red-200 focus:ring-2 focus:ring-red-300"
                                    />
                                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 text-2xl">⌕</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => loadCandidates(page, debouncedQ)}
                                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                                    title="Reload from DB"
                                >
                                    Refresh
                                </button>

                                <Link
                                    href="/staff/candidates/new"
                                    className="rounded-xl bg-red-700 px-3 py-2 text-sm text-white hover:opacity-90 whitespace-nowrap"
                                >
                                    + Create New
                                </Link>
                            </div>
                        </div>
                    </header>

                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr className="text-xs uppercase text-gray-800">
                                    <th className="px-3 py-2">Id</th>
                                    <th className="px-3 py-2">Profile</th>
                                    <th className="px-3 py-2">Ref</th>
                                    <th className="px-3 py-2">Name</th>
                                    <th className="px-3 py-2">Phone</th>
                                    <th className="px-3 py-2">Nationality</th>
                                    <th className="px-3 py-2">Roles</th>
                                    <th className="px-3 py-2">Job Status</th>
                                    <th className="px-3 py-2">Verified</th>
                                    <th className="px-3 py-2">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loadingTable && authLoading ? (
                                    <tr>
                                        <td colSpan={10} className="px-3 py-6 text-sm text-gray-800">
                                            <div className="flex items-center justify-center gap-3">
                                                <ClipLoader
                                                    size={25}
                                                    color="#b91c1c"

                                                />
                                                <span>Loading candidates...</span>
                                            </div>
                                        </td>

                                    </tr>
                                ) : tableError ? (
                                    <tr>
                                        <td colSpan={10} className="px-3 py-6 text-sm text-red-700">
                                            {tableError}
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-3 py-6 text-sm text-gray-800">
                                            No candidates found.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((c) => (
                                        <tr key={c.documentId || c.id} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="px-3 py-2">{c.id}</td>
                                            <td className="px-3 py-2">
                                                <img
                                                    src={safeImgSrc(c.profileImageUrl)}
                                                    alt={c.fullName}
                                                    className="h-9 w-9 rounded-xl object-cover border border-gray-200 bg-white"
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = DEFAULT_AVATAR;
                                                    }}
                                                />
                                            </td>

                                            <td className="px-3 py-2 text-sm text-gray-900">{c.referenceNumber || "—"}</td>

                                            <td className="px-3 py-2 text-sm text-gray-900">
                                                {c.fullName || "—"}
                                                <div className="text-xs text-gray-500">{c.email || "—"}</div>
                                            </td>

                                            <td className="px-3 py-2 text-sm text-gray-800">{c.mobile || "—"}</td>
                                            <td className="px-3 py-2 text-sm text-gray-800">{c.nationalityList || "—"}</td>
                                            <td className="px-3 py-2 text-sm text-gray-800">{rolesLabel(c.job_roles || [])}</td>

                                            <td className="px-3 py-2">
                                                <StatusPill status={c.jobStatus} />
                                            </td>

                                            <td className="px-3 py-2">
                                                <VerifiedIcon ok={isVerifiedValue(c.isProfileVerifiedList)} />
                                            </td>

                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openCandidate(c)}
                                                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                                    >
                                                        View
                                                    </button>

                                                    <Link
                                                        href={`/staff/candidates/${c.documentId}/`}
                                                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                                    >
                                                        Edit
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3">
                        <div className="text-sm text-gray-800">
                            Page {page} of {pageCount}
                            <span className="ml-2 text-xs text-gray-500">({total} candidates)</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1 || loadingTable}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            >
                                Prev
                            </button>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                disabled={page >= pageCount || loadingTable}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {selectedCandidate && (
                    <div
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                        role="dialog"
                        aria-modal="true"
                        onMouseDown={(e) => {
                            if (e.target === e.currentTarget) closeCandidate();
                        }}
                    >
                        <div className="absolute inset-0 bg-black/50" />

                        <div className="relative w-full sm:max-w-6xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-lg sm:text-xl text-red-700 truncate">Candidate Profile</div>
                                    <div className="text-sm text-gray-800 truncate">
                                        Reference No: {selectedCandidate.referenceNumber}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/staff/candidates/${selectedCandidate.documentId}`}
                                        className="rounded-lg bg-red-700 text-white px-3 py-2 text-sm hover:opacity-90"
                                        onClick={closeCandidate}
                                    >
                                        Edit Candidate
                                    </Link>

                                    <button
                                        onClick={closeCandidate}
                                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                        type="button"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                            {detailLoading ? (
                                <div className="mt-4 rounded-xl border border-gray-200 p-4 text-sm text-gray-700">Loading details...</div>
                            ) : detailError ? (
                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{detailError}</div>
                            ) : (
                                <>
                                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={safeImgSrc(detail?.existingMedia?.profileImage?.url || selectedCandidate.profileImageUrl)}
                                                alt={selectedCandidate.fullName}
                                                className="h-28 w-28 rounded-full object-cover border border-gray-200 bg-white"
                                                onError={(e) => {
                                                    e.currentTarget.onerror = null;
                                                    e.currentTarget.src = DEFAULT_AVATAR;
                                                }}
                                            />
                                            <div>
                                                <div className="text-xl text-red-700">{detail?.formDefaults?.fullName || selectedCandidate.fullName}</div>
                                                <div className="text-sm text-gray-800">
                                                    {rolesLabel(selectedCandidate.job_roles || [])} •{" "}
                                                    <span className="font-medium">{detail?.formDefaults?.jobStatus || selectedCandidate.jobStatus || "—"}</span>
                                                </div>

                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <InfoChip label="Experience:" value={`${detail?.formDefaults?.numberOfExperience ?? 0}Y`} />
                                                    <InfoChip label="Employed:" value={detail?.formDefaults?.currentlyEmployed ? "Yes" : "No"} />
                                                    <InfoChip label="Source:" value={detail?.formDefaults?.source || "—"} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="sm:ml-auto flex items-center gap-2">
                                            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700">
                                                <VerifiedIcon ok={isVerifiedValue(detail?.formDefaults?.isProfileVerifiedList || selectedCandidate.isProfileVerifiedList)} />
                                                <span>{detail?.formDefaults?.isProfileVerifiedList || selectedCandidate.isProfileVerifiedList || "Not Verified"}</span>
                                            </span>
                                            <StatusPill status={detail?.formDefaults?.jobStatus || selectedCandidate.jobStatus} />
                                        </div>
                                    </div>

                                    <div className="mt-4 rounded-xl border border-gray-400 p-3 ">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                            {[
                                                ["Reference", detail?.formDefaults?.referenceNumber || selectedCandidate.referenceNumber],
                                                ["First Name", detail?.formDefaults?.firstName],
                                                ["Last Name", detail?.formDefaults?.lastName],
                                                ["Username", detail?.formDefaults?.username],
                                                ["Email", detail?.formDefaults?.email],
                                                ["Mobile", detail?.formDefaults?.mobile],
                                                ["Birth Date", detail?.formDefaults?.birthDate],
                                                ["Gender", detail?.formDefaults?.genderList],
                                                ["Nationality", detail?.formDefaults?.nationalityList],
                                                ["Marital Status", detail?.formDefaults?.maritalStatusList],
                                                ["Seasonal Status", detail?.formDefaults?.seasonalStatusList],
                                                ["English Level", detail?.formDefaults?.englishLevelList],
                                                ["Previous Company", detail?.formDefaults?.previousCompany],
                                                ["Previous Job Experience", `${detail?.formDefaults?.previousJobExperiece ?? 0}Y`],
                                                ["Current Company", detail?.formDefaults?.currentCompany],
                                                ["Current Job Experience", `${detail?.formDefaults?.currentJobExperiece ?? 0}Y`],
                                                ["Passport Expiry", detail?.formDefaults?.passportExpireDate],
                                            ].map(([k, v]) => (
                                                <div className="text-sm" key={k}>
                                                    <div className="text-gray-700 ">{k}</div>
                                                    <div className="text-gray-800 break-words">{v || "—"}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <div className="text-sm">
                                                <div className="text-gray-700">Short Summary</div>
                                                <div className="text-gray-800">{detail?.formDefaults?.shortSummary || "—"}</div>
                                            </div>
                                            <div className="text-sm">
                                                <div className="text-gray-700">Private Notes</div>
                                                <div className="text-gray-800">{detail?.formDefaults?.privateNotes || "—"}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                                        <div className="rounded-xl border border-gray-400 p-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="text-base text-gray-800">Passport</div>
                                                {detail?.existingMedia?.passport?.url ? (
                                                    <a
                                                        href={detail.existingMedia.passport.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-sm rounded-lg bg-gray-900 text-white px-3 py-2 hover:opacity-90"
                                                    >
                                                        Download
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-gray-500">No file</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-800 mt-2">Expiry: {detail?.formDefaults?.passportExpireDate || "—"}</div>
                                        </div>

                                        <div className="rounded-xl border border-gray-400 p-3">
                                            <div className="text-sm text-gray-800">Working Video</div>
                                            <div className="mt-2">
                                                {isValidLink(detail?.formDefaults?.workingVideoLink) ? (
                                                    <a
                                                        className="text-sm text-blue-600 hover:underline"
                                                        href={detail.formDefaults.workingVideoLink}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Open Video
                                                    </a>
                                                ) : (
                                                    <div className="text-xs text-gray-500">None</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-gray-400 p-3">
                                            <div className="text-sm text-gray-800">MI Screening Video</div>
                                            <div className="mt-2">
                                                {isValidLink(detail?.formDefaults?.miScreeningVideoLink) ? (
                                                    <a
                                                        className="text-sm text-blue-600 hover:underline"
                                                        href={detail.formDefaults.miScreeningVideoLink}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Open Video
                                                    </a>
                                                ) : (
                                                    <div className="text-xs text-gray-500">None</div>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-800 mt-2">Screening Date: {detail?.formDefaults?.dateScreeningInterview || "—"}</div>
                                        </div>
                                    </div>

                                    <div className="mt-4 rounded-xl border border-gray-400 p-3">
                                        <div className="text-sm text-gray-800">Documents ({detail?.formDefaults?.documents?.length || 0})</div>

                                        <div className="mt-3 space-y-2">
                                            {(detail?.formDefaults?.documents || []).map((d, idx) => (
                                                <div
                                                    key={idx}
                                                    className="rounded-xl border border-gray-400 bg-gray-50 p-3 flex flex-col sm:flex-row sm:items-center gap-2"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm text-gray-800 truncate">{d.name || "—"}</div>
                                                        <div className="text-xs text-gray-800">
                                                            Remarks: <span className="text-gray-800">{d.remarks || "—"}</span>
                                                        </div>
                                                    </div>

                                                    {d.existingUrl ? (
                                                        <a
                                                            href={d.existingUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="w-full sm:w-auto text-center rounded-lg bg-blue-600 text-white px-3 py-2 text-sm hover:opacity-90"
                                                        >
                                                            Download
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-gray-500">No file</span>
                                                    )}
                                                </div>
                                            ))}
                                            {(detail?.formDefaults?.documents || []).length === 0 ? (
                                                <div className="text-xs text-gray-500">No documents</div>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-sm text-gray-800">CV Preview </div>
                                            {detail?.existingMedia?.CV?.url ? (
                                                <a href={detail.existingMedia.CV.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                                                    Open / Download
                                                </a>
                                            ) : (
                                                <span className="text-xs text-gray-500">No file</span>
                                            )}
                                        </div>

                                        {detail?.existingMedia?.CV?.url ? (
                                            <div className="mt-2 rounded-xl border border-gray-400 overflow-hidden relative">
                                                {isPdfUrl(detail.existingMedia.CV.url) ? (
                                                    <>
                                                        {cvLoading && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-white">
                                                                <div className="h-12 w-12 rounded-full border-4 border-red-600 border-t-transparent animate-spin" />
                                                            </div>
                                                        )}

                                                        {cvFailed ? (
                                                            <div className="p-4 sm:p-6">
                                                                <div className="text-red-700">CV preview failed to load</div>
                                                                <p className="text-sm text-gray-800 mt-2">Use Open / Download to open in new tab.</p>
                                                            </div>
                                                        ) : (
                                                            <div className="h-[65vh] sm:h-[78vh]">
                                                                <iframe
                                                                    src={detail.existingMedia.CV.url}
                                                                    title="CV PDF"
                                                                    className="w-full h-full"
                                                                    onLoad={() => {
                                                                        cvLoadedRef.current = true;
                                                                        setCvLoading(false);
                                                                        setCvFailed(false);
                                                                        if (cvTimeoutRef.current) {
                                                                            clearTimeout(cvTimeoutRef.current);
                                                                            cvTimeoutRef.current = null;
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="p-3 bg-gray-50">
                                                        <img
                                                            src={detail.existingMedia.CV.url}
                                                            alt="CV"
                                                            className="w-full max-h-[78vh] object-contain rounded-xl border border-gray-400 bg-white"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}

                                        <p className="mt-2 text-xs text-gray-500">
                                            Tip: If preview doesn’t load, click <span className="text-gray-700">Open / Download</span>.
                                        </p>
                                    </div>
                                </>
                            )}

                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={closeCandidate}
                                    className="rounded-lg border border-gray-400 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    type="button"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}