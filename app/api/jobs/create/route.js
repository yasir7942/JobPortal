export const runtime = "nodejs";

import qs from "qs";

function joinUrl(base, path) {
    const b = String(base || "").replace(/\/+$/, "");
    const p = String(path || "").replace(/^\/+/, "");
    return `${b}/${p}`;
}

async function readBodySafe(res) {
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return { raw: text };
    }
}

async function readReqJsonSafe(req) {
    const text = await req.text();
    try {
        return text ? JSON.parse(text) : null;
    } catch {
        return { __raw: text };
    }
}

function toNumberOrNull(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function normalizeDetails(details) {
    return Array.isArray(details) ? details : [];
}

function normalizeDateOrNull(v) {
    const s = String(v || "").trim();
    return s || null;
}

function normalizeString(v) {
    return String(v || "").trim();
}

export async function POST(req) {
    const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL;
    const RAW_TOKEN = String(
        process.env.STRAPI_TOKEN ||
        process.env.STRAPI_API_TOKEN ||
        ""
    ).trim();

    if (!STRAPI_BASE_URL || !RAW_TOKEN) {
        return Response.json(
            { ok: false, error: "Missing STRAPI_BASE_URL or STRAPI_TOKEN" },
            { status: 500 }
        );
    }

    const BEARER = RAW_TOKEN.toLowerCase().startsWith("bearer ")
        ? RAW_TOKEN
        : `Bearer ${RAW_TOKEN}`;

    async function strapiFetch(path, opts = {}) {
        const url = joinUrl(STRAPI_BASE_URL, path);
        const method = opts.method || "GET";

        const headers = {
            Authorization: BEARER,
            ...(opts.headers || {}),
        };

        let body = opts.body;
        if (opts.json !== undefined) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(opts.json);
        }

        const res = await fetch(url, {
            method,
            headers,
            body,
            redirect: "manual",
            cache: "no-store",
        });

        if (res.status >= 300 && res.status < 400) {
            const loc = res.headers.get("location");
            const err = new Error(
                `Strapi redirect detected (${res.status}). Fix STRAPI_BASE_URL. location=${loc}`
            );
            err.status = 500;
            throw err;
        }

        const parsed = await readBodySafe(res);

        if (!res.ok) {
            const msg = parsed?.error?.message || parsed?.message || `Strapi error: ${res.status}`;
            const err = new Error(msg);
            err.details = parsed?.error || parsed;
            err.status = res.status;
            throw err;
        }

        return parsed;
    }

    try {
        const body = await readReqJsonSafe(req);

        if (!body || body.__raw) {
            return Response.json(
                { ok: false, error: "Invalid JSON body", details: body?.__raw || null },
                { status: 400 }
            );
        }

        const clientDocumentId = normalizeString(body.clientDocumentId);

        if (!clientDocumentId) {
            return Response.json(
                { ok: false, error: "Missing clientDocumentId" },
                { status: 400 }
            );
        }

        // 1) First fetch client by documentId
        const clientQueryObj = {
            status: "published",
            filters: {
                documentId: {
                    $eq: clientDocumentId,
                },
            },
            fields: ["documentId", "companyName"],
            pagination: {
                page: 1,
                pageSize: 1,
            },
        };

        const clientQuery = qs.stringify(clientQueryObj, { encodeValuesOnly: true });
        const clientRes = await strapiFetch(`clients?${clientQuery}`, { method: "GET" });

        const clientRow = Array.isArray(clientRes?.data) ? clientRes.data[0] : null;

        if (!clientRow) {
            return Response.json(
                { ok: false, error: "Client not found for provided clientDocumentId" },
                { status: 404 }
            );
        }

        const clientId = clientRow?.id ?? null;
        const resolvedClientDocumentId =
            clientRow?.documentId ||
            clientRow?.attributes?.documentId ||
            clientDocumentId;

        if (!clientId) {
            return Response.json(
                { ok: false, error: "Client id not found in Strapi response" },
                { status: 500 }
            );
        }

        // 2) Create job using resolved client relation
        // In your project, client is the relation field on job side.
        // Using numeric relation id is safer than raw documentId here.
        const payload = {
            data: {
                title: normalizeString(body.title),
                location: normalizeString(body.location),
                jobTypeList: normalizeString(body.jobTypeList),
                closingDate: normalizeDateOrNull(body.closingDate),
                industeryList: normalizeString(body.industeryList),
                showToCandidateList: normalizeString(body.showToCandidateList),
                vacanciesNo: toNumberOrNull(body.vacanciesNo),
                shortDescription: normalizeString(body.shortDescription),
                experience: toNumberOrNull(body.experience),
                details: normalizeDetails(body.details),
                statusList: normalizeString(body.statusList) || "Open",
                referenceNo: normalizeString(body.referenceNo),
                client: clientId,
            },
        };

        const created = await strapiFetch("jobs?status=published", {
            method: "POST",
            json: payload,
        });

        const createdJob = created?.data || null;
        const jobId = createdJob?.id ?? null;
        const jobDocumentId = createdJob?.documentId || createdJob?.attributes?.documentId || null;

        if (!jobId || !jobDocumentId) {
            return Response.json(
                {
                    ok: false,
                    error: "Job created but id/documentId missing in response",
                    details: created,
                },
                { status: 500 }
            );
        }

        // 3) Update referenceNo after create
        const finalReferenceNo = normalizeString(body.referenceNo) || `JB-${jobId}`;

        const updated = await strapiFetch(`jobs/${jobDocumentId}?status=published`, {
            method: "PUT",
            json: {
                data: {
                    referenceNo: finalReferenceNo,
                },
            },
        });

        return Response.json(
            {
                ok: true,
                message: "Job created successfully",
                client: {
                    id: clientId,
                    documentId: resolvedClientDocumentId,
                },
                job: {
                    id: jobId,
                    documentId: jobDocumentId,
                    referenceNo: finalReferenceNo,
                },
                created,
                updated,
            },
            { status: 200 }
        );
    } catch (err) {
        return Response.json(
            {
                ok: false,
                error: err?.message || "Server error",
                details: err?.details || null,
            },
            { status: err?.status || 500 }
        );
    }
}