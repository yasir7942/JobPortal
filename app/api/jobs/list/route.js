export const runtime = "nodejs";
import qs from "qs";

// same helper style you already use in routes :contentReference[oaicite:5]{index=5}
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

function unwrapCollectionItem(item) {
    if (!item) return null;
    if (item.attributes) {
        return { id: item.id, documentId: item.documentId ?? item.attributes?.documentId, ...item.attributes };
    }
    return item;
}

export async function GET(req) {
    const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL; // e.g. http://127.0.0.1:1337/api
    const RAW_TOKEN = String(process.env.STRAPI_TOKEN || "").trim();

    if (!STRAPI_BASE_URL || !RAW_TOKEN) {
        return Response.json({ ok: false, error: "Missing STRAPI_BASE_URL or STRAPI_TOKEN" }, { status: 500 });
    }

    const BEARER = RAW_TOKEN.toLowerCase().startsWith("bearer ") ? RAW_TOKEN : `Bearer ${RAW_TOKEN}`;

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

        const res = await fetch(url, { method, headers, body, redirect: "manual", cache: "no-store" });



        if (res.status >= 300 && res.status < 400) {
            const loc = res.headers.get("location");
            const err = new Error(`Strapi redirect detected (${res.status}). Fix STRAPI_BASE_URL. location=${loc}`);
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
        const url = new URL(req.url);

        const clientDocumentId = String(url.searchParams.get("clientDocumentId") || "").trim();
        const includeClosed = String(url.searchParams.get("includeClosed") || "0") === "1";

        const page = Math.max(1, Number(url.searchParams.get("page") || 1));
        const pageSizeRaw = Number(url.searchParams.get("pageSize") || 10);
        const pageSize = Math.min(50, Math.max(1, pageSizeRaw));

        if (!clientDocumentId) {
            return Response.json({ ok: false, error: "Missing clientDocumentId" }, { status: 400 });
        }

        // IMPORTANT:
        // This assumes your Job has a relation field named "client" (job belongsTo client)
        // and your job status field is "statusList".
        const filters = includeClosed
            ? { client: { documentId: { $eq: clientDocumentId } } }
            : { client: { documentId: { $eq: clientDocumentId } }, statusList: { $eq: "open" } };

        const queryObj = {
            status: "published",
            sort: ["createdAt:desc"],
            pagination: { page, pageSize },
            filters,
            populate: {
                client: true,
            },
        };

        const query = qs.stringify(queryObj, { encodeValuesOnly: true });
        const parsed = await strapiFetch(`jobs?${query}`, { method: "GET" });

        const pagination = parsed?.meta?.pagination || {};
        const data = Array.isArray(parsed?.data) ? parsed.data : [];

        const items = data.map((it) => {
            const j = unwrapCollectionItem(it) || {};
            const documentId = j?.documentId || it?.documentId || j?.id || it?.id;
            console.log("Parsed Job", { documentId, j, it });
            return {
                id: j?.id ?? it?.id ?? null,
                documentId: documentId ? String(documentId) : "",
                companyName: j?.client.companyName || "",
                title: j?.title || "",
                details: j?.details || [],
                referenceNo: j?.referenceNo || "",
                closingDate: j?.closingDate || "",
                location: j?.location || "",
                industeryList: j?.industeryList || "",
                jobType: j?.jobType || "",
                salary: j?.salary || "",
                statusList: j?.statusList || "",
                jobTypeList: j?.jobTypeList || "",
                jobTypeList: j?.jobTypeList || "",
                vacanciesNo: j?.vacanciesNo || "",
                experience: j?.experience || "",
                shortDescription: j?.shortDescription || "",
                showToCandidateList: j?.showToCandidateList || "",
                createdAt: j?.createdAt || "",
            };
        });

        return Response.json(
            {
                ok: true,
                page: pagination.page ?? page,
                pageSize: pagination.pageSize ?? pageSize,
                pageCount: pagination.pageCount ?? 1,
                total: pagination.total ?? items.length,
                items,
            },
            { status: 200 }
        );
    } catch (err) {
        return Response.json(
            { ok: false, error: err?.message || "Server error", details: err?.details || null },
            { status: err?.status || 500 }
        );
    }
}