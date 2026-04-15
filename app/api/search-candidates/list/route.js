export const runtime = "nodejs";

import qs from "qs";

function strapiBase() {
    return (
        process.env.STRAPI_URL ||
        process.env.NEXT_PUBLIC_STRAPI_URL ||
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

async function fetchStrapi(path, queryObj = {}) {
    const token = strapiToken();
    const base = strapiBase();

    if (!token) throw new Error("Missing STRAPI token env");

    const query = qs.stringify(
        { status: "published", ...queryObj },
        { encodeValuesOnly: true }
    );

    const url = `${base}${path}${query ? `?${query}` : ""}`;

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
    });

    const json = await readBodySafe(res);

    if (!res.ok || json?.error) {
        throw new Error(json?.error?.message || `Strapi request failed: ${path}`);
    }

    return json;
}

function pickAttrs(row) {
    return row?.attributes ?? row ?? {};
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const requestedClientDocumentId = String(searchParams.get("clientDocumentId") || "").trim();
        const requestedJobDocumentId = String(searchParams.get("jobDocumentId") || "").trim();

        const [clientsJson, jobsJson, jobRolesJson] = await Promise.all([
            fetchStrapi("/api/clients", {
                fields: ["companyName", "ownerName", "documentId"],
                pagination: { page: 1, pageSize: 500 },
                sort: ["createdAt:desc"],
            }),
            fetchStrapi("/api/jobs", {
                fields: ["title", "referenceNo", "referenceNumber", "documentId"],
                pagination: { page: 1, pageSize: 500 },
                sort: ["createdAt:desc"],
                populate: {
                    client: {
                        fields: ["documentId", "companyName", "ownerName"],
                    },
                },
            }),
            fetchStrapi("/api/job-roles", {
                fields: ["title", "name", "documentId"],
                pagination: { page: 1, pageSize: 500 },
                sort: ["title:asc"],
            }),
        ]);

        const clients = (clientsJson?.data || []).map((row) => {
            const a = pickAttrs(row);
            return {
                id: row?.id ?? null,
                documentId: row?.documentId || a?.documentId || "",
                companyName: a?.companyName || "",
                ownerName: a?.ownerName || "",
            };
        });

        const jobs = (jobsJson?.data || []).map((row) => {
            const a = pickAttrs(row);
            const clientRel = a?.client?.data ?? a?.client ?? null;
            const clientAttrs = pickAttrs(clientRel);

            return {
                id: row?.id ?? null,
                documentId: row?.documentId || a?.documentId || "",
                title: a?.title || "",
                referenceNo: a?.referenceNo || "",
                referenceNumber: a?.referenceNumber || "",
                clientDocumentId: clientRel?.documentId || clientAttrs?.documentId || "",
                companyName: clientAttrs?.companyName || "",
            };
        });

        const jobRoles = (jobRolesJson?.data || []).map((row) => {
            const a = pickAttrs(row);
            return {
                id: row?.id ?? null,
                documentId: row?.documentId || a?.documentId || "",
                title: a?.title || a?.name || "",
                name: a?.name || a?.title || "",
            };
        });

        let initialClientDocumentId = "";
        let initialJobDocumentId = "";

        if (requestedClientDocumentId && requestedJobDocumentId) {
            const foundJob = jobs.find(
                (j) =>
                    String(j.documentId) === String(requestedJobDocumentId) &&
                    String(j.clientDocumentId) === String(requestedClientDocumentId)
            );

            if (foundJob) {
                initialClientDocumentId = requestedClientDocumentId;
                initialJobDocumentId = requestedJobDocumentId;
            }
        }

        return Response.json({
            ok: true,
            clients,
            jobs,
            jobRoles,
            initialClientDocumentId,
            initialJobDocumentId,
        });
    } catch (e) {
        return Response.json(
            { ok: false, error: e?.message || "Server error" },
            { status: 500 }
        );
    }
}