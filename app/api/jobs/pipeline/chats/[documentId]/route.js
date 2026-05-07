export const runtime = "nodejs";

import { cookies } from "next/headers";
import { USER_COOKIE_NAME } from "@/lib/auth";

function joinUrl(base, path) {
    return `${String(base || "").replace(/\/+$/, "")}/${String(path || "").replace(/^\/+/, "")}`;
}

async function readBodySafe(res) {
    const text = await res.text();

    try {
        return text ? JSON.parse(text) : null;
    } catch {
        return { raw: text };
    }
}

function getStrapiBaseUrl() {
    return String(
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.STRAPI_BASE_URL ||
        process.env.STRAPI_URL ||
        ""
    )
        .trim()
        .replace(/\/$/, "");
}

function getBearer() {
    const raw = String(
        process.env.STRAPI_TOKEN ||
        process.env.STRAPI_API_TOKEN ||
        ""
    ).trim();

    return raw.toLowerCase().startsWith("bearer ") ? raw : `Bearer ${raw}`;
}

function normalize(row) {
    return row?.attributes
        ? {
            id: row.id,
            documentId: row.documentId,
            ...row.attributes,
        }
        : row || {};
}

async function getCurrentUser() {
    const store = await cookies();
    const raw = store.get(USER_COOKIE_NAME)?.value || "";

    try {
        return raw ? JSON.parse(decodeURIComponent(raw)) : null;
    } catch {
        try {
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }
}

function getPersonName(user) {
    return user?.name || user?.username || user?.email || "";
}

function getUserRole(user) {
    return String(
        user?.type ||
        user?.role?.name ||
        user?.roleRaw?.name ||
        user?.role ||
        ""
    )
        .trim()
        .toLowerCase();
}

function assertValidPerson(user) {
    if (!user) {
        throw Object.assign(new Error("Login required"), { status: 401 });
    }

    if (!user?.documentId) {
        throw Object.assign(new Error("Logged-in user documentId not found"), {
            status: 401,
        });
    }

    const role = getUserRole(user);

    if (
        role !== "staff" &&
        role !== "staffs" &&
        role !== "client" &&
        role !== "clients"
    ) {
        throw Object.assign(
            new Error("Logged-in user role not found. Only staff or client can edit pipeline chat."),
            { status: 403 }
        );
    }

    return true;
}

function parseHistory(value) {
    try {
        const rows = value ? JSON.parse(value) : [];
        return Array.isArray(rows) ? rows : [];
    } catch {
        return [];
    }
}

export async function PUT(req, { params }) {
    try {
        const STRAPI_BASE_URL = getStrapiBaseUrl();

        if (!STRAPI_BASE_URL) {
            return Response.json(
                { ok: false, error: "Missing Strapi base URL env" },
                { status: 500 }
            );
        }

        const p = await params;
        const documentId = String(p?.documentId || "").trim();
        const body = await req.json();

        if (!documentId) {
            return Response.json(
                { ok: false, error: "Missing chat documentId" },
                { status: 400 }
            );
        }

        const user = await getCurrentUser();
        assertValidPerson(user);

        const getRes = await fetch(
            joinUrl(
                STRAPI_BASE_URL,
                `pipline-chats/${encodeURIComponent(documentId)}?status=published`
            ),
            {
                headers: {
                    Authorization: getBearer(),
                },
                cache: "no-store",
            }
        );

        const getJson = await readBodySafe(getRes);

        if (!getRes.ok) {
            return Response.json(
                { ok: false, error: "Chat not found", details: getJson },
                { status: getRes.status }
            );
        }

        const old = normalize(getJson?.data);

        if (old?.isSystemGenerated) {
            return Response.json(
                { ok: false, error: "System generated chat cannot be edited" },
                { status: 400 }
            );
        }

        const message = String(body?.message || "").trim();

        if (!message) {
            return Response.json(
                { ok: false, error: "Message is required" },
                { status: 400 }
            );
        }

        const jobDocumentId = String(
            body?.jobDocumentId ||
            old?.jobDocumentId ||
            ""
        ).trim();

        const candidateDocumentId = String(
            body?.candidateDocumentId ||
            old?.candidateDocumentId ||
            ""
        ).trim();

        if (!jobDocumentId || !candidateDocumentId) {
            return Response.json(
                {
                    ok: false,
                    error: "jobDocumentId and candidateDocumentId are required for pipeline chat",
                },
                { status: 400 }
            );
        }

        const history = parseHistory(old?.history);

        history.push({
            message: old?.message || "",
            private: !!old?.private,
            personName: old?.personName || "",
            jobDocumentId: old?.jobDocumentId || jobDocumentId,
            candidateDocumentId: old?.candidateDocumentId || candidateDocumentId,
            createdAt: old?.createdAt || "",
            updatedAt: old?.updatedAt || "",
            editedAt: new Date().toISOString(),
            editedBy: getPersonName(user),
            editedByRole: getUserRole(user),
        });

        const updateRes = await fetch(
            joinUrl(
                STRAPI_BASE_URL,
                `pipline-chats/${encodeURIComponent(documentId)}?status=published`
            ),
            {
                method: "PUT",
                headers: {
                    Authorization: getBearer(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    data: {
                        message,
                        private: !!body?.private,
                        history: JSON.stringify(history),

                        // ✅ required fields after schema update
                        jobDocumentId,
                        candidateDocumentId,
                    },
                }),
                cache: "no-store",
            }
        );

        const updateJson = await readBodySafe(updateRes);

        if (!updateRes.ok) {
            return Response.json(
                {
                    ok: false,
                    error: "Failed to update chat",
                    details: updateJson,
                },
                { status: updateRes.status }
            );
        }

        return Response.json({
            ok: true,
            item: normalize(updateJson?.data),
        });
    } catch (e) {
        return Response.json(
            {
                ok: false,
                error: e?.message || "Server error",
            },
            { status: e?.status || 500 }
        );
    }
}