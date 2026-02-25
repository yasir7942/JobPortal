"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/app/components/layouts/staff/Header";

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

function isPdfUrl(url) {
    if (!url) return false;
    const u = String(url).toLowerCase();
    return u.includes(".pdf");
}

function safeImgSrc(src) {
    const s = (src || "").trim();
    return s ? s : DEFAULT_AVATAR;
}

/** ✅ Dummy candidates (UPDATED to match your Strapi fields) */
const DUMMY_CANDIDATES = Array.from({ length: 35 }).map((_, i) => {
    const id = 1001 + i;

    const imgs = [12, 22, 31, 45, 52, 61, 68, 71];
    const img = imgs[i % imgs.length];

    const firstNames = ["Ali", "Ahmed", "Fatima", "Omar", "Usman", "Hina", "Bilal", "Ayesha"];
    const lastNames = ["Khan", "Raza", "Noor", "Hassan", "Aslam", "Sheikh", "Iqbal", "Malik"];

    const nationalities = ["Pakistan", "India", "Bangladesh", "Egypt", "Nepal", "Philippines", "Sri Lanka", "UAE"];
    const genders = ["Male", "Female", "Undisclosed"];
    const marital = ["Single", "Married", "Divorced", "Widowed"];
    const seasonal = ["Seasonal", "Permanent", "Any"];
    const english = ["Average", "Basic", "Below Basic", "Excellent"];
    const jobStatus = ["Available", "Working", "On Hold", "Blacklisted"];

    const allRoles = [
        "CNC Machine Operator",
        "Electrician",
        "Fabricator",
        "General Worker",
        "Car Mechanic",
        "Forklift Operator",
        "Welder",
    ];

    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];

    const nationality = nationalities[i % nationalities.length];
    const gender = genders[i % genders.length];

    // pick 1-3 roles
    const rolesCount = (i % 3) + 1;
    const job_roles = Array.from({ length: rolesCount }).map((__, r) => allRoles[(i + r) % allRoles.length]);

    const cvUrl =
        i % 4 === 0
            ? "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
            : `https://picsum.photos/seed/cv-${id}/900/1200`; // simulate image CV sometimes

    return {
        id,
        profileImageUrl: i % 7 === 0 ? "" : `https://i.pravatar.cc/300?img=${img}`,
        referenceNumber: `CND-${String(id).slice(-4)}`,

        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,

        gender,
        birthDate: "1997-06-10",

        nationality,
        maritalStatus: marital[i % marital.length],
        seasonalStatus: seasonal[i % seasonal.length],
        englishLevel: english[i % english.length],

        isProfileVerified: i % 3 !== 0,

        mobile: `+92 3${(i % 10) + 1}0 ${1000000 + i}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        username: `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,

        job_roles,
        jobStatus: jobStatus[i % jobStatus.length],

        numberOfExperience: (i % 12) + 1,
        currentlyEmployed: i % 2 === 0,
        source: ["Facebook", "Referral", "Agency", "Walk-in"][i % 4],

        shortSummary: "Ready to join",
        privateNotes: "Internal notes example",

        passportExpireDate: "2028-06-30",

        passportUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        cvUrl,

        workingVideoUrls:
            i % 5 === 0
                ? [
                    "https://file-examples.com/storage/fe9c09db77c5d52f2b0d51a/2017/04/file_example_MP4_480_1_5MG.mp4",
                ]
                : [],

        miScreeningVideoUrl:
            i % 6 === 0
                ? "https://file-examples.com/storage/fe9c09db77c5d52f2b0d51a/2017/04/file_example_MP4_480_1_5MG.mp4"
                : "",

        documents: [
            {
                name: "Experience Letter",
                remarks: "Verified",
                url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            },
            {
                name: "Education Certificate",
                remarks: "Pending",
                url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            },
        ],

        suggestedToClientsCount: (i * 3) % 21,
        shortlistedByClientsCount: (i * 2) % 11,
    };
});

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
            <span className="text-gray-600">{label}</span>
            <span className="text-gray-900">{value}</span>
        </span>
    );
}

function rolesLabel(roles = []) {
    if (!roles?.length) return "—";
    if (roles.length === 1) return roles[0];
    return `${roles[0]} +${roles.length - 1}`;
}

export default function CandidatesPage() {
    const [allCandidates] = useState(DUMMY_CANDIDATES);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 12;

    const [selectedCandidate, setSelectedCandidate] = useState(null);

    // CV loading (pdf iframe)
    const [cvLoading, setCvLoading] = useState(false);
    const [cvFailed, setCvFailed] = useState(false);
    const cvLoadedRef = useRef(false);
    const cvTimeoutRef = useRef(null);

    // Hover preview
    const [hover, setHover] = useState({ show: false, x: 0, y: 0, candidate: null });

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return allCandidates;

        return allCandidates.filter((c) => {
            const hay = [
                c.referenceNumber,
                c.fullName,
                c.nationality,
                c.jobStatus,
                ...(c.job_roles || []),
                c.mobile,
                c.email,
                c.username,
                c.source,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return hay.includes(q);
        });
    }, [search, allCandidates]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const rows = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    useEffect(() => {
        if (page > pageCount) setPage(1);
    }, [page, pageCount]);

    function openCandidate(c) {
        setSelectedCandidate(c);

        // CV loader only for PDF iframe preview
        if (isPdfUrl(c.cvUrl)) {
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
    }

    function closeCandidate() {
        setSelectedCandidate(null);
        setCvLoading(false);
        setCvFailed(false);
        if (cvTimeoutRef.current) {
            clearTimeout(cvTimeoutRef.current);
            cvTimeoutRef.current = null;
        }
    }

    // ESC to close popup
    useEffect(() => {
        if (!selectedCandidate) return;
        const onKey = (e) => e.key === "Escape" && closeCandidate();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selectedCandidate]);

    // body scroll lock when popup open
    useEffect(() => {
        if (!selectedCandidate) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => (document.body.style.overflow = prev);
    }, [selectedCandidate]);

    // Hover helpers
    function onAvatarEnter(e, c) {
        setHover({ show: true, x: e.clientX, y: e.clientY, candidate: c });
    }
    function onAvatarMove(e) {
        if (!hover.show) return;
        setHover((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
    }
    function onAvatarLeave() {
        setHover({ show: false, x: 0, y: 0, candidate: null });
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <div className="mt-10 p-6 font-bold text-3xl sm:text-5xl text-red-700 border-b border-gray-300">
                Candidates
            </div>

            <main className="mt-10 mx-auto w-[95%] lg:w-[90%] px-2 sm:px-4 py-5">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <header className="border-b border-gray-200 bg-white px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="text-lg text-gray-900">Candidates</div>
                                <div className="text-sm text-gray-600">Dummy data for now. Later connect Strapi.</div>
                            </div>

                            <div className="flex w-full sm:w-auto items-center gap-2 sm:justify-end">
                                <Link
                                    href="/staff/search-candidates"
                                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                                    title="Open advanced search page"
                                >
                                    Advanced Search
                                </Link>

                                <div className="relative w-full sm:w-72">
                                    <input
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Search in table..."
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 pr-10 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-200"
                                    />
                                    <span className="pointer-events-none absolute right-3 top-2.5 text-gray-400">⌕</span>
                                </div>

                                <Link
                                    href="/staff/candidates/new"
                                    className="rounded-xl bg-red-700 px-3 py-2 text-sm text-white hover:opacity-90 whitespace-nowrap"
                                >
                                    + Create New
                                </Link>
                            </div>
                        </div>
                    </header>

                    {/* ✅ TABLE (added Phone column) */}
                    <div className="w-full overflow-x-auto">
                        <table className="min-w-[1450px] w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr className="text-xs uppercase text-gray-600">
                                    <th className="px-3 py-2">Profile</th>
                                    <th className="px-3 py-2">Ref</th>
                                    <th className="px-3 py-2">Name</th>
                                    <th className="px-3 py-2">Phone</th>
                                    <th className="px-3 py-2">Nationality</th>
                                    <th className="px-3 py-2">Roles</th>
                                    <th className="px-3 py-2">Job Status</th>
                                    <th className="px-3 py-2">Suggested</th>
                                    <th className="px-3 py-2">Shortlisted</th>
                                    <th className="px-3 py-2">Verified</th>
                                    <th className="px-3 py-2">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="px-3 py-6 text-sm text-gray-600">
                                            No candidates found.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((c) => (
                                        <tr key={c.id} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="px-3 py-2">
                                                <img
                                                    src={safeImgSrc(c.profileImageUrl)}
                                                    alt={c.fullName}
                                                    className="h-9 w-9 rounded-xl object-cover border border-gray-200 bg-white"
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = DEFAULT_AVATAR;
                                                    }}
                                                    onMouseEnter={(e) => onAvatarEnter(e, c)}
                                                    onMouseMove={onAvatarMove}
                                                    onMouseLeave={onAvatarLeave}
                                                />
                                            </td>

                                            <td className="px-3 py-2 text-sm text-gray-900">{c.referenceNumber}</td>

                                            <td className="px-3 py-2 text-sm text-gray-900">
                                                {c.fullName}
                                                <div className="text-xs text-gray-500">{c.email}</div>
                                            </td>

                                            <td className="px-3 py-2 text-sm text-gray-800">{c.mobile || "—"}</td>

                                            <td className="px-3 py-2 text-sm text-gray-800">{c.nationality}</td>

                                            <td className="px-3 py-2 text-sm text-gray-800">{rolesLabel(c.job_roles)}</td>

                                            <td className="px-3 py-2">
                                                <StatusPill status={c.jobStatus} />
                                            </td>

                                            <td className="px-3 py-2 text-sm text-gray-900">{c.suggestedToClientsCount ?? 0}</td>

                                            <td className="px-3 py-2 text-sm text-gray-900">{c.shortlistedByClientsCount ?? 0}</td>

                                            <td className="px-3 py-2">
                                                <VerifiedIcon ok={!!c.isProfileVerified} />
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

                                                    {/* ✅ fixed edit route */}
                                                    <Link
                                                        href={`/staff/candidates/${c.id}/edit`}
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

                    {/* pagination */}
                    <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3">
                        <div className="text-sm text-gray-600">
                            Page {page} of {pageCount}
                            <span className="ml-2 text-xs text-gray-500">({filtered.length} candidates)</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            >
                                Prev
                            </button>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                disabled={page >= pageCount}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* Hover Preview */}
                {hover.show && hover.candidate && (
                    <div
                        style={{
                            position: "fixed",
                            left: Math.min(hover.x + 18, window.innerWidth - 260),
                            top: Math.min(hover.y - 80, window.innerHeight - 260),
                            zIndex: 9999,
                            width: 240,
                            pointerEvents: "none",
                        }}
                    >
                        <div
                            style={{
                                background: "white",
                                border: "1px solid rgba(0,0,0,0.12)",
                                borderRadius: 16,
                                boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
                                padding: 10,
                            }}
                        >
                            <img
                                src={safeImgSrc(hover.candidate.profileImageUrl)}
                                alt={hover.candidate.fullName}
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = DEFAULT_AVATAR;
                                }}
                                style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 14 }}
                            />
                            <div style={{ marginTop: 8, fontSize: 12, color: "#111827" }}>{hover.candidate.fullName}</div>
                            <div style={{ fontSize: 12, color: "#6B7280" }}>{hover.candidate.referenceNumber}</div>
                        </div>
                    </div>
                )}

                {/* ✅ Candidate Popup (UPDATED view data) */}
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
                            {/* Top bar */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-lg sm:text-xl truncate">Candidate Profile</div>
                                    <div className="text-sm text-gray-600 truncate">
                                        {selectedCandidate.fullName} • {selectedCandidate.referenceNumber}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/staff/candidates/${selectedCandidate.id}/edit`}
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

                            {/* Header */}
                            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <img
                                        src={safeImgSrc(selectedCandidate.profileImageUrl)}
                                        alt={selectedCandidate.fullName}
                                        className="h-28 w-28 rounded-full object-cover border border-gray-200 bg-white"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = DEFAULT_AVATAR;
                                        }}
                                    />
                                    <div>
                                        <div className="text-xl text-red-700">{selectedCandidate.fullName}</div>
                                        <div className="text-sm text-gray-600">
                                            {rolesLabel(selectedCandidate.job_roles)} • <span className="font-medium">{selectedCandidate.jobStatus}</span>
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <InfoChip label="Suggested:" value={selectedCandidate.suggestedToClientsCount ?? 0} />
                                            <InfoChip label="Shortlisted:" value={selectedCandidate.shortlistedByClientsCount ?? 0} />
                                            <InfoChip label="Experience:" value={`${selectedCandidate.numberOfExperience ?? 0}y`} />
                                            <InfoChip label="Employed:" value={selectedCandidate.currentlyEmployed ? "Yes" : "No"} />
                                            <InfoChip label="Source:" value={selectedCandidate.source || "—"} />
                                        </div>
                                    </div>
                                </div>

                                <div className="sm:ml-auto flex items-center gap-2 bg-red-500">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700">
                                        <VerifiedIcon ok={!!selectedCandidate.isProfileVerifiedList} />
                                        <span>{selectedCandidate.isProfileVerifiedList ? "Verified" : "Not Verified"}</span>
                                    </span>
                                    <StatusPill status={selectedCandidate.jobStatus} />
                                </div>
                            </div>

                            {/* Details */}
                            <div className="mt-4 rounded-xl border border-gray-200 p-3">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {[
                                        ["Reference", selectedCandidate.referenceNumber],
                                        ["First Name", selectedCandidate.firstName],
                                        ["Last Name", selectedCandidate.lastName],
                                        ["Username", selectedCandidate.username],
                                        ["Email", selectedCandidate.email],
                                        ["Mobile", selectedCandidate.mobile],
                                        ["Birth Date", selectedCandidate.birthDate],
                                        ["Gender", selectedCandidate.gender],
                                        ["Nationality", selectedCandidate.nationality],
                                        ["Marital Status", selectedCandidate.maritalStatus],
                                        ["Seasonal Status", selectedCandidate.seasonalStatus],
                                        ["English Level", selectedCandidate.englishLevel],
                                        ["Passport Expiry", selectedCandidate.passportExpireDate],
                                    ].map(([k, v]) => (
                                        <div className="text-xs" key={k}>
                                            <div className="text-gray-500">{k}</div>
                                            <div className="text-gray-800 break-words">{v || "—"}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div className="text-xs">
                                        <div className="text-gray-500">Short Summary</div>
                                        <div className="text-gray-800">{selectedCandidate.shortSummary || "—"}</div>
                                    </div>
                                    <div className="text-xs">
                                        <div className="text-gray-500">Private Notes</div>
                                        <div className="text-gray-800">{selectedCandidate.privateNotes || "—"}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Passport + Working videos + MI screening video */}
                            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                                <div className="rounded-xl border border-gray-200 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm text-gray-800">Passport</div>
                                        <a
                                            href={selectedCandidate.passportUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm rounded-lg bg-gray-900 text-white px-3 py-2 hover:opacity-90"
                                        >
                                            Download
                                        </a>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2">Expiry: {selectedCandidate.passportExpireDate || "—"}</div>
                                </div>

                                <div className="rounded-xl border border-gray-200 p-3">
                                    <div className="text-sm text-gray-800">Working Videos ({selectedCandidate.workingVideoUrls?.length || 0})</div>
                                    <div className="mt-2 space-y-1">
                                        {(selectedCandidate.workingVideoUrls || []).length ? (
                                            selectedCandidate.workingVideoUrls.map((u, idx) => (
                                                <a
                                                    key={idx}
                                                    className="block text-sm text-blue-600 hover:underline truncate"
                                                    href={u}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Video {idx + 1}
                                                </a>
                                            ))
                                        ) : (
                                            <div className="text-xs text-gray-500">None</div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-200 p-3">
                                    <div className="text-sm text-gray-800">MI Screening Video</div>
                                    <div className="mt-2">
                                        {selectedCandidate.miScreeningVideoUrl ? (
                                            <a
                                                className="text-sm text-blue-600 hover:underline"
                                                href={selectedCandidate.miScreeningVideoUrl}
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
                            </div>

                            {/* Documents */}
                            <div className="mt-4 rounded-xl border border-gray-200 p-3">
                                <div className="text-sm text-gray-800">Documents ({selectedCandidate.documents?.length || 0})</div>

                                <div className="mt-3 space-y-2">
                                    {(selectedCandidate.documents || []).map((d, idx) => (
                                        <div
                                            key={idx}
                                            className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex flex-col sm:flex-row sm:items-center gap-2"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-gray-800 truncate">{d.name}</div>
                                                <div className="text-xs text-gray-600">
                                                    Remarks: <span className="text-gray-800">{d.remarks || "—"}</span>
                                                </div>
                                            </div>

                                            <a
                                                href={d.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full sm:w-auto text-center rounded-lg bg-blue-600 text-white px-3 py-2 text-sm hover:opacity-90"
                                            >
                                                Download
                                            </a>
                                        </div>
                                    ))}
                                    {(selectedCandidate.documents || []).length === 0 ? (
                                        <div className="text-xs text-gray-500">No documents</div>
                                    ) : null}
                                </div>
                            </div>

                            {/* CV Viewer (PDF or Image) */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm text-gray-800">CV Preview</div>
                                    <a href={selectedCandidate.cvUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                                        Open / Download
                                    </a>
                                </div>

                                <div className="mt-2 rounded-xl border border-gray-200 overflow-hidden relative">
                                    {isPdfUrl(selectedCandidate.cvUrl) ? (
                                        <>
                                            {cvLoading && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-white">
                                                    <div className="h-12 w-12 rounded-full border-4 border-red-600 border-t-transparent animate-spin" />
                                                </div>
                                            )}

                                            {cvFailed ? (
                                                <div className="p-4 sm:p-6">
                                                    <div className="text-red-700">CV preview failed to load</div>
                                                    <p className="text-sm text-gray-600 mt-2">Use Open / Download to open in new tab.</p>
                                                </div>
                                            ) : (
                                                <div className="h-[65vh] sm:h-[78vh]">
                                                    <iframe
                                                        src={selectedCandidate.cvUrl}
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
                                                src={selectedCandidate.cvUrl}
                                                alt="CV"
                                                className="w-full max-h-[78vh] object-contain rounded-xl border border-gray-200 bg-white"
                                            />
                                        </div>
                                    )}
                                </div>

                                <p className="mt-2 text-xs text-gray-500">
                                    Tip: If preview doesn’t load, click <span className="text-gray-700">Open / Download</span>.
                                </p>
                            </div>

                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={closeCandidate}
                                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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