"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/app/components/layouts/client/Header";

const DUMMY_PDF =
    "https://lubrex.net/wp-content/uploads/2025/11/VELOCITY-PRIME.pdf";

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

function LikeChip({ icon, label, value }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2 py-1 text-[11px] text-gray-700">
            <span className="text-base leading-none">{icon}</span>
            <span className="truncate">{label}</span>
            <span className="font-semibold text-gray-900">{value}</span>
        </span>
    );
}

export default function SearchCandidatesPage() {
    // Filters
    const [query, setQuery] = useState("");
    const [role, setRole] = useState("");
    const [country, setCountry] = useState("");

    // Popup
    const [selectedCandidate, setSelectedCandidate] = useState(null);

    // Your lists (like previous pages)
    const [mySuggested, setMySuggested] = useState([]);
    const [myShortlisted, setMyShortlisted] = useState([]);
    const [myRequestedInterviews, setMyRequestedInterviews] = useState([]);

    // PDF load control
    const cvTimeoutRef = useRef(null);
    const cvLoadedRef = useRef(false);
    const [cvLoading, setCvLoading] = useState(false);
    const [cvFailed, setCvFailed] = useState(false);

    const candidates = useMemo(
        () => [
            {
                id: "c1",
                referenceNumber: "CAN-51255",
                firstName: "Ahmed",
                lastName: "Khan",
                fullName: "Ahmed Khan",
                email: "ahmed.khan@email.com",
                mobile: "+92 300 1234567",
                birthDate: "1996-04-10",
                nationality: "Pakistan",
                country: "Pakistan",
                gender: "Male",
                maritalStatus: "Single",
                englishLevel: "Good",
                isProfileVerified: true,
                jobRole: "CNC Machine Operator",
                avatar: "https://i.pravatar.cc/220?img=12",
                summary: "CNC operator with 4 years experience in milling and lathe setups.",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
                suggestedToClientsCount: 2, // ✅ requested: suggested to client 2
                shortlistedByClientsCount: 3, // ✅ requested: shortlisted 3 other clients
                documents: [
                    { name: "Education Certificate.pdf", remarks: "Verified copy", url: DUMMY_PDF },
                    { name: "Experience Letter.pdf", remarks: "2 years UAE", url: DUMMY_PDF },
                    { name: "Trade Card.pdf", remarks: "Pending verification", url: DUMMY_PDF },
                ],
            },
            {
                id: "c2",
                referenceNumber: "CAN-51256",
                firstName: "Mohammed",
                lastName: "Ali",
                fullName: "Mohammed Ali",
                email: "mohammed.ali@email.com",
                mobile: "+971 50 555 1111",
                birthDate: "1994-08-22",
                nationality: "UAE",
                country: "UAE",
                gender: "Male",
                maritalStatus: "Married",
                englishLevel: "Excellent",
                isProfileVerified: false,
                jobRole: "Car Mechanic",
                avatar: "https://i.pravatar.cc/220?img=11",
                summary: "Hands-on operator, quality control, tooling changeovers and reporting.",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
                suggestedToClientsCount: 2,
                shortlistedByClientsCount: 3,
                documents: [
                    { name: "Diploma.pdf", remarks: "Uploaded", url: DUMMY_PDF },
                    { name: "Experience Letter.pdf", remarks: "Pending", url: DUMMY_PDF },
                    { name: "ID Copy.pdf", remarks: "Verified", url: DUMMY_PDF },
                ],
            },
            {
                id: "c3",
                referenceNumber: "CAN-51257",
                firstName: "Rizwan",
                lastName: "Saleem",
                fullName: "Rizwan Saleem",
                email: "rizwan.saleem@email.com",
                mobile: "+92 333 8881122",
                birthDate: "1997-01-15",
                nationality: "Pakistan",
                country: "Pakistan",
                gender: "Male",
                maritalStatus: "Single",
                englishLevel: "Good",
                isProfileVerified: true,
                jobRole: "Fabricator",
                avatar: "https://i.pravatar.cc/220?img=9",
                summary: "CNC + fabrication background. Can read drawings and meet tight tolerances.",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
                suggestedToClientsCount: 2,
                shortlistedByClientsCount: 3,
                documents: [
                    { name: "Skill Certificate.pdf", remarks: "Verified", url: DUMMY_PDF },
                    { name: "Experience Letter.pdf", remarks: "3 years", url: DUMMY_PDF },
                    { name: "CNIC Copy.pdf", remarks: "Verified", url: DUMMY_PDF },
                ],
            },
            {
                id: "c4",
                referenceNumber: "CAN-51258",
                firstName: "Saeed",
                lastName: "Noor",
                fullName: "Saeed Noor",
                email: "saeed.noor@email.com",
                mobile: "+91 98765 12345",
                birthDate: "1993-11-05",
                nationality: "India",
                country: "India",
                gender: "Male",
                maritalStatus: "Married",
                englishLevel: "Basic",
                isProfileVerified: false,
                jobRole: "Forklift Operator",
                avatar: "https://i.pravatar.cc/220?img=8",
                summary: "Production line operator, preventive maintenance & shift reporting.",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
                suggestedToClientsCount: 2,
                shortlistedByClientsCount: 3,
                documents: [
                    { name: "Diploma.pdf", remarks: "Uploaded", url: DUMMY_PDF },
                    { name: "Experience Letter.pdf", remarks: "Pending verification", url: DUMMY_PDF },
                    { name: "Passport Copy.pdf", remarks: "Uploaded", url: DUMMY_PDF },
                ],
            },
            {
                id: "c5",
                referenceNumber: "CAN-51259",
                firstName: "Bilal",
                lastName: "Hussain",
                fullName: "Bilal Hussain",
                email: "bilal.hussain@email.com",
                mobile: "+880 17 0000 1111",
                birthDate: "1998-03-19",
                nationality: "Bangladesh",
                country: "Bangladesh",
                gender: "Male",
                maritalStatus: "Single",
                englishLevel: "Good",
                isProfileVerified: true,
                jobRole: "CNC Machine Operator",
                avatar: "https://i.pravatar.cc/220?img=7",
                summary: "CNC lathe operator with inspection tools experience (micrometer, caliper).",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
                suggestedToClientsCount: 2,
                shortlistedByClientsCount: 3,
                documents: [
                    { name: "Training Certificate.pdf", remarks: "Verified", url: DUMMY_PDF },
                    { name: "Experience Letter.pdf", remarks: "2 years", url: DUMMY_PDF },
                    { name: "Passport Copy.pdf", remarks: "Verified", url: DUMMY_PDF },
                ],
            },
            {
                id: "c6",
                referenceNumber: "CAN-51260",
                firstName: "Farhan",
                lastName: "Aziz",
                fullName: "Farhan Aziz",
                email: "farhan.aziz@email.com",
                mobile: "+977 98 111 2222",
                birthDate: "1995-06-02",
                nationality: "Nepal",
                country: "Nepal",
                gender: "Male",
                maritalStatus: "Single",
                englishLevel: "Basic",
                isProfileVerified: false,
                jobRole: "Electrician",
                avatar: "https://i.pravatar.cc/220?img=5",
                summary: "Strong quality checks and safety compliance. Site + workshop experience.",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
                suggestedToClientsCount: 2,
                shortlistedByClientsCount: 3,
                documents: [
                    { name: "Skill Card.pdf", remarks: "Uploaded", url: DUMMY_PDF },
                    { name: "Experience Letter.pdf", remarks: "Pending", url: DUMMY_PDF },
                    { name: "Passport Copy.pdf", remarks: "Uploaded", url: DUMMY_PDF },
                ],
            },
            {
                id: "c7",
                referenceNumber: "CAN-51261",
                firstName: "Hassan",
                lastName: "Raza",
                fullName: "Hassan Raza",
                email: "hassan.raza@email.com",
                mobile: "+92 301 777 1010",
                birthDate: "1999-09-12",
                nationality: "Pakistan",
                country: "Pakistan",
                gender: "Male",
                maritalStatus: "Single",
                englishLevel: "Excellent",
                isProfileVerified: true,
                jobRole: "CNC Machine Operator",
                avatar: "https://i.pravatar.cc/220?img=4",
                summary: "CNC setup assistant → operator. Tooling and measurement knowledge.",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
                suggestedToClientsCount: 2,
                shortlistedByClientsCount: 3,
                documents: [
                    { name: "Education Certificate.pdf", remarks: "Verified", url: DUMMY_PDF },
                    { name: "Experience Letter.pdf", remarks: "1.5 years", url: DUMMY_PDF },
                    { name: "CNIC Copy.pdf", remarks: "Uploaded", url: DUMMY_PDF },
                ],
            },
            {
                id: "c8",
                referenceNumber: "CAN-51262",
                firstName: "Imran",
                lastName: "Shah",
                fullName: "Imran Shah",
                email: "imran.shah@email.com",
                mobile: "+94 77 555 5555",
                birthDate: "1992-12-30",
                nationality: "Sri Lanka",
                country: "Sri Lanka",
                gender: "Male",
                maritalStatus: "Married",
                englishLevel: "Good",
                isProfileVerified: false,
                jobRole: "General Worker",
                avatar: "https://i.pravatar.cc/220?img=3",
                summary: "Machine operator with shift supervision exposure and daily reporting.",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
                suggestedToClientsCount: 2,
                shortlistedByClientsCount: 3,
                documents: [
                    { name: "Diploma.pdf", remarks: "Uploaded", url: DUMMY_PDF },
                    { name: "Experience Letter.pdf", remarks: "Pending", url: DUMMY_PDF },
                    { name: "Passport Copy.pdf", remarks: "Uploaded", url: DUMMY_PDF },
                ],
            },
            {
                id: "c9",
                referenceNumber: "CAN-51263",
                firstName: "Usman",
                lastName: "Iqbal",
                fullName: "Usman Iqbal",
                email: "usman.iqbal@email.com",
                mobile: "+92 345 999 0000",
                birthDate: "1996-02-18",
                nationality: "Pakistan",
                country: "Pakistan",
                gender: "Male",
                maritalStatus: "Single",
                englishLevel: "Good",
                isProfileVerified: true,
                jobRole: "Carpenter",
                avatar: "https://i.pravatar.cc/220?img=2",
                summary: "Good on-time delivery, documentation, and safety mindset.",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
                suggestedToClientsCount: 2,
                shortlistedByClientsCount: 3,
                documents: [
                    { name: "Training Certificate.pdf", remarks: "Verified", url: DUMMY_PDF },
                    { name: "Experience Letter.pdf", remarks: "2 years", url: DUMMY_PDF },
                    { name: "CNIC Copy.pdf", remarks: "Verified", url: DUMMY_PDF },
                ],
            },
        ],
        []
    );

    const jobRoles = useMemo(() => {
        const set = new Set(candidates.map((c) => c.jobRole).filter(Boolean));
        return ["", ...Array.from(set).sort()];
    }, [candidates]);

    const countries = useMemo(() => {
        const set = new Set(candidates.map((c) => c.country).filter(Boolean));
        return ["", ...Array.from(set).sort()];
    }, [candidates]);

    const filteredCandidates = useMemo(() => {
        const q = query.trim().toLowerCase();

        return candidates.filter((c) => {
            const matchesQuery =
                !q ||
                c.fullName?.toLowerCase().includes(q) ||
                c.referenceNumber?.toLowerCase().includes(q) ||
                c.summary?.toLowerCase().includes(q) ||
                c.jobRole?.toLowerCase().includes(q) ||
                c.country?.toLowerCase().includes(q);

            const matchesRole = !role || c.jobRole === role;
            const matchesCountry = !country || c.country === country;

            return matchesQuery && matchesRole && matchesCountry;
        });
    }, [candidates, query, role, country]);

    const closeCandidate = () => {
        setSelectedCandidate(null);
        setCvLoading(false);
        setCvFailed(false);
        cvLoadedRef.current = false;
        if (cvTimeoutRef.current) clearTimeout(cvTimeoutRef.current);
        cvTimeoutRef.current = null;
    };

    // ESC to close popup
    useEffect(() => {
        if (!selectedCandidate) return;
        const onKey = (e) => e.key === "Escape" && closeCandidate();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selectedCandidate]);

    // PDF loading control
    useEffect(() => {
        if (!selectedCandidate?.cvUrl) return;

        setCvLoading(true);
        setCvFailed(false);
        cvLoadedRef.current = false;

        if (cvTimeoutRef.current) clearTimeout(cvTimeoutRef.current);

        cvTimeoutRef.current = setTimeout(() => {
            if (!cvLoadedRef.current) {
                setCvFailed(true);
                setCvLoading(false);
            }
        }, 8000);

        return () => {
            if (cvTimeoutRef.current) clearTimeout(cvTimeoutRef.current);
        };
    }, [selectedCandidate]);

    const resetFilters = () => {
        setQuery("");
        setRole("");
        setCountry("");
    };

    const inList = (arr, id) => arr.some((x) => x.id === id);

    const addToSuggested = (candidate) => {
        setMySuggested((prev) => (inList(prev, candidate.id) ? prev : [candidate, ...prev]));
        // TODO: useEffect/DB sync (Strapi) later
    };

    const addToShortlisted = (candidate) => {
        setMyShortlisted((prev) => (inList(prev, candidate.id) ? prev : [candidate, ...prev]));
        // TODO: useEffect/DB sync (Strapi) later
    };

    const requestInterview = (candidate) => {
        setMyRequestedInterviews((prev) =>
            inList(prev, candidate.id) ? prev : [candidate, ...prev]
        );
        // TODO: useEffect/DB sync (Strapi) later
    };

    return (
        <>
            <Header />

            {/* Page Title */}
            <div className="mt-10 p-6 font-bold text-3xl sm:text-5xl text-red-700 border-b border-gray-300">
                Search Candidates
            </div>

            <div className="w-full mx-auto p-4 space-y-6 ">
                {/* Filters */}
                <div className="border border-gray-200 rounded-2xl p-4 sm:p-6 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 ">
                        {/* Search */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Search
                            </label>
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search name, reference, role, summary..."
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
                            />
                        </div>

                        {/* Job Role */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Job Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-red-200"
                            >
                                <option value="">All roles</option>
                                {jobRoles
                                    .filter((x) => x !== "")
                                    .map((r) => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* Country */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Country
                            </label>
                            <select
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-red-200"
                            >
                                <option value="">All countries</option>
                                {countries
                                    .filter((x) => x !== "")
                                    .map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="text-sm text-gray-600">
                            Results:{" "}
                            <span className="font-semibold text-gray-900">
                                {filteredCandidates.length}
                            </span>
                        </div>
                        <button
                            onClick={resetFilters}
                            className="w-full sm:w-auto rounded-xl border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                        >
                            Reset Filters
                        </button>
                    </div>

                    {/* Optional: quick counters (your lists) */}
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-700">
                        <span className="rounded-full border bg-white px-3 py-1">
                            My Suggested: <b>{mySuggested.length}</b>
                        </span>
                        <span className="rounded-full border bg-white px-3 py-1">
                            My Shortlisted: <b>{myShortlisted.length}</b>
                        </span>
                        <span className="rounded-full border bg-white px-3 py-1">
                            My Interview Requests: <b>{myRequestedInterviews.length}</b>
                        </span>
                    </div>
                </div>

                {/* Grid: 5 per row on large screens */}
                {filteredCandidates.length === 0 ? (
                    <div className="text-sm text-gray-600 border border-gray-200 rounded-2xl p-6">
                        No candidates found.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {filteredCandidates.map((c) => (
                            <div key={c.id} className="bg-gray-100 rounded-2xl p-3">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={c.avatar}
                                        alt={c.fullName}
                                        className="h-16 w-16 rounded-full object-cover border border-white"
                                    />
                                    <div className="min-w-0">
                                        <div className="font-semibold text-red-600 text-sm truncate">
                                            {c.fullName}
                                        </div>
                                        <div className="text-xs text-gray-700 truncate">
                                            {c.country} • {c.jobRole}
                                        </div>
                                        <div className="text-[11px] text-gray-500 truncate">
                                            {c.referenceNumber}
                                        </div>
                                    </div>
                                </div>

                                {/* ✅ requested: show likes info */}
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <LikeChip
                                        icon="👍"
                                        label="Suggested to clients:"
                                        value={c.suggestedToClientsCount ?? 0}
                                    />
                                    <LikeChip
                                        icon="⭐"
                                        label="Shortlisted by clients:"
                                        value={c.shortlistedByClientsCount ?? 0}
                                    />
                                </div>

                                <p className="text-xs text-gray-700 mt-2 line-clamp-2">
                                    {c.summary}
                                </p>

                                <button
                                    onClick={() => setSelectedCandidate(c)}
                                    className="mt-3 w-full text-white hover:text-gray-800 rounded-lg bg-red-600 border border-red-600 px-3 py-2 text-sm hover:bg-gray-50"
                                >
                                    View Profile
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Candidate Popup */}
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
                                <div className="text-lg sm:text-xl font-bold truncate">
                                    Candidate CV / Profile
                                </div>
                                <div className="text-sm text-gray-600 truncate">
                                    {selectedCandidate.fullName} • {selectedCandidate.referenceNumber}
                                </div>
                            </div>

                            <button
                                onClick={closeCandidate}
                                className="shrink-0 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>

                        {/* ✅ requested: buttons like previous pages */}
                        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:justify-end">
                            <button
                                onClick={() => addToSuggested(selectedCandidate)}
                                disabled={inList(mySuggested, selectedCandidate.id)}
                                className="w-full sm:w-auto rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {inList(mySuggested, selectedCandidate.id)
                                    ? "Added to Suggested"
                                    : "Add to Suggested List"}
                            </button>

                            <button
                                onClick={() => addToShortlisted(selectedCandidate)}
                                disabled={inList(myShortlisted, selectedCandidate.id)}
                                className="w-full sm:w-auto rounded-lg bg-gray-900 text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {inList(myShortlisted, selectedCandidate.id)
                                    ? "Added to Shortlisted"
                                    : "Add to Shortlisted"}
                            </button>

                            <button
                                onClick={() => requestInterview(selectedCandidate)}
                                disabled={inList(myRequestedInterviews, selectedCandidate.id)}
                                className="w-full sm:w-auto rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {inList(myRequestedInterviews, selectedCandidate.id)
                                    ? "Interview Requested"
                                    : "Request Interview"}
                            </button>
                        </div>

                        {/* Candidate header */}
                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex items-center gap-4">
                                <img
                                    src={selectedCandidate.avatar}
                                    alt={selectedCandidate.fullName}
                                    className="h-28 w-28 rounded-full object-cover"
                                />
                                <div>
                                    <div className="text-xl text-red-600 font-bold">
                                        {selectedCandidate.fullName}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {selectedCandidate.jobRole} • {selectedCandidate.country}
                                    </div>

                                    {/* show likes info in popup too */}
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <LikeChip
                                            icon="👍"
                                            label="Suggested to clients:"
                                            value={selectedCandidate.suggestedToClientsCount ?? 0}
                                        />
                                        <LikeChip
                                            icon="⭐"
                                            label="Shortlisted by clients:"
                                            value={selectedCandidate.shortlistedByClientsCount ?? 0}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="sm:ml-auto">
                                <VerifiedBadge ok={!!selectedCandidate.isProfileVerified} />
                            </div>
                        </div>

                        {/* Compressed info */}
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
                                    ["Gender", selectedCandidate.gender],
                                    ["Marital Status", selectedCandidate.maritalStatus],
                                    ["English Level", selectedCandidate.englishLevel],
                                ].map(([k, v]) => (
                                    <div className="text-xs" key={k}>
                                        <div className="text-gray-500">{k}</div>
                                        <div className="font-semibold text-gray-800">{v || "—"}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Passport + documents */}
                        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div className="rounded-xl border border-gray-200 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm font-semibold text-gray-800">Passport</div>
                                    <a
                                        href={selectedCandidate.passportUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm rounded-lg bg-gray-900 text-white px-3 py-2 hover:opacity-90"
                                    >
                                        Download
                                    </a>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-200 p-3">
                                <div className="text-sm font-semibold text-gray-800">
                                    Documents ({selectedCandidate.documents?.length || 0})
                                </div>

                                <div className="mt-3 space-y-2">
                                    {(selectedCandidate.documents || []).map((d, idx) => (
                                        <div
                                            key={idx}
                                            className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex flex-col sm:flex-row sm:items-center gap-2"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-gray-800 truncate">
                                                    {d.name}
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    Remarks:{" "}
                                                    <span className="font-medium">{d.remarks || "—"}</span>
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
                                </div>
                            </div>
                        </div>

                        {/* CV Viewer */}
                        <div className="mt-4">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-semibold text-gray-800">
                                    CV Preview (PDF)
                                </div>
                                <a
                                    href={selectedCandidate.cvUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-blue-600 hover:underline"
                                >
                                    Open / Download
                                </a>
                            </div>

                            <div className="mt-2 rounded-xl border border-gray-200 overflow-hidden relative">
                                {cvLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white">
                                        <div className="h-12 w-12 rounded-full border-4 border-red-600 border-t-transparent animate-spin" />
                                    </div>
                                )}

                                {cvFailed ? (
                                    <div className="p-4 sm:p-6">
                                        <div className="text-red-700 font-semibold">
                                            CV preview failed to load
                                        </div>
                                        <p className="text-sm text-gray-600 mt-2">
                                            Use the button below to open in a new tab.
                                        </p>
                                        <div className="mt-3">
                                            <a
                                                href={selectedCandidate.cvUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex rounded-lg bg-red-700 text-white px-4 py-2 text-sm hover:opacity-90"
                                            >
                                                Open CV in New Tab
                                            </a>
                                        </div>
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
                            </div>

                            <p className="mt-2 text-xs text-gray-500">
                                Tip: If preview doesn’t load, click{" "}
                                <span className="font-medium">Open / Download</span>.
                            </p>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={closeCandidate}
                                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}