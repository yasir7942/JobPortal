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

    if (!token) {
        throw new Error("Missing STRAPI token env");
    }

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
        throw new Error(
            json?.error?.message ||
            json?.message ||
            `Strapi request failed: ${path} (${res.status})`
        );
    }

    return json;
}

function pickAttrs(row) {
    return row?.attributes ?? row ?? {};
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        const requestedClientDocumentId = String(
            searchParams.get("clientDocumentId") || ""
        ).trim();

        const requestedJobDocumentId = String(
            searchParams.get("jobDocumentId") || ""
        ).trim();

        const [clientsJson, jobsJson, jobRolesJson] = await Promise.all([
            fetchStrapi("/api/clients", {
                fields: ["companyName", "ownerName", "documentId"],
                pagination: { page: 1, pageSize: 500 },
                sort: ["createdAt:desc"],
            }),
            fetchStrapi("/api/jobs", {
                fields: ["title", "referenceNo", "documentId"],
                pagination: { page: 1, pageSize: 500 },
                sort: ["createdAt:desc"],
                populate: {
                    client: {
                        fields: ["documentId", "companyName", "ownerName"],
                    },
                },
            }),
            fetchStrapi("/api/job-roles", {
                fields: ["title", "documentId"],
                pagination: { page: 1, pageSize: 500 },
                sort: ["title:asc"],
            }),
        ]);

        const clients = safeArray(clientsJson?.data).map((row) => {
            const a = pickAttrs(row);

            return {
                id: row?.id ?? null,
                documentId: row?.documentId || a?.documentId || "",
                companyName: a?.companyName || "",
                ownerName: a?.ownerName || "",
            };
        });

        const jobs = safeArray(jobsJson?.data).map((row) => {
            const a = pickAttrs(row);
            const clientRel = a?.client?.data ?? a?.client ?? null;
            const clientAttrs = pickAttrs(clientRel);

            return {
                id: row?.id ?? null,
                documentId: row?.documentId || a?.documentId || "",
                title: a?.title || "",
                referenceNo: a?.referenceNo || "",
                referenceNumber: a?.referenceNo || "",
                clientDocumentId:
                    clientRel?.documentId || clientAttrs?.documentId || "",
                companyName: clientAttrs?.companyName || "",
                ownerName: clientAttrs?.ownerName || "",
            };
        });

        const jobRoles = safeArray(jobRolesJson?.data).map((row) => {
            const a = pickAttrs(row);

            return {
                id: row?.id ?? null,
                documentId: row?.documentId || a?.documentId || "",
                title: a?.title || "",
                name: a?.title || "",
            };
        });

        let initialClientDocumentId = "";
        let initialJobDocumentId = "";

        const foundClient = requestedClientDocumentId
            ? clients.find(
                (c) =>
                    String(c.documentId) === String(requestedClientDocumentId)
            )
            : null;

        if (foundClient) {
            initialClientDocumentId = foundClient.documentId;
        }

        if (requestedJobDocumentId) {
            const foundJob = jobs.find(
                (j) => String(j.documentId) === String(requestedJobDocumentId)
            );

            if (foundJob) {
                if (initialClientDocumentId) {
                    if (
                        String(foundJob.clientDocumentId) ===
                        String(initialClientDocumentId)
                    ) {
                        initialJobDocumentId = foundJob.documentId;
                    }
                } else {
                    initialJobDocumentId = foundJob.documentId;

                    if (foundJob.clientDocumentId) {
                        const jobClientExists = clients.some(
                            (c) =>
                                String(c.documentId) ===
                                String(foundJob.clientDocumentId)
                        );

                        if (jobClientExists) {
                            initialClientDocumentId = foundJob.clientDocumentId;
                        }
                    }
                }
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
            {
                ok: false,
                error: e?.message || "Server error",
            },
            { status: 500 }
        );
    }
}

function safeArray(v) {
    return Array.isArray(v) ? v : [];
}