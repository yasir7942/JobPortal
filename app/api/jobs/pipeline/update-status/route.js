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
        process.env.STRAPI_TOKEN || process.env.STRAPI_API_TOKEN || ""
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
        new Error("Logged-in user role not found. Only staff or client can update pipeline status."),
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

    return chats
        .map((chat) => getDocId(chat))
        .filter(Boolean);
}

function uniqueStrings(items) {
    return [...new Set((items || []).map(String).filter(Boolean))];
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

async function createSystemChat({
    STRAPI_BASE_URL,
    oldStatus,
    newStatus,
    user,
    jobDocumentId,
    candidateDocumentId,
}) {
    const personRelation = getPersonRelation(user);

    const payload = {
        message: `Updated pipeline status from ${oldStatus || "—"} to ${newStatus}`,
        private: false,
        isSystemGenerated: true,
        personName: getPersonName(user) || "System",

        // Required fields in updated pipline-chat schema
        jobDocumentId: String(jobDocumentId || ""),
        candidateDocumentId: String(candidateDocumentId || ""),

        ...personRelation,
    };

    const res = await fetch(joinUrl(STRAPI_BASE_URL, "pipline-chats?status=published"), {
        method: "POST",
        headers: {
            Authorization: getBearer(),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            data: payload,
        }),
        cache: "no-store",
    });

    const json = await readBodySafe(res);

    if (!res.ok) {
        const err = new Error(json?.error?.message || "Failed to create system chat");
        err.status = res.status;
        err.details = json;
        throw err;
    }

    return normalize(json?.data);
}

/* ---------------- CANDIDATE JOB STATUS HELPERS ---------------- */

function isHiredPipelineStatus(value) {
    const v = String(value || "").trim();

    return (
        v === "Hired Candidate" ||
        v === "Immigration" ||
        v === "Placed"
    );
}

async function getCandidateJobStatus(STRAPI_BASE_URL, candidateDocumentId) {
    const res = await fetch(
        joinUrl(
            STRAPI_BASE_URL,
            `candidates/${encodeURIComponent(candidateDocumentId)}?status=published&fields[0]=jobStatus`
        ),
        {
            method: "GET",
            headers: {
                Authorization: getBearer(),
            },
            cache: "no-store",
        }
    );

    const json = await readBodySafe(res);

    if (!res.ok) {
        const err = new Error(json?.error?.message || "Failed to fetch candidate jobStatus");
        err.status = res.status;
        err.details = json;
        throw err;
    }

    return String(json?.data?.jobStatus || "").trim();
}

async function updateCandidateJobStatus(STRAPI_BASE_URL, candidateDocumentId, nextJobStatus) {
    const res = await fetch(
        joinUrl(
            STRAPI_BASE_URL,
            `candidates/${encodeURIComponent(candidateDocumentId)}?status=published`
        ),
        {
            method: "PUT",
            headers: {
                Authorization: getBearer(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                data: {
                    jobStatus: nextJobStatus,
                },
            }),
            cache: "no-store",
        }
    );

    const json = await readBodySafe(res);

    if (!res.ok) {
        const err = new Error(json?.error?.message || "Failed to update candidate jobStatus");
        err.status = res.status;
        err.details = json;
        throw err;
    }

    return json;
}

async function syncCandidateJobStatusByPipeline({
    STRAPI_BASE_URL,
    candidateDocumentId,
    oldStatus,
    newStatus,
}) {
    const isOldHiredPipeline = isHiredPipelineStatus(oldStatus);
    const isNewHiredPipeline = isHiredPipelineStatus(newStatus);

    let candidateJobStatusUpdatedTo = null;

    /*
        Hired Candidate / Immigration / Placed
        => candidate.jobStatus must be Hired
    */
    if (isNewHiredPipeline) {
        await updateCandidateJobStatus(
            STRAPI_BASE_URL,
            candidateDocumentId,
            "Hired"
        );

        candidateJobStatusUpdatedTo = "Hired";
    }

    /*
        Reverse from Hired Candidate / Immigration / Placed
        to Suggested / Shortlisted / Requested Interview:
        only if candidate.jobStatus is currently Hired,
        set candidate.jobStatus = Available
    */
    else if (isOldHiredPipeline && !isNewHiredPipeline) {
        const currentJobStatus = await getCandidateJobStatus(
            STRAPI_BASE_URL,
            candidateDocumentId
        );

        if (currentJobStatus.toLowerCase() === "hired") {
            await updateCandidateJobStatus(
                STRAPI_BASE_URL,
                candidateDocumentId,
                "Available"
            );

            candidateJobStatusUpdatedTo = "Available";
        }
    }

    return candidateJobStatusUpdatedTo;
}

export async function POST(req) {
    try {
        const STRAPI_BASE_URL = getStrapiBaseUrl();

        if (!STRAPI_BASE_URL) {
            return Response.json(
                {
                    ok: false,
                    error: "Missing Strapi base URL env",
                },
                { status: 500 }
            );
        }

        const body = await req.json();

        const jobDocumentId = String(body?.jobDocumentId || "").trim();
        const candidateDocumentId = String(body?.candidateDocumentId || "").trim();
        const newStatus = String(body?.newStatus || "").trim();

        if (!jobDocumentId || !candidateDocumentId || !newStatus) {
            return Response.json(
                {
                    ok: false,
                    error: "Missing jobDocumentId, candidateDocumentId, or newStatus",
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

        getPersonRelation(user);

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

        const jobRes = await fetch(
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

        const jobJson = await readBodySafe(jobRes);

        if (!jobRes.ok) {
            return Response.json(
                {
                    ok: false,
                    error: "Job load failed",
                    details: jobJson,
                },
                { status: jobRes.status }
            );
        }

        const job = normalize(jobJson?.data);
        const assigned = Array.isArray(job?.assignCandidatesToJob)
            ? job.assignCandidatesToJob
            : [];

        let oldStatus = "";
        let targetItem = null;

        for (const item of assigned) {
            const c = normalize(item?.candidate);

            if (String(c?.documentId) === String(candidateDocumentId)) {
                oldStatus = item?.candidateProcessList || "";
                targetItem = item;
                break;
            }
        }

        if (!targetItem) {
            return Response.json(
                {
                    ok: false,
                    error: "Candidate not found in this job pipeline",
                },
                { status: 404 }
            );
        }

        if (String(oldStatus) === String(newStatus)) {
            return Response.json({
                ok: true,
                oldStatus,
                newStatus,
                skipped: true,
                candidateJobStatusUpdatedTo: null,
            });
        }

        const systemChat = await createSystemChat({
            STRAPI_BASE_URL,
            oldStatus,
            newStatus,
            user,
            jobDocumentId,
            candidateDocumentId,
        });

        const oldChatDocIds = getChatDocIds(targetItem?.pipline_chats);
        const nextChatDocIds = uniqueStrings([
            ...oldChatDocIds,
            systemChat.documentId,
        ]);

        const nextAssign = assigned.map((item) => {
            const c = normalize(item?.candidate);
            const isTarget = String(c?.documentId) === String(candidateDocumentId);

            if (!isTarget) {
                return serializeAssignItem(item);
            }

            return serializeAssignItem(item, {
                candidateProcessList: newStatus,
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
                    error: "Pipeline update failed",
                    details: updateJson,
                    sent: nextAssign,
                },
                { status: updateRes.status }
            );
        }

        const candidateJobStatusUpdatedTo = await syncCandidateJobStatusByPipeline({
            STRAPI_BASE_URL,
            candidateDocumentId,
            oldStatus,
            newStatus,
        });

        return Response.json({
            ok: true,
            oldStatus,
            newStatus,
            systemChat,
            candidateJobStatusUpdatedTo,
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