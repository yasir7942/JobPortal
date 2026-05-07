import { NextResponse } from "next/server";
import qs from "qs";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const PIPELINE_STAGES = [
    "Shortlisted Candidate",
    "Requested Interview",
    "Hired Candidate",
    "Immigration",
    "Placed",
];

function strapiBase() {
    return (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/$/, "");
}

function strapiToken() {
    return process.env.STRAPI_TOKEN || "";
}

function bearer() {
    const token = strapiToken();
    return token ? `Bearer ${token}` : "";
}

function arr(v) {
    return Array.isArray(v) ? v : [];
}

function attr(item) {
    return item?.attributes ? item.attributes : item;
}

function text(v) {
    return String(v || "").trim();
}

function normalizeStage(stage) {
    const value = text(stage).toLowerCase();

    if (value === "shortlisted candidate") return "Shortlisted Candidate";
    if (value === "requested interview") return "Requested Interview";
    if (value === "hired candidate") return "Hired Candidate";
    if (value === "immigration") return "Immigration";
    if (value === "placed") return "Placed";

    return text(stage);
}

function hasOfferLetter(item) {
    return Boolean(
        item?.offerLetter?.data ||
        item?.offerLetter?.id ||
        item?.offerLetter?.url ||
        item?.offerLetter?.documentId
    );
}

export async function GET() {
    try {
        const session = await getSession();


        if (!session?.user) {

            return NextResponse.json(
                { ok: false, error: "Not authenticated" },
                { status: 401 }
            );
        }


        const user = session.user;
        const role = text(user?.type || user?.role?.type || user?.roleRaw.type).toLowerCase();



        if (role !== "client" && role !== "clients") {
            return NextResponse.json(
                { ok: false, error: "Only clients can access this dashboard" },
                { status: 403 }
            );
        }

        const clientDocumentId = user?.documentId;



        if (!clientDocumentId) {
            return NextResponse.json(
                { ok: false, error: "Client documentId missing in login session" },
                { status: 400 }
            );
        }

        const base = strapiBase();



        if (!base) {
            return NextResponse.json(
                { ok: false, error: "Missing NEXT_PUBLIC_API_BASE_URL" },
                { status: 500 }
            );
        }

        const jobsQuery = qs.stringify(
            {
                status: "published",
                filters: {
                    client: {
                        documentId: {
                            $eq: clientDocumentId,
                        },
                    },
                },
                sort: ["createdAt:desc"],
                pagination: {
                    pageSize: 300,
                },
                populate: {
                    client: true,
                    assignCandidatesToJob: {
                        populate: {
                            candidate: true,
                            offerLetter: true,
                        },
                    },
                },
            },
            { encodeValuesOnly: true }
        );

        const jobsRes = await fetch(`${base}/jobs?${jobsQuery}`, {
            headers: {
                Authorization: bearer(),
            },
            cache: "no-store",
        });



        const jobsJson = await jobsRes.json().catch(() => null);



        if (!jobsRes.ok) {
            return NextResponse.json(
                { ok: false, error: jobsJson?.error?.message || "Failed to fetch jobs" },
                { status: jobsRes.status }
            );
        }

        const jobs = arr(jobsJson?.data).map(attr);

        const pipelineCounts = {};
        PIPELINE_STAGES.forEach((stage) => {
            pipelineCounts[stage] = 0;
        });

        let openJobs = 0;
        let closedJobs = 0;
        let totalVacancies = 0;
        let totalPipelineCandidates = 0;
        let hiredOrPlaced = 0;
        let offerLetters = 0;
        let interviewCandidates = 0;
        let immigrationCandidates = 0;

        const jobsPerformance = [];
        const recentActivity = [];

        for (const job of jobs) {
            const statusList = text(job?.statusList);
            const isOpen = statusList.toLowerCase() === "open";

            if (isOpen) openJobs += 1;
            else closedJobs += 1;

            const assigned = arr(job?.assignCandidatesToJob);

            const jobCounts = {};
            PIPELINE_STAGES.forEach((stage) => {
                jobCounts[stage] = 0;
            });

            for (const item of assigned) {
                const stage = normalizeStage(item?.candidateProcessList);

                if (PIPELINE_STAGES.includes(stage)) {
                    pipelineCounts[stage] += 1;
                    jobCounts[stage] += 1;
                    totalPipelineCandidates += 1;
                }

                if (stage === "Requested Interview") interviewCandidates += 1;
                if (stage === "Immigration") immigrationCandidates += 1;

                if (stage === "Hired Candidate" || stage === "Placed") {
                    hiredOrPlaced += 1;
                }

                if (hasOfferLetter(item)) {
                    offerLetters += 1;
                }

                recentActivity.push({
                    text: `${stage || "Pipeline"} update in ${job?.referenceNo || "job"}`,
                    date: job?.updatedAt || job?.createdAt || null,
                });
            }

            const vacanciesNo = Number(job?.vacanciesNo || job?.vacancyNo || 0);
            const progressHired =
                Number(jobCounts["Hired Candidate"] || 0) + Number(jobCounts["Placed"] || 0);

            totalVacancies += vacanciesNo;

            const progress = vacanciesNo
                ? Math.min(100, Math.round((progressHired / vacanciesNo) * 100))
                : 0;

            jobsPerformance.push({
                documentId: job?.documentId || null,
                title: job?.title || job?.jobTitle || "Untitled Job",
                referenceNo: job?.referenceNo || "N/A",
                statusList: statusList || "N/A",
                vacanciesNo,
                totalCandidates: assigned.length,
                shortlisted: jobCounts["Shortlisted Candidate"],
                requestedInterview: jobCounts["Requested Interview"],
                hired: jobCounts["Hired Candidate"],
                immigration: jobCounts["Immigration"],
                placed: jobCounts["Placed"],
                progressHired,
                progress,
            });
        }

        recentActivity.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        return NextResponse.json({
            ok: true,
            user: {
                name: user?.name || user?.username || "",
                email: user?.email || "",
                role,
                documentId: clientDocumentId,
            },
            stats: {
                totalJobs: jobs.length,
                openJobs,
                closedJobs,
                totalVacancies,
                totalPipelineCandidates,
                hiredOrPlaced,
                offerLetters,
                interviewCandidates,
                immigrationCandidates,
            },
            pipelineChart: PIPELINE_STAGES.map((name) => ({
                name,
                value: pipelineCounts[name] || 0,
            })),
            jobsPerformance,
            recentActivity: recentActivity.slice(0, 10),
        });
    } catch (error) {
        return NextResponse.json(
            { ok: false, error: error?.message || "Client dashboard fetch failed" },
            { status: 500 }
        );
    }
}