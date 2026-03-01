export const runtime = "nodejs";

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

export async function POST(req) {
    const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL;
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
        const body = await readReqJsonSafe(req);

        if (!body || body.__raw) {
            return Response.json(
                { ok: false, error: "Invalid JSON body", details: body?.__raw || null },
                { status: 400 }
            );
        }

        const clientDocumentId = String(body.clientDocumentId || "").trim();
        if (!clientDocumentId) {
            return Response.json({ ok: false, error: "Missing clientDocumentId" }, { status: 400 });
        }

        // Strapi v5: you can usually connect relation using documentId directly
        // We will do: client: clientDocumentId
        // If your relation expects an object: { connect: [clientDocumentId] } then adjust.
        const payload = {
            data: {
                title: body.title || "",
                location: body.location || "",
                jobTypeList: body.jobTypeList || "",
                closingDate: body.closingDate || null,
                industeryList: body.industeryList || "",
                showToCandidateList: body.showToCandidateList || "",
                vacanciesNo: body.vacanciesNo || "",
                shortDescription: body.shortDescription || "",
                vacanciesNo: body.vacanciesNo || "",
                experience: body.experience || 0,

                details: Array.isArray(body.details) ? body.details : [],
                statusList: body.statusList || "Open",

                referenceNo: body.referenceNo || "",
                // relation
                client: clientDocumentId,
            },
        };

        const created = await strapiFetch("jobs?status=published", {
            method: "POST",
            json: payload,
        });


        // console.log("Created Job", { created });
        const jobId = created?.data?.id;
        const jobDocumentId = created?.data?.documentId;
        //console.log("Created Job ID", { jobId });

        const reCreated = await strapiFetch(`jobs/${jobDocumentId}?status=published`, {
            method: "PUT",
            useAuth: true,
            json: { data: { referenceNo: `JB-${jobId}` } },
        });

        return Response.json({ ok: true, reCreated }, { status: 200 });
    } catch (err) {
        return Response.json(
            { ok: false, error: err?.message || "Server error", details: err?.details || null },
            { status: err?.status || 500 }
        );
    }
}