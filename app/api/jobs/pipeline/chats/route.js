export const runtime = "nodejs";

import { cookies } from "next/headers";
import qs from "qs";
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

function getPersonRelation(user) {
    const role = getUserRole(user);

    if (!user?.documentId) {
        throw Object.assign(new Error("Logged-in user documentId not found"), {
            status: 401,
        });
    }

    if (role === "staff" || role === "staffs") {
        return {
            staff: {
                connect: [user.documentId],
            },
        };
    }

    if (role === "client" || role === "clients") {
        return {
            client: {
                connect: [user.documentId],
            },
        };
    }

    throw Object.assign(
        new Error("Logged-in user role not found. Only staff or client can create pipeline chat."),
        { status: 403 }
    );
}

function getDocId(value) {
    const v = normalize(value);
    return v?.documentId || "";
}

function getMediaId(value) {
    const v = normalize(value);
    return v?.id || null;
}

function getChatDocIds(chats) {
    if (!Array.isArray(chats)) return [];

    return chats.map((chat) => getDocId(chat)).filter(Boolean);
}

function uniqueStrings(items) {
    return [...new Set((items || []).map(String).filter(Boolean))];
}

function normalizeChat(row) {
    const c = normalize(row);

    return {
        id: c?.id ?? null,
        documentId: c?.documentId || "",
        message: c?.message || "",
        private: !!c?.private,
        isSystemGenerated: !!c?.isSystemGenerated,
        history: c?.history || "",
        personName: c?.personName || "",
        jobDocumentId: c?.jobDocumentId || "",
        candidateDocumentId: c?.candidateDocumentId || "",
        createdAt: c?.createdAt || "",
        updatedAt: c?.updatedAt || "",
    };
}

function serializeAssignItem(item, patch = {}) {
    const candidateDocumentId = getDocId(item?.candidate);
    const offerLetterId = getMediaId(item?.offerLetter);

    const chatDocumentIds =
        patch.pipline_chats !== undefined
            ? patch.pipline_chats
            : getChatDocIds(item?.pipline_chats);

    const data = {
        candidateProcessList:
            patch.candidateProcessList !== undefined
                ? patch.candidateProcessList
                : item?.candidateProcessList || "",
    };

    if (candidateDocumentId) {
        data.candidate = {
            connect: [candidateDocumentId],
        };
    }

    if (offerLetterId) {
        data.offerLetter = offerLetterId;
    }

    data.pipline_chats = {
        connect: uniqueStrings(chatDocumentIds),
    };

    return data;
}

async function loadJobPipelineItem({
    STRAPI_BASE_URL,
    jobDocumentId,
    candidateDocumentId,
}) {
    const query = qs.stringify(
        {
            status: "published",
            populate: {
                assignCandidatesToJob: {
                    populate: {
                        candidate: {
                            fields: ["documentId"],
                        },
                        offerLetter: true,
                        pipline_chats: {
                            fields: ["documentId"],
                        },
                    },
                },
            },
        },
        { encodeValuesOnly: true }
    );

    const res = await fetch(
        joinUrl(
            STRAPI_BASE_URL,
            `jobs/${encodeURIComponent(jobDocumentId)}?${query}`
        ),
        {
            headers: {
                Authorization: getBearer(),
            },
            cache: "no-store",
        }
    );

    const json = await readBodySafe(res);

    if (!res.ok) {
        const err = new Error(json?.error?.message || "Failed to load job");
        err.status = res.status;
        err.details = json;
        throw err;
    }

    const job = normalize(json?.data);
    const assigned = Array.isArray(job?.assignCandidatesToJob)
        ? job.assignCandidatesToJob
        : [];

    const targetItem = assigned.find((item) => {
        const c = normalize(item?.candidate);
        return String(c?.documentId) === String(candidateDocumentId);
    });

    if (!targetItem) {
        const err = new Error("Candidate not found in this job pipeline");
        err.status = 404;
        throw err;
    }

    return {
        assigned,
        targetItem,
    };
}

export async function POST(req) {
    try {
        const STRAPI_BASE_URL = getStrapiBaseUrl();

        if (!STRAPI_BASE_URL) {
            return Response.json(
                { ok: false, error: "Missing Strapi base URL env" },
                { status: 500 }
            );
        }

        const body = await req.json();

        const jobDocumentId = String(body?.jobDocumentId || "").trim();
        const candidateDocumentId = String(body?.candidateDocumentId || "").trim();
        const message = String(body?.message || "").trim();

        if (!jobDocumentId || !candidateDocumentId || !message) {
            return Response.json(
                {
                    ok: false,
                    error: "Missing jobDocumentId, candidateDocumentId, or message",
                },
                { status: 400 }
            );
        }

        const user = await getCurrentUser();

        if (!user) {
            return Response.json(
                { ok: false, error: "Login required" },
                { status: 401 }
            );
        }

        const personRelation = getPersonRelation(user);

        const chatPayload = {
            message,
            private: !!body?.private,
            isSystemGenerated: !!body?.isSystemGenerated,
            personName: getPersonName(user),

            // ✅ required after schema update
            jobDocumentId,
            candidateDocumentId,

            ...personRelation,
        };

        const createRes = await fetch(
            joinUrl(STRAPI_BASE_URL, "pipline-chats?status=published"),
            {
                method: "POST",
                headers: {
                    Authorization: getBearer(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    data: chatPayload,
                }),
                cache: "no-store",
            }
        );

        const createJson = await readBodySafe(createRes);

        if (!createRes.ok) {
            return Response.json(
                {
                    ok: false,
                    error: "Failed to create chat",
                    details: createJson,
                },
                { status: createRes.status }
            );
        }

        const newChat = normalize(createJson?.data);

        const { assigned, targetItem } = await loadJobPipelineItem({
            STRAPI_BASE_URL,
            jobDocumentId,
            candidateDocumentId,
        });

        const oldChatDocIds = getChatDocIds(targetItem?.pipline_chats);
        const nextChatDocIds = uniqueStrings([
            ...oldChatDocIds,
            newChat.documentId,
        ]);

        const nextAssign = assigned.map((item) => {
            const c = normalize(item?.candidate);
            const isTarget = String(c?.documentId) === String(candidateDocumentId);

            if (!isTarget) {
                return serializeAssignItem(item);
            }

            return serializeAssignItem(item, {
                pipline_chats: nextChatDocIds,
            });
        });

        const updateRes = await fetch(
            joinUrl(
                STRAPI_BASE_URL,
                `jobs/${encodeURIComponent(jobDocumentId)}?status=published`
            ),
            {
                method: "PUT",
                headers: {
                    Authorization: getBearer(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    data: {
                        assignCandidatesToJob: nextAssign,
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
                    error: "Chat created but failed to attach to job pipeline",
                    details: updateJson,
                    sent: nextAssign,
                },
                { status: updateRes.status }
            );
        }

        return Response.json({
            ok: true,
            item: normalizeChat(newChat),
        });
    } catch (e) {
        return Response.json(
            {
                ok: false,
                error: e?.message || "Server error",
                details: e?.details || null,
            },
            { status: e?.status || 500 }
        );
    }
}