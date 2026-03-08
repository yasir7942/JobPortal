// app/api/jobs/candidates/move/route.js
export const runtime = "nodejs";

function strapiBase() {
    return (process.env.STRAPI_URL ||
        process.env.NEXT_PUBLIC_STRAPI_URL ||
        "http://127.0.0.1:1337").replace(/\/$/, "");
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

function normProcess(v) {
    return String(v || "").toLowerCase().replace(/\s+/g, "");
}

// Map your UI targets -> exact stored dropdown strings (adjust spelling if your dropdown differs)
function toProcessString(to) {
    const t = String(to || "").toLowerCase().replace(/\s+/g, "");
    if (t === "shortlisted" || t === "shortlistedcandidate") return "Shortlisted Candidate";
    if (t === "hired" || t === "hiredcandidate") return "Hired Candidate";
    if (
        t === "interview" ||
        t === "requestedinterview" ||
        t === "requestinterview" ||
        t === "requestedinterviewcandidate"
    )
        return "Requested Interview";

    // default
    return "Suggested Candidate";
}

async function getCandidateIdByDocumentId(base, token, candidateDocumentId) {
    const url = `${base}/api/candidates/${encodeURIComponent(candidateDocumentId)}?status=published`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
    });
    const json = await readBodySafe(res);
    if (!res.ok || json?.error) {
        throw new Error(json?.error?.message || "Failed to fetch candidate");
    }
    return json?.data?.id;
}

export async function POST(req) {
    try {
        const body = await req.json();

        const jobDocumentId = body?.jobDocumentId;
        const candidateDocumentId = body?.candidateDocumentId;
        const to = body?.to; // "shortlisted" | "interview" | "hired" | "suggested"
        const removeFromOthers = body?.removeFromOthers !== false; // default true

        const requestedInterviewDate = body?.requestedInterviewDate || null; // "YYYY-MM-DD"
        const offerLetterId = body?.offerLetterId ?? null; // media id (optional)

        if (!jobDocumentId || !candidateDocumentId || !to) {
            return Response.json(
                { ok: false, error: "Missing jobDocumentId / candidateDocumentId / to" },
                { status: 400 }
            );
        }

        const base = strapiBase();
        const token = strapiToken();
        if (!token) {
            return Response.json(
                { ok: false, error: "Missing STRAPI token env (STRAPI_API_TOKEN/STRAPI_TOKEN)" },
                { status: 500 }
            );
        }

        // 1) fetch job (need current assignCandidatesToJob)
        const getUrl =
            `${base}/api/jobs/${encodeURIComponent(jobDocumentId)}` +
            `?status=published` +
            `&populate[assignCandidatesToJob][populate][candidate]=*` +
            `&populate[assignCandidatesToJob][populate][offerLetter]=*`;

        const getRes = await fetch(getUrl, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        });

        const getJson = await readBodySafe(getRes);
        if (!getRes.ok || getJson?.error) {
            return Response.json(
                { ok: false, error: getJson?.error?.message || "Failed to load job", details: getJson },
                { status: getRes.status || 500 }
            );
        }

        const jobData = getJson?.data;
        const jobAttrs = jobData?.attributes ?? {};
        const current = Array.isArray(jobAttrs?.assignCandidatesToJob)
            ? jobAttrs.assignCandidatesToJob
            : [];

        // 2) resolve candidate numeric id (relation needs id)
        const candidateId = await getCandidateIdByDocumentId(base, token, candidateDocumentId);
        if (!candidateId) {
            return Response.json({ ok: false, error: "Candidate not found" }, { status: 404 });
        }

        // 3) remove old entry for this candidate (if requested)
        const next = removeFromOthers
            ? current.filter((row) => {
                const c = row?.candidate?.data ?? row?.candidate;
                const cid = c?.id ?? null;
                return String(cid) !== String(candidateId);
            })
            : [...current];

        // 4) push new component entry
        const entry = {
            candidateProcessList: toProcessString(to),
            candidate: candidateId,
            requestedInterviewDate: requestedInterviewDate || null,
            ...(offerLetterId ? { offerLetter: offerLetterId } : {}),
        };

        next.unshift(entry);

        // 5) update job
        const putUrl = `${base}/api/jobs/${jobDocumentId}?status=published`;
        const putRes = await fetch(putUrl, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ data: { assignCandidatesToJob: next } }),
        });

        const putJson = await readBodySafe(putRes);
        if (!putRes.ok || putJson?.error) {
            return Response.json(
                { ok: false, error: putJson?.error?.message || "Failed to update job", details: putJson },
                { status: putRes.status || 500 }
            );
        }

        return Response.json({ ok: true });
    } catch (e) {
        return Response.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
    }
}