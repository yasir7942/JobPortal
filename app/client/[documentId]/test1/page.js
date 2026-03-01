"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
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

function RemoveIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4">
            <path
                fill="currentColor"
                d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z"
            />
        </svg>
    );
}

export default function JobDetailPage() {
    const { id } = useParams();
    const [selectedCandidate, setSelectedCandidate] = useState(null);

    // PDF load control
    const cvTimeoutRef = useRef(null);
    const cvLoadedRef = useRef(false);

    const [cvLoading, setCvLoading] = useState(false);
    const [cvFailed, setCvFailed] = useState(false);

    // section refs (scroll)
    const suggestedRef = useRef(null);
    const shortlistedRef = useRef(null);
    const requestedRef = useRef(null);
    const hiredRef = useRef(null);

    const job = useMemo(
        () => ({
            id,
            title: "CNC Machine Operator",
            type: "Full-time",
            location: "Dubai, UAE",
            salary: "AED 2,500–3,200",
            experience: "2+ years",
            description:
                "Operate CNC machines, read drawings, measure parts, maintain quality standards, and follow safety procedures. Handle routine maintenance, tooling changes, and production reporting.",
            requirements: [
                "CNC experience",
                "Drawing reading",
                "Measuring tools",
                "Safety mindset",
            ],
        }),
        [id]
    );

    const seedCandidates = useMemo(
        () => [
            {
                id: "c1",
                referenceNumber: "CAN-51255",
                firstName: "Ahmed",
                lastName: "Khan",
                fullName: "Ahmed Khan",
                mobile: "+92 300 1234567",
                birthDate: "1996-04-10",
                nationality: "Pakistan",
                gender: "Male",
                isProfileVerified: true,
                country: "Pakistan",
                avatar: "https://i.pravatar.cc/220?img=12",
                summary: "CNC operator with 4 years experience in milling and lathe setups.",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
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
                mobile: "+971 50 555 1111",
                birthDate: "1994-08-22",
                nationality: "UAE",
                gender: "Male",
                isProfileVerified: false,
                country: "UAE",
                avatar: "https://i.pravatar.cc/220?img=11",
                summary: "Hands-on machine operator, quality control, tooling changeovers.",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
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
                mobile: "+92 333 8881122",
                birthDate: "1997-01-15",
                nationality: "Pakistan",
                gender: "Male",
                isProfileVerified: true,
                country: "Pakistan",
                avatar: "https://i.pravatar.cc/220?img=9",
                summary: "CNC + fabrication background. Can read drawings and meet tight tolerances.",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
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
                mobile: "+91 98765 12345",
                birthDate: "1993-11-05",
                nationality: "India",
                gender: "Male",
                isProfileVerified: false,
                country: "India",
                avatar: "https://i.pravatar.cc/220?img=8",
                summary: "Production line CNC operator, preventive maintenance & reporting.",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
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
                mobile: "+880 17 0000 1111",
                birthDate: "1998-03-19",
                nationality: "Bangladesh",
                gender: "Male",
                isProfileVerified: true,
                country: "Bangladesh",
                avatar: "https://i.pravatar.cc/220?img=7",
                summary: "CNC lathe operator with inspection tools experience (micrometer, caliper).",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
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
                mobile: "+977 98 111 2222",
                birthDate: "1995-06-02",
                nationality: "Nepal",
                gender: "Male",
                isProfileVerified: false,
                country: "Nepal",
                avatar: "https://i.pravatar.cc/220?img=5",
                summary: "CNC operator, strong quality checks and safety compliance.",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
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
                mobile: "+92 301 777 1010",
                birthDate: "1999-09-12",
                nationality: "Pakistan",
                gender: "Male",
                isProfileVerified: true,
                country: "Pakistan",
                avatar: "https://i.pravatar.cc/220?img=4",
                summary: "CNC setup assistant → operator. Tooling and measurement knowledge.",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
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
                mobile: "+94 77 555 5555",
                birthDate: "1992-12-30",
                nationality: "Sri Lanka",
                gender: "Male",
                isProfileVerified: false,
                country: "Sri Lanka",
                avatar: "https://i.pravatar.cc/220?img=3",
                summary: "Machine operator with shift supervision exposure and reporting.",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
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
                mobile: "+92 345 999 0000",
                birthDate: "1996-02-18",
                nationality: "Pakistan",
                gender: "Male",
                isProfileVerified: true,
                country: "Pakistan",
                avatar: "https://i.pravatar.cc/220?img=2",
                summary: "CNC operator, good on-time delivery and documentation.",
                cvUrl: DUMMY_PDF,
                passportUrl: DUMMY_PDF,
                documents: [
                    { name: "Training Certificate.pdf", remarks: "Verified", url: DUMMY_PDF },
                    { name: "Experience Letter.pdf", remarks: "2 years", url: DUMMY_PDF },
                    { name: "CNIC Copy.pdf", remarks: "Verified", url: DUMMY_PDF },
                ],
            },
        ],
        []
    );

    // lists
    const [suggestedCandidates, setSuggestedCandidates] = useState(() => seedCandidates);
    const [shortlistedCandidates, setShortlistedCandidates] = useState(() => []);
    const [requestedInterviewCandidates, setRequestedInterviewCandidates] = useState(() => []);
    const [hiredCandidates, setHiredCandidates] = useState(() => []);

    // avoid syncing on first render
    const didMountRef = useRef(false);

    // ✅ useEffect placeholders for Strapi sync
    useEffect(() => {
        if (!didMountRef.current) return;
        // TODO (Strapi): Update Suggested candidates list for this job in Strapi
        // Example:
        // await fetch(`/api/jobs/${job.id}/suggested`, { method:"PUT", body: JSON.stringify({ ids: suggestedCandidates.map(c=>c.id) }) })
    }, [suggestedCandidates, job.id]);

    useEffect(() => {
        if (!didMountRef.current) return;
        // TODO (Strapi): Update Shortlisted candidates list for this job in Strapi
    }, [shortlistedCandidates, job.id]);

    useEffect(() => {
        if (!didMountRef.current) return;
        // TODO (Strapi): Update Requested Interviews candidates list for this job in Strapi
    }, [requestedInterviewCandidates, job.id]);

    useEffect(() => {
        if (!didMountRef.current) return;
        // TODO (Strapi): Update Hired candidates list for this job in Strapi
    }, [hiredCandidates, job.id]);

    useEffect(() => {
        // mark mounted after initial paint
        didMountRef.current = true;
    }, []);

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

    // Start loading + ONLY fail if never loaded within time
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

    const scrollToRef = (ref) => {
        ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const removeFromList = (listName, candidateId) => {
        const removeById = (arr) => arr.filter((x) => x.id !== candidateId);

        if (listName === "suggested") setSuggestedCandidates((p) => removeById(p));
        if (listName === "shortlisted") setShortlistedCandidates((p) => removeById(p));
        if (listName === "requested") setRequestedInterviewCandidates((p) => removeById(p));
        if (listName === "hired") setHiredCandidates((p) => removeById(p));

        // if popup open for removed candidate
        if (selectedCandidate?.id === candidateId) closeCandidate();
    };

    const clearSuggested = () => {
        setSuggestedCandidates([]);
        // ✅ useEffect above will run and you can update Strapi there
    };

    const existsIn = (arr, id) => arr.some((x) => x.id === id);

    const removeCandidateFromAllLists = (candidateId) => {
        setSuggestedCandidates((p) => p.filter((x) => x.id !== candidateId));
        setShortlistedCandidates((p) => p.filter((x) => x.id !== candidateId));
        setRequestedInterviewCandidates((p) => p.filter((x) => x.id !== candidateId));
        setHiredCandidates((p) => p.filter((x) => x.id !== candidateId));
    };

    const moveCandidateTo = (candidate, target) => {
        if (!candidate) return;

        // remove from all
        removeCandidateFromAllLists(candidate.id);

        // add to target (dedupe)
        if (target === "shortlisted") {
            setShortlistedCandidates((p) => (existsIn(p, candidate.id) ? p : [candidate, ...p]));
        } else if (target === "requested") {
            setRequestedInterviewCandidates((p) =>
                existsIn(p, candidate.id) ? p : [candidate, ...p]
            );
        } else if (target === "hired") {
            setHiredCandidates((p) => (existsIn(p, candidate.id) ? p : [candidate, ...p]));
        } else {
            setSuggestedCandidates((p) => (existsIn(p, candidate.id) ? p : [candidate, ...p]));
        }
    };

    return (
        <>
            <Header />

            {/* Top Title + Right Menu */}
            <div className="mt-10 px-6 py-5 border-b border-gray-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="font-bold text-3xl sm:text-5xl  text-red-700">Job Details</div>

                <div className="flex flex-wrap items-center gap-2">
                    {[
                        { label: "Suggested Candidates", onClick: () => scrollToRef(suggestedRef) },
                        { label: "Shortlisted Candidates", onClick: () => scrollToRef(shortlistedRef) },
                        { label: "Requested Interviews", onClick: () => scrollToRef(requestedRef) },
                        { label: "Hired Candidates", onClick: () => scrollToRef(hiredRef) },
                    ].map((x) => (
                        <button
                            key={x.label}
                            onClick={x.onClick}
                            className="text-xs sm:text-sm rounded-full border  border-red-600 text-gray-700 px-6 py-2 hover:bg-red-600 hover:text-white transition"
                        >
                            {x.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-full mx-auto p-4 space-y-8">
                {/* Job card */}
                <div className="border border-gray-200 rounded-2xl p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-red-700">{job.title}</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                {job.type} • {job.location}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">Job ID: {job.id}</p>
                        </div>

                        <div className="flex flex-col sm:items-end gap-1">
                            <div className="text-sm">
                                <span className="text-gray-500">Salary:</span>{" "}
                                <span className="font-semibold">{job.salary}</span>
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-500">Experience:</span>{" "}
                                <span className="font-semibold">{job.experience}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="text-sm font-semibold text-gray-800">Description</div>
                        <p className="text-sm text-gray-700 mt-1">{job.description}</p>
                    </div>

                    <div className="mt-4">
                        <div className="text-sm font-semibold text-gray-800">Requirements</div>
                        <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
                            {job.requirements.map((r, idx) => (
                                <li key={idx}>{r}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* ===================== Suggested Candidates ===================== */}
                <div ref={suggestedRef} className="scroll-mt-24">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <h2 className="text-2xl font-bold text-red-600">
                            Suggested Candidates{" "}
                            <span className="text-gray-500 font-medium">({suggestedCandidates.length})</span>
                        </h2>

                        <button
                            onClick={clearSuggested}
                            className="text-sm text-red-700 hover:underline disabled:text-gray-400 disabled:no-underline"
                            disabled={suggestedCandidates.length === 0}
                        >
                            Clear all Suggested Candidates
                        </button>
                    </div>

                    {suggestedCandidates.length === 0 ? (
                        <div className="mt-3 text-sm text-gray-600">No suggested candidates.</div>
                    ) : (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {suggestedCandidates.map((c) => (
                                <div key={c.id} className="relative bg-gray-100 rounded-2xl p-3">
                                    {/* ✅ small round remove button */}
                                    <button
                                        onClick={() => removeFromList("suggested", c.id)}
                                        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                                        aria-label="Remove candidate"
                                        title="Remove"
                                    >
                                        <span className="text-gray-700">
                                            <RemoveIcon />
                                        </span>
                                    </button>

                                    <div className="flex items-center gap-3 pr-9">
                                        <img
                                            src={c.avatar}
                                            alt={c.fullName}
                                            className="h-16 w-16 rounded-full object-cover border border-white"
                                        />
                                        <div className="min-w-0">
                                            <div className="font-semibold text-red-600 text-sm truncate">{c.fullName}</div>
                                            <div className="text-xs text-gray-700">{c.country}</div>
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-700 mt-2 line-clamp-2">{c.summary}</p>

                                    <button
                                        onClick={() => setSelectedCandidate(c)}
                                        className="mt-3 w-full text-white hover:text-gray-800 rounded-lg bg-red-600 border border-red-600 px-3 py-2 text-sm hover:bg-gray-50"
                                    >
                                        Click To View CV
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ===================== ShortListed Candidates ===================== */}
                <div ref={shortlistedRef} className="scroll-mt-24">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-2xl font-bold text-red-600">
                            Shortlisted Candidates{" "}
                            <span className="text-gray-500 font-medium">({shortlistedCandidates.length})</span>
                        </h2>
                    </div>

                    {shortlistedCandidates.length === 0 ? (
                        <div className="mt-3 text-sm text-gray-600">No shortlisted candidates.</div>
                    ) : (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {shortlistedCandidates.map((c) => (
                                <div key={c.id} className="relative bg-gray-100 rounded-2xl p-3">
                                    <button
                                        onClick={() => removeFromList("shortlisted", c.id)}
                                        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                                        aria-label="Remove candidate"
                                        title="Remove"
                                    >
                                        <span className="text-gray-700">
                                            <RemoveIcon />
                                        </span>
                                    </button>

                                    <div className="flex items-center gap-3 pr-9">
                                        <img
                                            src={c.avatar}
                                            alt={c.fullName}
                                            className="h-16 w-16 rounded-full object-cover border border-white"
                                        />
                                        <div className="min-w-0">
                                            <div className="font-semibold text-red-600 text-sm truncate">{c.fullName}</div>
                                            <div className="text-xs text-gray-700">{c.country}</div>
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-700 mt-2 line-clamp-2">{c.summary}</p>

                                    <button
                                        onClick={() => setSelectedCandidate(c)}
                                        className="mt-3 w-full text-white hover:text-gray-800 rounded-lg bg-red-600 border border-red-600 px-3 py-2 text-sm hover:bg-gray-50"
                                    >
                                        Click To View CV
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ===================== Requested Interviews (List View) ===================== */}
                <div ref={requestedRef} className="scroll-mt-24">
                    <h2 className="text-2xl font-bold text-red-600">
                        Requested Interviews{" "}
                        <span className="text-gray-500 font-medium">({requestedInterviewCandidates.length})</span>
                    </h2>

                    {requestedInterviewCandidates.length === 0 ? (
                        <div className="mt-3 text-sm text-gray-600">No interview requests yet.</div>
                    ) : (
                        <div className="mt-3 space-y-2">
                            {requestedInterviewCandidates.map((c) => (
                                <div
                                    key={c.id}
                                    className="rounded-2xl border border-gray-200 bg-white p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <img
                                            src={c.avatar}
                                            alt={c.fullName}
                                            className="h-12 w-12 rounded-full object-cover border"
                                        />
                                        <div className="min-w-0">
                                            <div className="font-semibold text-gray-900 truncate">{c.fullName}</div>
                                            <div className="text-xs text-gray-600 truncate">
                                                {c.referenceNumber} • {c.country}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSelectedCandidate(c)}
                                            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                                        >
                                            View CV
                                        </button>
                                        <button
                                            onClick={() => removeFromList("requested", c.id)}
                                            className="rounded-lg bg-gray-900 text-white px-3 py-2 text-sm hover:opacity-90"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ===================== Hired Candidates (List View) ===================== */}
                <div ref={hiredRef} className="scroll-mt-24">
                    <h2 className="text-2xl font-bold text-red-600">
                        Hired Candidates{" "}
                        <span className="text-gray-500 font-medium">({hiredCandidates.length})</span>
                    </h2>

                    {hiredCandidates.length === 0 ? (
                        <div className="mt-3 text-sm text-gray-600">No hired candidates yet.</div>
                    ) : (
                        <div className="mt-3 space-y-2">
                            {hiredCandidates.map((c) => (
                                <div
                                    key={c.id}
                                    className="rounded-2xl border border-gray-200 bg-white p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <img
                                            src={c.avatar}
                                            alt={c.fullName}
                                            className="h-12 w-12 rounded-full object-cover border"
                                        />
                                        <div className="min-w-0">
                                            <div className="font-semibold text-gray-900 truncate">{c.fullName}</div>
                                            <div className="text-xs text-gray-600 truncate">
                                                {c.referenceNumber} • {c.country}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSelectedCandidate(c)}
                                            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                                        >
                                            View CV
                                        </button>
                                        <button
                                            onClick={() => removeFromList("hired", c.id)}
                                            className="rounded-lg bg-gray-900 text-white px-3 py-2 text-sm hover:opacity-90"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Candidate Dialog */}
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
                                <div className="text-lg sm:text-xl font-bold truncate">Candidate CV / Profile</div>
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

                        {/* Actions (moves between sections) */}
                        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:justify-end">
                            <button
                                onClick={() => moveCandidateTo(selectedCandidate, "shortlisted")}
                                className="w-full sm:w-auto rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                            >
                                Shortlist Candidate
                            </button>
                            <button
                                onClick={() => moveCandidateTo(selectedCandidate, "requested")}
                                className="w-full sm:w-auto rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:opacity-90"
                            >
                                Request Interview
                            </button>
                            <button
                                onClick={() => moveCandidateTo(selectedCandidate, "hired")}
                                className="w-full sm:w-auto rounded-lg bg-red-700 text-white px-4 py-2 text-sm hover:opacity-90"
                            >
                                Hire This Candidate
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
                                    <div className="text-xl text-red-600 font-bold">{selectedCandidate.fullName}</div>
                                    <div className="text-sm text-gray-600">{selectedCandidate.nationality}</div>
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
                                    ["Mobile", selectedCandidate.mobile],
                                    ["Birth Date", selectedCandidate.birthDate],
                                    ["Nationality", selectedCandidate.nationality],
                                    ["Gender", selectedCandidate.gender],
                                    ["Full Name", selectedCandidate.fullName],
                                ].map(([k, v]) => (
                                    <div className="text-xs" key={k}>
                                        <div className="text-gray-500">{k}</div>
                                        <div className="font-semibold text-gray-800">{v}</div>
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
                                                <div className="text-sm font-semibold text-gray-800 truncate">{d.name}</div>
                                                <div className="text-xs text-gray-600">
                                                    Remarks: <span className="font-medium">{d.remarks || "—"}</span>
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
                                <div className="text-sm font-semibold text-gray-800">CV Preview (PDF)</div>
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
                                        <div className="text-red-700 font-semibold">CV preview failed to load</div>
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
                                Tip: If preview doesn’t load, click <span className="font-medium">Open / Download</span>.
                            </p>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button onClick={closeCandidate} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}