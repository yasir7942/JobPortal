"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import Header from "@/app/components/layouts/client/Header";
import ENUMS from "@/config/enums.json";

const DUMMY_PDF = "";

const LOADING_IMAGE =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
      <rect width="220" height="220" rx="20" fill="#f3f4f6"/>
      <circle cx="110" cy="90" r="26" fill="none" stroke="#dc2626" stroke-width="10" stroke-linecap="round" stroke-dasharray="90 50">
        <animateTransform attributeName="transform" type="rotate" from="0 110 90" to="360 110 90" dur="1s" repeatCount="indefinite"/>
      </circle>
      <text x="110" y="155" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#374151">Loading...</text>
    </svg>
  `);

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

async function fetchJsonSafe(url, opts) {
    const res = await fetch(url, { cache: "no-store", ...(opts || {}) });
    const text = await res.text();

    let json;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        throw new Error(`API returned non-JSON (status ${res.status}). First bytes: ${text.slice(0, 80)}`);
    }

    if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || "Request failed");
    }

    return json;
}

function blocksToPlainText(blocks) {
    if (!Array.isArray(blocks)) return "";
    return blocks
        .map((b) => {
            const children = Array.isArray(b?.children) ? b.children : [];
            return children.map((c) => c?.text || "").join("").trim();
        })
        .filter(Boolean)
        .join("\n\n");
}

function normalizeProcessLabel(to) {
    const labels = (ENUMS?.candidateProcess || []).map(String);

    const map = {
        suggested: labels[0] || "Suggested Candidate",
        shortlisted: labels[1] || "Shortlisted Candidate",
        interview: labels[2] || "Requested Interview",
        hired: labels[3] || "Hired Candidate",
    };

    if (!to) return map.suggested;
    if (labels.includes(String(to))) return String(to);
    if (map[String(to)]) return map[String(to)];
    return String(to);
}

function processKeyFromLabel(v) {
    const x = String(v || "").trim().toLowerCase();
    if (x === "shortlisted candidate") return "shortlisted";
    if (x === "requested interview") return "interview";
    if (x === "hired candidate") return "hired";
    return "suggested";
}

function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function hasIframeHtml(value) {
    const raw = String(value || "").trim().toLowerCase();
    return raw.includes("<iframe");
}

function extractIframeData(value) {
    const raw = String(value || "").trim();
    if (!raw) return { src: "", title: "Video Player" };

    const srcMatch =
        raw.match(/src\s*=\s*"([^"]+)"/i) ||
        raw.match(/src\s*=\s*'([^']+)'/i);

    const titleMatch =
        raw.match(/title\s*=\s*"([^"]+)"/i) ||
        raw.match(/title\s*=\s*'([^']+)'/i);

    return {
        src: srcMatch?.[1] || "",
        title: titleMatch?.[1] || "Video Player",
    };
}

function withProcess(items, processKey) {
    return (Array.isArray(items) ? items : []).map((x) => ({
        ...x,
        currentProcess: processKey,
    }));
}

function ensureOfferLetterShape(value) {
    if (!value || typeof value !== "object") return null;
    if (!value.url && !value.name && !value.id) return null;
    return {
        id: value.id ?? null,
        name: value.name || "",
        url: value.url || "",
    };
}

function updateCandidateInList(list, candidateDocumentId, patch) {
    return (Array.isArray(list) ? list : []).map((item) =>
        String(item?.documentId) === String(candidateDocumentId)
            ? { ...item, ...patch }
            : item
    );
}

function removeCandidateFromList(list, candidateDocumentId) {
    return (Array.isArray(list) ? list : []).filter(
        (item) => String(item?.documentId) !== String(candidateDocumentId)
    );
}

function upsertCandidateAtTop(list, candidate) {
    const next = removeCandidateFromList(list, candidate?.documentId);
    return [candidate, ...next];
}

function VideoViewerModal({ open, title, iframeHtmlFromDb, onClose }) {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);

    const iframeData = useMemo(() => extractIframeData(iframeHtmlFromDb), [iframeHtmlFromDb]);
    const timeoutRef = useRef(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!open) return;

        setLoading(true);
        setLoadFailed(false);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setLoading(false);
            setLoadFailed(true);
        }, 8000);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        };
    }, [open, iframeData.src]);

    useEffect(() => {
        if (!open) return;

        const onKey = (e) => {
            if (e.key === "Escape") onClose();
        };

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    if (!open || !mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[300] bg-black/85 p-1 sm:p-3"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="mx-auto grid h-[80vh] w-[95vw] lg:w-[75vw] max-w-[1100px] grid-rows-[auto_1fr] overflow-hidden rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
                    <div className="min-w-0">
                        <div className="truncate text-base font-bold text-gray-900 sm:text-lg">
                            {title}
                        </div>
                        <div className="truncate text-xs text-gray-500 sm:text-sm">
                            Video Preview
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="shrink-0 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                    >
                        Close
                    </button>
                </div>

                <div className="min-h-0 p-2 sm:p-4">
                    {!iframeData.src ? (
                        <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 text-center text-sm text-gray-500">
                            No video iframe available
                        </div>
                    ) : loadFailed ? (
                        <div className="flex h-full flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-6 text-center">
                            <div className="text-lg font-bold text-red-700">Video preview failed to load</div>
                            <div className="mt-2 break-all text-sm text-gray-600">{iframeData.src}</div>
                            <a
                                href={iframeData.src}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:opacity-90"
                            >
                                Open Video in New Tab
                            </a>
                        </div>
                    ) : (
                        <div className="relative h-full w-full overflow-hidden rounded-xl border border-gray-200 bg-black">
                            {loading && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white">
                                    <img
                                        src={LOADING_IMAGE}
                                        alt="Loading"
                                        className="h-24 w-24 object-contain sm:h-32 sm:w-32"
                                    />
                                    <div className="mt-3 text-sm text-gray-600">Loading video...</div>
                                </div>
                            )}

                            <div
                                className="absolute inset-0"
                                style={{ position: "relative", paddingTop: "56.25%", height: "100%" }}
                            >
                                <iframe
                                    src={iframeData.src}
                                    allowFullScreen
                                    title={iframeData.title || title || "Video Player"}
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        width: "100%",
                                        height: "100%",
                                        border: "none",
                                    }}
                                    onLoad={() => {
                                        if (timeoutRef.current) clearTimeout(timeoutRef.current);
                                        timeoutRef.current = null;
                                        setLoading(false);
                                        setLoadFailed(false);
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

function OfferLetterModal({
    open,
    candidate,
    onClose,
    onUpload,
    onRemove,
    submitting,
    error,
}) {
    const [mounted, setMounted] = useState(false);
    const [file, setFile] = useState(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (open) setFile(null);
    }, [open, candidate?.documentId]);

    useEffect(() => {
        if (!open) return;

        const onKey = (e) => {
            if (e.key === "Escape") onClose();
        };

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    if (!open || !mounted || !candidate) return null;

    const offer = ensureOfferLetterShape(candidate?.offerLetter);

    return createPortal(
        <div
            className="fixed inset-0 z-[310] flex items-center justify-center bg-black/70 p-3"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
                    <div>
                        <div className="text-lg font-bold text-gray-900">
                            {offer ? "View / Edit Offer Letter" : "Upload Offer Letter"}
                        </div>
                        <div className="text-sm text-gray-500">
                            {candidate?.fullName || "Candidate"} • {candidate?.referenceNumber || "—"}
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                    >
                        Close
                    </button>
                </div>

                <div className="space-y-4 p-4 sm:p-6">
                    {offer ? (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="text-sm font-semibold text-gray-800">
                                Current Offer Letter
                            </div>
                            <div className="mt-1 break-all text-sm text-gray-600">
                                {offer?.name || "Offer Letter"}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {offer?.url ? (
                                    <a
                                        href={offer.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:opacity-90"
                                    >
                                        View Offer Letter
                                    </a>
                                ) : null}

                                <button
                                    onClick={() => onRemove(candidate)}
                                    disabled={submitting}
                                    className="rounded-lg border border-red-600 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Remove Offer Letter
                                </button>
                            </div>
                        </div>
                    ) : null}

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-800">
                            {offer ? "Replace Offer Letter" : "Select Offer Letter"}
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="block w-full rounded-lg border border-gray-300 p-3 text-sm"
                        />
                        <div className="mt-2 text-xs text-gray-500">
                            Allowed: PDF, JPG, JPEG, PNG
                        </div>
                    </div>

                    {error ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    ) : null}

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                            onClick={onClose}
                            disabled={submitting}
                            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={() => onUpload(candidate, file)}
                            disabled={submitting || !file}
                            className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting ? "Saving..." : offer ? "Update Offer Letter" : "Upload Offer Letter"}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function JobCandidatesPage() {
    const routeParams = useParams();
    const jobDocumentId = routeParams?.documentId;

    const [job, setJob] = useState(null);
    const [jobErr, setJobErr] = useState("");
    const [jobLoading, setJobLoading] = useState(true);

    const [suggestedCandidates, setSuggestedCandidates] = useState([]);
    const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
    const [requestedInterviewCandidates, setRequestedInterviewCandidates] = useState([]);
    const [hiredCandidates, setHiredCandidates] = useState([]);

    const [selectedCandidate, setSelectedCandidate] = useState(null);

    const [videoModal, setVideoModal] = useState({
        open: false,
        title: "",
        iframeHtmlFromDb: "",
    });

    const [offerModal, setOfferModal] = useState({
        open: false,
        candidate: null,
    });
    const [offerSubmitting, setOfferSubmitting] = useState(false);
    const [offerError, setOfferError] = useState("");

    const cvTimeoutRef = useRef(null);
    const cvLoadedRef = useRef(false);
    const [cvLoading, setCvLoading] = useState(false);
    const [cvFailed, setCvFailed] = useState(false);

    const suggestedRef = useRef(null);
    const shortlistedRef = useRef(null);
    const requestedRef = useRef(null);
    const hiredRef = useRef(null);

    const scrollToRef = (ref) => ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    function openVideoModal(title, iframeHtmlFromDb) {
        setVideoModal({
            open: true,
            title,
            iframeHtmlFromDb: String(iframeHtmlFromDb || ""),
        });
    }

    function closeVideoModal() {
        setVideoModal({
            open: false,
            title: "",
            iframeHtmlFromDb: "",
        });
    }

    function openOfferModal(candidate) {
        setOfferError("");
        setOfferModal({
            open: true,
            candidate,
        });
    }

    function closeOfferModal() {
        setOfferError("");
        setOfferModal({
            open: false,
            candidate: null,
        });
    }

    function closeCandidate() {
        setSelectedCandidate(null);
        setCvLoading(false);
        setCvFailed(false);
        cvLoadedRef.current = false;

        if (cvTimeoutRef.current) clearTimeout(cvTimeoutRef.current);
        cvTimeoutRef.current = null;
    }

    function refreshCandidateAcrossState(candidateDocumentId, patch) {
        setSuggestedCandidates((prev) => updateCandidateInList(prev, candidateDocumentId, patch));
        setShortlistedCandidates((prev) => updateCandidateInList(prev, candidateDocumentId, patch));
        setRequestedInterviewCandidates((prev) => updateCandidateInList(prev, candidateDocumentId, patch));
        setHiredCandidates((prev) => updateCandidateInList(prev, candidateDocumentId, patch));

        setSelectedCandidate((prev) =>
            String(prev?.documentId) === String(candidateDocumentId)
                ? { ...prev, ...patch }
                : prev
        );

        setOfferModal((prev) =>
            String(prev?.candidate?.documentId) === String(candidateDocumentId)
                ? { ...prev, candidate: { ...prev.candidate, ...patch } }
                : prev
        );
    }

    async function hydrateHiredOfferLetters(list) {
        if (!Array.isArray(list) || list.length === 0) return list;

        const results = await Promise.all(
            list.map(async (candidate) => {
                try {
                    const qs = new URLSearchParams({
                        jobDocumentId: String(jobDocumentId || ""),
                        candidateDocumentId: String(candidate?.documentId || ""),
                    });
                    const json = await fetchJsonSafe(`/api/jobs/candidates/move?${qs.toString()}`);
                    return {
                        ...candidate,
                        offerLetter: ensureOfferLetterShape(json?.offerLetter),
                    };
                } catch {
                    return {
                        ...candidate,
                        offerLetter: ensureOfferLetterShape(candidate?.offerLetter),
                    };
                }
            })
        );

        return results;
    }

    useEffect(() => {
        if (!selectedCandidate) return;

        const onKey = (e) => e.key === "Escape" && closeCandidate();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selectedCandidate]);

    useEffect(() => {
        const cvUrl = selectedCandidate?.cvUrl;
        if (!cvUrl) return;

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

    useEffect(() => {
        let ignore = false;

        async function load() {
            if (!jobDocumentId) return;

            setJobLoading(true);
            setJobErr("");

            try {
                const json = await fetchJsonSafe(`/api/jobs/candidates/get/${jobDocumentId}`);
                if (ignore) return;

                const suggested = withProcess(json?.lists?.suggested || [], "suggested");
                const shortlisted = withProcess(json?.lists?.shortlisted || [], "shortlisted");
                const interview = withProcess(json?.lists?.interview || [], "interview");
                const hiredRaw = withProcess(json?.lists?.hired || [], "hired");
                const hired = await hydrateHiredOfferLetters(hiredRaw);

                if (ignore) return;

                setJob(json?.job || null);
                setSuggestedCandidates(suggested);
                setShortlistedCandidates(shortlisted);
                setRequestedInterviewCandidates(interview);
                setHiredCandidates(hired);
            } catch (e) {
                if (!ignore) setJobErr(e?.message || "Failed to load job");
            } finally {
                if (!ignore) setJobLoading(false);
            }
        }

        load();

        return () => {
            ignore = true;
        };
    }, [jobDocumentId]);

    async function moveCandidateTo(candidate, toKeyOrLabel) {
        if (!jobDocumentId || !candidate?.documentId) return;

        const toLabel = normalizeProcessLabel(toKeyOrLabel);
        const toKey = processKeyFromLabel(toLabel);

        if (candidate?.currentProcess === toKey) return;

        const movedCandidate = {
            ...candidate,
            currentProcess: toKey,
        };

        const oldSuggested = suggestedCandidates;
        const oldShortlisted = shortlistedCandidates;
        const oldInterview = requestedInterviewCandidates;
        const oldHired = hiredCandidates;
        const oldSelected = selectedCandidate;

        setSuggestedCandidates((prev) => removeCandidateFromList(prev, candidate.documentId));
        setShortlistedCandidates((prev) => removeCandidateFromList(prev, candidate.documentId));
        setRequestedInterviewCandidates((prev) => removeCandidateFromList(prev, candidate.documentId));
        setHiredCandidates((prev) => removeCandidateFromList(prev, candidate.documentId));

        if (toKey === "suggested") {
            setSuggestedCandidates((prev) => upsertCandidateAtTop(prev, movedCandidate));
        } else if (toKey === "shortlisted") {
            setShortlistedCandidates((prev) => upsertCandidateAtTop(prev, movedCandidate));
        } else if (toKey === "interview") {
            setRequestedInterviewCandidates((prev) => upsertCandidateAtTop(prev, movedCandidate));
        } else if (toKey === "hired") {
            setHiredCandidates((prev) => upsertCandidateAtTop(prev, movedCandidate));
        }

        if (String(selectedCandidate?.documentId) === String(candidate?.documentId)) {
            setSelectedCandidate(movedCandidate);
        }

        try {
            const json = await fetchJsonSafe(`/api/jobs/candidates/move`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobDocumentId,
                    candidateDocumentId: candidate.documentId,
                    action: toLabel,
                }),
            });

            const patch = {
                currentProcess: toKey,
                offerLetter: ensureOfferLetterShape(json?.offerLetter) ?? ensureOfferLetterShape(candidate?.offerLetter),
            };
            refreshCandidateAcrossState(candidate.documentId, patch);
        } catch (e) {
            setSuggestedCandidates(oldSuggested);
            setShortlistedCandidates(oldShortlisted);
            setRequestedInterviewCandidates(oldInterview);
            setHiredCandidates(oldHired);
            setSelectedCandidate(oldSelected);
            alert(e?.message || "Failed to update job in Strapi");
        }
    }

    async function handleUploadOfferLetter(candidate, file) {
        if (!file) return;

        const fd = new FormData();
        fd.append("action", "uploadOfferLetter");
        fd.append("jobDocumentId", jobDocumentId);
        fd.append("candidateDocumentId", candidate.documentId);
        fd.append("file", file);

        const res = await fetch("/api/jobs/candidates/move", {
            method: "POST",
            body: fd,
        });

        const json = await res.json();

        if (!res.ok || json?.ok === false) {
            throw new Error(json?.error || "Upload failed");
        }

        return json;
    }

    async function handleRemoveOfferLetter(candidate) {
        if (!jobDocumentId || !candidate?.documentId) return;

        setOfferSubmitting(true);
        setOfferError("");

        try {
            await fetchJsonSafe(`/api/jobs/candidates/move`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "removeOfferLetter",
                    jobDocumentId,
                    candidateDocumentId: candidate.documentId,
                }),
            });

            refreshCandidateAcrossState(candidate.documentId, { offerLetter: null });
            closeOfferModal();
        } catch (e) {
            setOfferError(e?.message || "Failed to remove offer letter");
        } finally {
            setOfferSubmitting(false);
        }
    }

    const candidateForPopup = useMemo(() => {
        if (!selectedCandidate) return null;

        return {
            ...selectedCandidate,
            cvUrl: selectedCandidate.cvUrl || DUMMY_PDF,
            passportUrl: selectedCandidate.passportUrl || DUMMY_PDF,
            documents: Array.isArray(selectedCandidate.documents) ? selectedCandidate.documents : [],
            workingVideoIframe: selectedCandidate.workingVideoIframe || "",
            miScreeningVideoIframe: selectedCandidate.miScreeningVideoIframe || "",
            offerLetter: ensureOfferLetterShape(selectedCandidate.offerLetter),
        };
    }, [selectedCandidate]);

    const renderCandidateCard = (c, sectionKey) => {
        const offer = ensureOfferLetterShape(c?.offerLetter);

        return (
            <div key={c.documentId || c.id} className="relative rounded-2xl bg-gray-100 p-3">
                <div className="flex items-center gap-3 pr-9">
                    <img
                        src={c.avatar}
                        alt={c.fullName || "Candidate"}
                        className="h-16 w-16 rounded-full border border-white bg-white object-cover"
                    />
                    <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-red-600">{c.fullName || "—"}</div>
                        <div className="truncate text-xs text-gray-700">{c.nationality || "—"}</div>
                        <div className="truncate text-[11px] text-gray-800">{c.referenceNumber || "—"}</div>
                    </div>
                </div>

                {c.shortSummary ? (
                    <p className="mt-2 line-clamp-2 text-xs text-gray-700">{c.shortSummary}</p>
                ) : null}

                <div className="mt-3 space-y-2">
                    <button
                        onClick={() => setSelectedCandidate(c)}
                        className="w-full rounded-lg border border-red-600 bg-red-600 px-3 py-2 text-sm text-white hover:bg-gray-50 hover:text-gray-800"
                    >
                        View Profile
                    </button>

                    {sectionKey === "hired" ? (
                        <button
                            onClick={() => openOfferModal(c)}
                            className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:opacity-90"
                        >
                            {offer ? "View Offer Letter" : "Upload Offer Letter"}
                        </button>
                    ) : null}
                </div>
            </div>
        );
    };

    const isInSuggested = candidateForPopup?.currentProcess === "suggested";
    const isInShortlisted = candidateForPopup?.currentProcess === "shortlisted";
    const isInInterview = candidateForPopup?.currentProcess === "interview";
    const isInHired = candidateForPopup?.currentProcess === "hired";

    return (
        <>
            <Header />

            <div className="mt-10 flex flex-col gap-3 border-b border-gray-300 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-3xl font-bold text-red-700 sm:text-5xl">Job Details</div>

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
                            className="rounded-full border border-red-600 px-6 py-2 text-xs text-gray-700 transition hover:bg-red-600 hover:text-white sm:text-sm"
                        >
                            {x.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mx-auto w-full space-y-8 p-4">
                <div className="rounded-2xl border border-gray-200 p-4 sm:p-6">
                    {jobLoading ? (
                        <div className="text-sm text-gray-600">Loading job...</div>
                    ) : jobErr ? (
                        <div className="text-sm text-red-700">{jobErr}</div>
                    ) : (
                        <>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <h1 className="truncate text-2xl font-bold text-red-700 sm:text-3xl">
                                        {job?.title || "—"}{" "}
                                        <span className="ml-2 pr-5 text-base text-gray-800">{job?.referenceNo || "—"}</span>
                                    </h1>

                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="rounded-md bg-gray-100 px-2 py-1 text-sm text-blue-500">
                                            🌍 {job?.jobTypeList || "—"} • {job?.location || "—"}
                                        </span>

                                        <span className="rounded-md bg-gray-100 px-2 py-1 text-sm text-blue-500">
                                            📝 {job?.jobTypeList || "—"}
                                        </span>

                                        <span className="rounded-md bg-gray-100 px-2 py-1 text-sm text-blue-500">
                                            👥 vacancies: {job?.vacanciesNo ?? "—"}
                                        </span>

                                        <span className="rounded-md bg-gray-100 px-2 py-1 text-sm text-blue-500">
                                            👷‍♂️ Experience: {job?.experience ?? "—"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1 sm:items-end">
                                    <div className="text-sm">
                                        <span className="text-gray-500">Status:</span>{" "}
                                        <span className="font-semibold">{job?.statusList || "—"}</span>
                                    </div>

                                    <div className="text-sm">
                                        <span className="text-gray-500">Created:</span>{" "}
                                        <span className="font-semibold">{formatDate(job?.createdAt)}</span>
                                    </div>

                                    <div className="text-sm">
                                        <span className="text-gray-500">Closing:</span>{" "}
                                        <span className="font-semibold">{job?.closingDate || "—"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <div className="text-sm font-semibold text-gray-800">Summary</div>
                                <p className="mt-1 text-sm text-gray-700">{job?.shortDescription || "—"}</p>
                            </div>

                            <div className="mt-4">
                                <div className="text-sm font-semibold text-gray-800">Details</div>
                                <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
                                    {blocksToPlainText(job?.details) || "—"}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                <div ref={suggestedRef} className="mt-10 scroll-mt-24">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-2xl font-bold text-red-600">
                            Suggested Candidates <span className="font-medium text-gray-500">({suggestedCandidates.length})</span>
                        </h2>
                    </div>

                    {suggestedCandidates.length === 0 ? (
                        <div className="mt-3 text-sm text-gray-600">No suggested candidates.</div>
                    ) : (
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                            {suggestedCandidates.map((c) => renderCandidateCard(c, "suggested"))}
                        </div>
                    )}
                </div>

                <div ref={shortlistedRef} className="scroll-mt-24">
                    <h2 className="text-2xl font-bold text-red-600">
                        Shortlisted Candidates <span className="font-medium text-gray-500">({shortlistedCandidates.length})</span>
                    </h2>

                    {shortlistedCandidates.length === 0 ? (
                        <div className="mt-3 text-sm text-gray-600">No shortlisted candidates.</div>
                    ) : (
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                            {shortlistedCandidates.map((c) => renderCandidateCard(c, "shortlisted"))}
                        </div>
                    )}
                </div>

                <div ref={requestedRef} className="scroll-mt-24">
                    <h2 className="text-2xl font-bold text-red-600">
                        Requested Interviews{" "}
                        <span className="font-medium text-gray-500">({requestedInterviewCandidates.length})</span>
                    </h2>

                    {requestedInterviewCandidates.length === 0 ? (
                        <div className="mt-3 text-sm text-gray-600">No interview requests yet.</div>
                    ) : (
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                            {requestedInterviewCandidates.map((c) => renderCandidateCard(c, "interview"))}
                        </div>
                    )}
                </div>

                <div ref={hiredRef} className="scroll-mt-24">
                    <h2 className="text-2xl font-bold text-red-600">
                        Hired Candidates <span className="font-medium text-gray-500">({hiredCandidates.length})</span>
                    </h2>

                    {hiredCandidates.length === 0 ? (
                        <div className="mt-3 text-sm text-gray-600">No hired candidates yet.</div>
                    ) : (
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                            {hiredCandidates.map((c) => renderCandidateCard(c, "hired"))}
                        </div>
                    )}
                </div>
            </div>

            {candidateForPopup && (
                <div
                    className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeCandidate();
                    }}
                >
                    <div className="absolute inset-0 bg-black/50" />

                    <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:max-w-6xl sm:rounded-2xl sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="truncate text-lg font-bold sm:text-xl">Candidate CV / Profile</div>
                                <div className="truncate text-sm text-gray-600">
                                    {candidateForPopup.fullName} • {candidateForPopup.referenceNumber}
                                </div>
                            </div>

                            <button
                                onClick={closeCandidate}
                                className="shrink-0 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                            <button
                                onClick={() => moveCandidateTo(candidateForPopup, "shortlisted")}
                                disabled={isInShortlisted}
                                className="w-full rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 sm:w-auto"
                            >
                                Shortlist Candidate
                            </button>

                            <button
                                onClick={() => moveCandidateTo(candidateForPopup, "interview")}
                                disabled={isInInterview}
                                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto"
                            >
                                Request Interview
                            </button>

                            <button
                                onClick={() => moveCandidateTo(candidateForPopup, "hired")}
                                disabled={isInHired}
                                className="w-full rounded-lg bg-red-700 px-4 py-2 text-sm text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-red-300 sm:w-auto"
                            >
                                Hire This Candidate
                            </button>

                            {isInHired ? (
                                <button
                                    onClick={() => openOfferModal(candidateForPopup)}
                                    className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:opacity-90 sm:w-auto"
                                >
                                    {candidateForPopup?.offerLetter ? "View Offer Letter" : "Upload Offer Letter"}
                                </button>
                            ) : null}
                        </div>

                        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-4">
                                <img
                                    src={candidateForPopup.avatar}
                                    alt={candidateForPopup.fullName || "Candidate"}
                                    className="h-28 w-28 rounded-full bg-gray-100 object-cover"
                                />
                                <div>
                                    <div className="text-xl font-bold text-red-600">{candidateForPopup.fullName || "—"}</div>
                                    <div className="text-sm text-gray-600">{candidateForPopup.nationality || "—"}</div>
                                    <div className="mt-1 text-xs font-semibold text-gray-500">
                                        Current Stage: {normalizeProcessLabel(candidateForPopup?.currentProcess)}
                                    </div>
                                </div>
                            </div>

                            <div className="sm:ml-auto">
                                <VerifiedBadge ok={!!candidateForPopup.isProfileVerified} />
                            </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-gray-200 p-3">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                {[
                                    ["Reference", candidateForPopup.referenceNumber],
                                    ["Full Name", candidateForPopup.fullName],
                                    ["First Name", candidateForPopup.firstName],
                                    ["Last Name", candidateForPopup.lastName],
                                    ["Username", candidateForPopup.username],
                                    ["Email", candidateForPopup.email],
                                    ["Mobile", candidateForPopup.mobile],
                                    ["Birth Date", candidateForPopup.birthDate],
                                    ["Gender", candidateForPopup.gender],
                                    ["Nationality", candidateForPopup.nationality],
                                    ["Marital Status", candidateForPopup.maritalStatusList],
                                    ["Seasonal Status", candidateForPopup.seasonalStatusList],
                                    ["English Level", candidateForPopup.englishLevelList],
                                    ["Previous Company", candidateForPopup.previousCompany],
                                    ["Previous Job Experience", candidateForPopup.previousJobExperiece ? `${candidateForPopup.previousJobExperiece}Y` : "—"],
                                    ["Current Company", candidateForPopup.currentCompany],
                                    ["Current Job Experience", candidateForPopup.currentJobExperiece ? `${candidateForPopup.currentJobExperiece}Y` : "—"],
                                    ["Passport Expiry", candidateForPopup.passportExpireDate],
                                ].map(([k, v]) => (
                                    <div className="text-xs" key={k}>
                                        <div className="text-gray-500">{k}</div>
                                        <div className="font-semibold text-gray-800">{v || "—"}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                                <div className="text-sm">
                                    <div className="text-gray-700">Short Summary</div>
                                    <div className="text-gray-800">{candidateForPopup.shortSummary || "—"}</div>
                                </div>
                                <div className="text-sm">
                                    <div className="text-gray-700">Private Notes</div>
                                    <div className="text-gray-800">{candidateForPopup.privateNotes || "—"}</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                            <div className="rounded-xl border border-gray-400 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-base text-gray-800">Passport</div>
                                    {candidateForPopup.passportUrl ? (
                                        <a
                                            href={candidateForPopup.passportUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white hover:opacity-90"
                                        >
                                            Download
                                        </a>
                                    ) : (
                                        <span className="text-xs text-gray-500">No file</span>
                                    )}
                                </div>
                                <div className="mt-2 text-xs text-gray-800">
                                    Expiry: {candidateForPopup.passportExpireDate || "—"}
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-400 p-3">
                                <div className="text-sm text-gray-800">Working Video</div>
                                <div className="mt-2">
                                    {hasIframeHtml(candidateForPopup?.workingVideoIframe) ? (
                                        <button
                                            onClick={() => openVideoModal("Working Video", candidateForPopup?.workingVideoIframe)}
                                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:opacity-90"
                                        >
                                            Open Video
                                        </button>
                                    ) : (
                                        <div className="text-xs text-gray-500">None</div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-400 p-3">
                                <div className="text-sm text-gray-800">MI Screening Video</div>
                                <div className="mt-2">
                                    {hasIframeHtml(candidateForPopup?.miScreeningVideoIframe) ? (
                                        <button
                                            onClick={() =>
                                                openVideoModal("MI Screening Video", candidateForPopup?.miScreeningVideoIframe)
                                            }
                                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:opacity-90"
                                        >
                                            Open Video
                                        </button>
                                    ) : (
                                        <div className="text-xs text-gray-500">None</div>
                                    )}
                                </div>
                                <div className="mt-2 text-xs text-gray-800">
                                    Screening Date: {candidateForPopup?.dateScreeningInterview || "—"}
                                </div>
                            </div>
                        </div>

                        {candidateForPopup?.offerLetter ? (
                            <div className="mt-4 rounded-xl border border-gray-400 p-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-800">Offer Letter</div>
                                        <div className="text-xs text-gray-600">
                                            {candidateForPopup.offerLetter?.name || "Offer Letter"}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {candidateForPopup.offerLetter?.url ? (
                                            <a
                                                href={candidateForPopup.offerLetter.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:opacity-90"
                                            >
                                                View Offer Letter
                                            </a>
                                        ) : null}

                                        <button
                                            onClick={() => openOfferModal(candidateForPopup)}
                                            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                                        >
                                            Edit Offer Letter
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div className="mt-4 rounded-xl border border-gray-400 p-3">
                            <div className="text-sm text-gray-800">
                                Documents ({candidateForPopup?.documents?.length || 0})
                            </div>

                            <div className="mt-3 space-y-2">
                                {(candidateForPopup?.documents || []).map((d, idx) => (
                                    <div
                                        key={idx}
                                        className="flex flex-col gap-2 rounded-xl border border-gray-400 bg-gray-50 p-3 sm:flex-row sm:items-center"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm text-gray-800">{d?.name || "—"}</div>
                                            <div className="text-xs text-gray-800">
                                                Remarks: <span className="text-gray-800">{d?.remarks || "—"}</span>
                                            </div>
                                        </div>

                                        {d?.url ? (
                                            <a
                                                href={d.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full rounded-lg bg-blue-600 px-3 py-2 text-center text-sm text-white hover:opacity-90 sm:w-auto"
                                            >
                                                Download
                                            </a>
                                        ) : (
                                            <span className="text-xs text-gray-500">No file</span>
                                        )}
                                    </div>
                                ))}

                                {(candidateForPopup?.documents || []).length === 0 ? (
                                    <div className="text-xs text-gray-500">No documents</div>
                                ) : null}
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-semibold text-gray-800">CV Preview (PDF)</div>
                                <a
                                    href={candidateForPopup.cvUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-blue-600 hover:underline"
                                >
                                    Open / Download
                                </a>
                            </div>

                            <div className="relative mt-2 overflow-hidden rounded-xl border border-gray-200">
                                {cvLoading && (
                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white">
                                        <img
                                            src={LOADING_IMAGE}
                                            alt="Loading"
                                            className="h-24 w-24 object-contain sm:h-32 sm:w-32"
                                        />
                                        <div className="mt-3 text-sm text-gray-600">Loading CV preview...</div>
                                    </div>
                                )}

                                {cvFailed ? (
                                    <div className="p-4 sm:p-6">
                                        <div className="font-semibold text-red-700">CV preview failed to load</div>
                                        <p className="mt-2 text-sm text-gray-600">Use the button below to open in a new tab.</p>
                                        <div className="mt-3">
                                            <a
                                                href={candidateForPopup.cvUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex rounded-lg bg-red-700 px-4 py-2 text-sm text-white hover:opacity-90"
                                            >
                                                Open CV in New Tab
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-[65vh] sm:h-[78vh]">
                                        <iframe
                                            src={candidateForPopup.cvUrl}
                                            title="CV PDF"
                                            className="h-full w-full"
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
                                <a
                                    href={candidateForPopup.cvUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-medium text-blue-600 hover:underline"
                                >
                                    Open CV in New Tab
                                </a>{" "}
                                to view the full CV in PDF format.
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

            <VideoViewerModal
                open={videoModal.open}
                title={videoModal.title}
                iframeHtmlFromDb={videoModal.iframeHtmlFromDb}
                onClose={closeVideoModal}
            />

            <OfferLetterModal
                open={offerModal.open}
                candidate={offerModal.candidate}
                onClose={closeOfferModal}
                onUpload={handleUploadOfferLetter}
                onRemove={handleRemoveOfferLetter}
                submitting={offerSubmitting}
                error={offerError}
            />
        </>
    );
}