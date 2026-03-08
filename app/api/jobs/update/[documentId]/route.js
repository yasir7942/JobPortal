export const runtime = "nodejs";

function joinUrl(base, path) {
    const b = String(base || "").replace(/\/+$/, "");
    const p = String(path || "").replace(/^\/+/, "");
    return `${b}/${p}`;
}

async function readBodySafe(res) {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : null;
    } catch {
        return { raw: text };
    }
}

export async function PUT(req, { params }) {
    try {
        // ✅ Next.js 15: params can be Promise
        const p = await params;
        const documentId = p?.documentId;

        if (!documentId) {
            return Response.json({ ok: false, error: "Missing documentId" }, { status: 400 });
        }

        const body = await req.json().catch(() => null);
        if (!body) {
            return Response.json({ ok: false, error: "Missing JSON body" }, { status: 400 });
        }

        const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL || process.env.STRAPI_URL;
        const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

        if (!STRAPI_BASE_URL) {
            return Response.json({ ok: false, error: "Missing STRAPI_BASE_URL" }, { status: 500 });
        }

        const url = joinUrl(
            STRAPI_BASE_URL,
            `/jobs/${documentId}?status=published`
        );

        const res = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...(STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {}),
            },
            cache: "no-store",
            body: JSON.stringify({
                data: {

                    title: body.title ?? "",
                    location: body.location ?? "",
                    closingDate: body.closingDate ?? null,
                    statusList: body.statusList ?? "open",
                    industeryList: body.industeryList ?? "",
                    jobTypeList: body.jobTypeList ?? "",
                    showToCandidateList: body.showToCandidateList ?? "",
                    vacanciesNo: body.vacanciesNo ?? 0,
                    experience: body.experience ?? 0,
                    shortDescription: body.shortDescription ?? "",
                    details: Array.isArray(body.details) ? body.details : [],
                },
            }),
        });

        const json = await readBodySafe(res);
        if (!res.ok) {
            return Response.json(
                { ok: false, error: "System Update failed", details: json },
                { status: res.status }
            );
        }

        const data = json?.data || null;
        const attrs = data?.attributes || data || {};
        const item = {
            documentId: data?.documentId || attrs?.documentId || documentId,
            id: data?.id || null,
            ...attrs,
        };

        return Response.json({ ok: true, item }, { status: 200 });
    } catch (e) {
        return Response.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
    }
}