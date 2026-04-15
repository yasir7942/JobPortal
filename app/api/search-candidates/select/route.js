export const runtime = "nodejs";

import qs from "qs";

function strapiBase() {
    return (

        process.env.NEXT_PUBLIC_ADMIN_BASE_URL ||
        "http://127.0.0.1:1337"
    ).replace(/\/$/, "");
}

function strapiToken() {
    return process.env.STRAPI_TOKEN || "";
}

function safeArray(v) {
    return Array.isArray(v) ? v : [];
}

async function readBodySafe(res) {
    const text = await res.text();

    try {
        return text ? JSON.parse(text) : null;
    } catch {
        return { raw: text };
    }
}

async function fetchStrapi(path, queryObj = {}) {
    const token = strapiToken();
    const base = strapiBase();

    if (!token) {
        throw new Error("Missing STRAPI token env");
    }

    const query = qs.stringify(
        { status: "published", ...queryObj },
        { encodeValuesOnly: true }
    );

    const url = `${base}${path}${query ? `?${query}` : ""}`;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
    });

    const json = await readBodySafe(res);

    if (!res.ok || json?.error) {
        throw new Error(
            json?.error?.message ||
            json?.message ||
            `Strapi request failed: ${path} (${res.status})`
        );
    }

    return json;
}

async function putStrapi(path, payload) {
    const token = strapiToken();
    const base = strapiBase();

    if (!token) {
        throw new Error("Missing STRAPI token env");
    }

    const url = `${base}${path}${path.includes("?") ? "&" : "?"}status=published`;

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
    });

    const json = await readBodySafe(res);

    if (!res.ok || json?.error) {
        throw new Error(
            json?.error?.message ||
            json?.message ||
            `Strapi update failed: ${path} (${res.status})`
        );
    }

    return json;
}

function pickAttrs(row) {
    return row?.attributes ?? row ?? {};
}

function normalizeActionText(action) {
    const value = String(action || "").trim().toLowerCase();

    if (value === "suggested") return "Suggested Candidate";
    if (value === "shortlisted") return "Shortlisted Candidate";
    if (value === "request interview") return "Requested Interview";

    throw new Error("Invalid action");
}

async function getCandidateByDocumentId(candidateDocumentId) {
    const json = await fetchStrapi("/api/candidates", {
        filters: {
            documentId: {
                $eq: candidateDocumentId,
            },
        },
        fields: ["documentId", "fullName", "referenceNumber"],
        pagination: {
            page: 1,
            pageSize: 1,
        },
    });

    const row = safeArray(json?.data)[0];
    const a = pickAttrs(row);



    if (!row) {
        throw new Error("Candidate not found");
    }

    return {
        id: row?.id ?? a?.id ?? null,
        documentId: row?.documentId || a?.documentId || "",
        fullName: a?.fullName || "",
        referenceNumber: a?.referenceNumber || "",
    };
}

async function getJobByDocumentId(jobDocumentId) {
    const json = await fetchStrapi("/api/jobs", {
        filters: {
            documentId: {
                $eq: jobDocumentId,
            },
        },
        fields: ["documentId", "title", "referenceNo"],
        populate: {
            assignCandidatesToJob: {
                populate: {
                    candidate: {
                        fields: ["documentId", "fullName", "referenceNumber"],
                    },

                },
            },
        },
        pagination: {
            page: 1,
            pageSize: 1,
        },
    });

    const row = safeArray(json?.data)[0];
    const a = pickAttrs(row);

    if (!row) {
        throw new Error("Job not found");
    }


    return {
        id: row?.id ?? a?.id ?? null,
        documentId: row?.documentId || a?.documentId || "",
        title: a?.title || "",
        referenceNo: a?.referenceNo || "",
        assignCandidatesToJob: safeArray(a?.assignCandidatesToJob),
    };
}

function getRelationId(rel) {
    const raw = rel?.data ?? rel;
    const a = pickAttrs(raw);

    return raw?.id ?? a?.id ?? null;
}

function getRelationDocumentId(rel) {
    const raw = rel?.data ?? rel;
    const a = pickAttrs(raw);

    return String(raw?.documentId || a?.documentId || "").trim();
}

export async function POST(req) {
    try {
        const body = await req.json();

        const candidateDocumentId = String(body?.candidateDocumentId || "").trim();
        const jobDocumentId = String(body?.jobDocumentId || "").trim();
        const action = String(body?.action || "").trim();

        if (!candidateDocumentId) {
            return Response.json(
                {
                    ok: false,
                    error: "candidateDocumentId is required",
                },
                { status: 400 }
            );
        }

        if (!jobDocumentId) {
            return Response.json(
                {
                    ok: false,
                    error: "jobDocumentId is required",
                },
                { status: 400 }
            );
        }

        if (!action) {
            return Response.json(
                {
                    ok: false,
                    error: "action is required",
                },
                { status: 400 }
            );
        }

        const processText = normalizeActionText(action);

        const [candidateRow, jobRow] = await Promise.all([
            getCandidateByDocumentId(candidateDocumentId),
            getJobByDocumentId(jobDocumentId),
        ]);

        const existingItems = safeArray(jobRow.assignCandidatesToJob);

        const existingIndex = existingItems.findIndex((item) => {
            const itemAttrs = pickAttrs(item);
            const existingCandidateDocId = getRelationDocumentId(itemAttrs?.candidate);
            return String(existingCandidateDocId) === String(candidateDocumentId);
        });

        const normalizedExistingItems = existingItems.map((item) => {
            const itemAttrs = pickAttrs(item);

            return {
                candidateProcessList: itemAttrs?.candidateProcessList || "",
                candidate: getRelationId(itemAttrs?.candidate),
                /* ...(getRelationId(itemAttrs?.offerLetter)
                     ? { offerLetter: getRelationId(itemAttrs?.offerLetter) }
                     : {}),  */
            };
        });

        if (existingIndex >= 0) {
            normalizedExistingItems[existingIndex] = {
                ...normalizedExistingItems[existingIndex],
                candidateProcessList: processText,
                candidate: candidateRow.id,
            };
        } else {
            normalizedExistingItems.push({
                candidateProcessList: processText,
                candidate: candidateRow.id,
            });
        }

        await putStrapi(`/api/jobs/${jobRow.documentId}`, {
            data: {
                assignCandidatesToJob: normalizedExistingItems,
            },
        });

        return Response.json({
            ok: true,
            message: "Candidate selected successfully",
            candidateProcessList: processText,
            jobDocumentId: jobRow.documentId,
            candidateDocumentId: candidateRow.documentId,
        });
    } catch (e) {
        return Response.json(
            {
                ok: false,
                error: e?.message || "Server error",
            },
            { status: 500 }
        );
    }
}