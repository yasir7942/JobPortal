export const runtime = "nodejs";

import qs from "qs";

function strapiBase() {
    return (
        process.env.STRAPI_URL ||
        process.env.NEXT_PUBLIC_STRAPI_URL ||
        "http://127.0.0.1:1337"
    ).replace(/\/$/, "");
}

function strapiPublicBase() {
    return (
        process.env.STRAPI_PUBLIC_URL ||
        process.env.NEXT_PUBLIC_STRAPI_PUBLIC_URL ||
        process.env.NEXT_PUBLIC_STRAPI_URL ||
        process.env.STRAPI_URL ||
        "http://127.0.0.1:1337"
    ).replace(/\/$/, "");
}

function strapiToken() {
    return (
        process.env.STRAPI_API_TOKEN ||
        process.env.STRAPI_TOKEN ||
        process.env.STRAPI_ADMIN_TOKEN ||
        ""
    );
}

async function readBodySafe(res) {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : null;
    } catch {
        return { raw: text };
    }
}

function toProcessString(action) {
    const v = String(action || "").trim().toLowerCase();

    if (v === "shortlisted" || v === "shortlisted candidate") {
        return "Shortlisted Candidate";
    }

    if (
        v === "interview" ||
        v === "requested interview" ||
        v === "request interview"
    ) {
        return "Requested Interview";
    }

    if (v === "hired" || v === "hired candidate") {
        return "Hired Candidate";
    }

    return "Suggested Candidate";
}

function relationId(value) {
    if (!value) return null;

    const v = value?.data ?? value;

    if (typeof v === "object" && v !== null) {
        return v.id ?? null;
    }

    if (typeof v === "number") return v;
    return null;
}

function sanitizeAssignmentRow(row) {
    return {
        candidate: relationId(row?.candidate),
        candidateProcessList: row?.candidateProcessList || "Suggested Candidate",
        requestedInterviewDate: row?.requestedInterviewDate || null,
        offerLetter: relationId(row?.offerLetter) || null,
    };
}

function sanitizeAssignmentRows(rows) {
    return (Array.isArray(rows) ? rows : [])
        .map(sanitizeAssignmentRow)
        .filter((row) => row?.candidate);
}

function absoluteMediaUrl(url) {
    if (!url) return "";
    if (String(url).startsWith("http")) return url;
    return `${strapiPublicBase()}${String(url).startsWith("/") ? "" : "/"}${url}`;
}

function normalizeOfferLetterMedia(media) {
    const m = media?.data ?? media;
    const attrs = m?.attributes ?? m;

    const id = m?.id ?? null;
    const name = attrs?.name ?? "";
    const url = attrs?.url ?? "";

    if (!id && !name && !url) return null;

    return {
        id,
        name,
        url: absoluteMediaUrl(url),
    };
}

async function getCandidateIdByDocumentId(base, token, candidateDocumentId) {
    const url = `${base}/api/candidates/${candidateDocumentId}?status=published`;

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
    });

    const json = await readBodySafe(res);

    if (!res.ok || json?.error) {
        throw new Error(json?.error?.message || "Failed to fetch candidate");
    }

    const candidateId = json?.data?.id;

    if (!candidateId) {
        throw new Error("Candidate id not found");
    }

    return candidateId;
}

async function getJobAssignments(base, token, jobDocumentId) {
    const queryObj = {
        status: "published",
        populate: {
            assignCandidatesToJob: {
                populate: {
                    candidate: {
                        fields: ["id"],
                    },
                    offerLetter: {
                        fields: ["id", "name", "url"],
                    },
                },
            },
        },
    };

    const query = qs.stringify(queryObj, { encodeValuesOnly: true });
    const url = `${base}/api/jobs/${jobDocumentId}?${query}`;

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
    });

    const json = await readBodySafe(res);

    if (!res.ok || json?.error) {
        throw new Error(json?.error?.message || "Failed to fetch job");
    }

    const job = json?.data || null;

    const rows = Array.isArray(job?.assignCandidatesToJob)
        ? job.assignCandidatesToJob
        : Array.isArray(job?.attributes?.assignCandidatesToJob)
            ? job.attributes.assignCandidatesToJob
            : [];

    return rows;
}

async function updateJobAssignments(base, token, jobDocumentId, assignments) {
    const payload = {
        data: {
            assignCandidatesToJob: assignments,
        },
    };

    const url = `${base}/api/jobs/${jobDocumentId}?status=published`;

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const json = await readBodySafe(res);

    if (!res.ok || json?.error) {
        console.error("PUT PAYLOAD", JSON.stringify(payload, null, 2));
        console.error("PUT RESPONSE", json);
        throw new Error(json?.error?.message || "Failed to update job");
    }

    return json;
}

async function uploadOfferLetterToStrapi(base, token, file) {
    const fd = new FormData();
    fd.append("files", file, file?.name || "offer-letter");

    const res = await fetch(`${base}/api/upload`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: fd,
    });

    const json = await readBodySafe(res);

    if (!res.ok || json?.error) {
        throw new Error(json?.error?.message || "Failed to upload offer letter");
    }

    const uploaded = Array.isArray(json) ? json[0] : null;

    if (!uploaded?.id) {
        throw new Error("Offer letter upload failed");
    }

    return {
        id: uploaded.id,
        name: uploaded.name || "",
        url: absoluteMediaUrl(uploaded.url || ""),
    };
}

async function updateCandidateJobStatus(base, token, candidateDocumentId, nextJobStatus) {
    const payload = {
        data: {
            jobStatus: nextJobStatus,
        },
    };

    const url = `${base}/api/candidates/${candidateDocumentId}?status=published`;

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const json = await readBodySafe(res);

    if (!res.ok || json?.error) {
        console.error("CANDIDATE JOB STATUS PUT PAYLOAD", JSON.stringify(payload, null, 2));
        console.error("CANDIDATE JOB STATUS PUT RESPONSE", json);
        throw new Error(json?.error?.message || "Failed to update candidate jobStatus");
    }

    return json;
}

export async function GET(req) {
    try {
        const token = strapiToken();
        const base = strapiBase();

        if (!token) {
            return Response.json(
                { ok: false, error: "Missing STRAPI token env" },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(req.url);
        const jobDocumentId = String(searchParams.get("jobDocumentId") || "").trim();
        const candidateDocumentId = String(searchParams.get("candidateDocumentId") || "").trim();

        if (!jobDocumentId || !candidateDocumentId) {
            return Response.json(
                { ok: false, error: "jobDocumentId and candidateDocumentId are required" },
                { status: 400 }
            );
        }

        const candidateId = await getCandidateIdByDocumentId(base, token, candidateDocumentId);
        const rawRows = await getJobAssignments(base, token, jobDocumentId);

        const matched = (Array.isArray(rawRows) ? rawRows : []).find((row) => {
            const rowCandidateId = relationId(row?.candidate);
            return String(rowCandidateId) === String(candidateId);
        });

        return Response.json({
            ok: true,
            candidateId,
            candidateProcessList: matched?.candidateProcessList || "",
            offerLetter: normalizeOfferLetterMedia(matched?.offerLetter),
        });
    } catch (e) {
        return Response.json(
            { ok: false, error: e?.message || "Server error" },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        const token = strapiToken();
        const base = strapiBase();

        if (!token) {
            return Response.json(
                { ok: false, error: "Missing STRAPI token env" },
                { status: 500 }
            );
        }

        const contentType = req.headers.get("content-type") || "";

        let jobDocumentId = "";
        let candidateDocumentId = "";
        let action = "";
        let uploadedOfferLetter = null;

        if (contentType.includes("multipart/form-data")) {
            const form = await req.formData();

            jobDocumentId = String(form.get("jobDocumentId") || "").trim();
            candidateDocumentId = String(form.get("candidateDocumentId") || "").trim();
            action = String(form.get("action") || "").trim();

            if (!jobDocumentId || !candidateDocumentId || !action) {
                return Response.json(
                    {
                        ok: false,
                        error: "jobDocumentId, candidateDocumentId and action are required",
                    },
                    { status: 400 }
                );
            }

            if (action !== "uploadOfferLetter") {
                return Response.json(
                    { ok: false, error: "Invalid multipart action" },
                    { status: 400 }
                );
            }

            const file = form.get("file");
            if (!file || typeof file === "string") {
                return Response.json(
                    { ok: false, error: "Offer letter file is required" },
                    { status: 400 }
                );
            }

            uploadedOfferLetter = await uploadOfferLetterToStrapi(base, token, file);
        } else {
            const body = await req.json();

            jobDocumentId = String(body?.jobDocumentId || "").trim();
            candidateDocumentId = String(body?.candidateDocumentId || "").trim();
            action = String(body?.action || "").trim();

            if (!jobDocumentId || !action) {
                return Response.json(
                    {
                        ok: false,
                        error: "jobDocumentId and action are required",
                    },
                    { status: 400 }
                );
            }
        }

        const rawRows = await getJobAssignments(base, token, jobDocumentId);
        const cleanRows = sanitizeAssignmentRows(rawRows);

        if (!cleanRows.length) {
            return Response.json(
                { ok: false, error: "No assignCandidatesToJob rows found" },
                { status: 404 }
            );
        }

        if (action === "clearSuggestedCandidates") {
            const updatedRows = cleanRows.filter(
                (row) => String(row?.candidateProcessList || "") !== "Suggested Candidate"
            );

            await updateJobAssignments(base, token, jobDocumentId, updatedRows);

            return Response.json({
                ok: true,
                action,
            });
        }

        if (!candidateDocumentId) {
            return Response.json(
                {
                    ok: false,
                    error: "candidateDocumentId is required",
                },
                { status: 400 }
            );
        }

        const candidateId = await getCandidateIdByDocumentId(base, token, candidateDocumentId);

        if (action === "removeCandidate") {
            const targetRow = cleanRows.find(
                (row) => String(row?.candidate) === String(candidateId)
            );

            const wasHired =
                String(targetRow?.candidateProcessList || "") === "Hired Candidate";

            const updatedRows = cleanRows.filter(
                (row) => String(row?.candidate) !== String(candidateId)
            );

            await updateJobAssignments(base, token, jobDocumentId, updatedRows);

            if (wasHired) {
                await updateCandidateJobStatus(base, token, candidateDocumentId, "Available");
            }

            return Response.json({
                ok: true,
                action,
                candidateId,
                candidateJobStatusUpdatedTo: wasHired ? "Available" : null,
            });
        }

        let found = false;
        let resultProcess = "";
        let resultOfferLetter = null;
        let previousProcess = "";
        let nextProcessForCandidate = "";

        const updatedRows = cleanRows.map((row) => {
            if (String(row.candidate) === String(candidateId)) {
                found = true;
                previousProcess = row.candidateProcessList || "";

                if (action === "uploadOfferLetter") {
                    resultProcess = row.candidateProcessList || "Hired Candidate";
                    resultOfferLetter = uploadedOfferLetter;

                    return {
                        ...row,
                        offerLetter: uploadedOfferLetter?.id || null,
                    };
                }

                if (action === "removeOfferLetter") {
                    resultProcess = row.candidateProcessList || "";
                    resultOfferLetter = null;

                    return {
                        ...row,
                        offerLetter: null,
                    };
                }

                const nextProcess = toProcessString(action);
                resultProcess = nextProcess;
                resultOfferLetter = row.offerLetter || null;
                nextProcessForCandidate = nextProcess;

                return {
                    ...row,
                    candidateProcessList: nextProcess,
                };
            }

            return row;
        });

        if (!found) {
            return Response.json(
                {
                    ok: false,
                    error: "Candidate not found in assignCandidatesToJob",
                },
                { status: 404 }
            );
        }

        await updateJobAssignments(base, token, jobDocumentId, updatedRows);

        if (nextProcessForCandidate === "Hired Candidate") {
            await updateCandidateJobStatus(base, token, candidateDocumentId, "Hired");
        } else if (
            previousProcess === "Hired Candidate" &&
            nextProcessForCandidate &&
            nextProcessForCandidate !== "Hired Candidate"
        ) {
            await updateCandidateJobStatus(base, token, candidateDocumentId, "Available");
        }

        return Response.json({
            ok: true,
            candidateId,
            candidateProcessList: resultProcess,
            offerLetter: resultOfferLetter,
            candidateJobStatusUpdatedTo:
                nextProcessForCandidate === "Hired Candidate"
                    ? "Hired"
                    : previousProcess === "Hired Candidate" &&
                        nextProcessForCandidate !== "Hired Candidate"
                        ? "Available"
                        : null,
        });
    } catch (e) {
        return Response.json(
            { ok: false, error: e?.message || "Server error" },
            { status: 500 }
        );
    }
}