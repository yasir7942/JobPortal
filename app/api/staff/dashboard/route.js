import { NextResponse } from "next/server";
import qs from "qs";

export const runtime = "nodejs";

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

function isOpenJob(job) {
    return text(job?.statusList).toLowerCase() === "open";
}

function getClientName(client) {
    const c = attr(client);
    return c?.companyName || c?.name || "N/A";
}

function hasOfferLetter(item) {
    return Boolean(
        item?.offerLetter?.data ||
        item?.offerLetter?.id ||
        item?.offerLetter?.url ||
        item?.offerLetter?.documentId
    );
}

const PIPELINE_STAGES = [
    "Shortlisted Candidate",
    "Requested Interview",
    "Hired Candidate",
    "Immigration",
    "Placed",
];

function normalizeStage(stage) {
    const value = text(stage).toLowerCase();

    if (value === "shortlisted candidate") return "Shortlisted Candidate";
    if (value === "requested interview") return "Requested Interview";
    if (value === "hired candidate") return "Hired Candidate";
    if (value === "immigration") return "Immigration";
    if (value === "placed") return "Placed";

    return text(stage);
}

export async function GET() {
    try {
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
                    statusList: {
                        $eqi: "Open",
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

        const clientsQuery = qs.stringify(
            {
                status: "published",
                filters: {
                    statusList: {
                        $eqi: "Active",
                    },
                },
                pagination: {
                    pageSize: 1,
                },
            },
            { encodeValuesOnly: true }
        );

        const [jobsRes, clientsRes] = await Promise.all([
            fetch(`${base}/jobs?${jobsQuery}`, {
                headers: { Authorization: bearer() },
                cache: "no-store",
            }),
            fetch(`${base}/clients?${clientsQuery}`, {
                headers: { Authorization: bearer() },
                cache: "no-store",
            }),
        ]);

        const jobsJson = await jobsRes.json().catch(() => null);
        const clientsJson = await clientsRes.json().catch(() => null);

        if (!jobsRes.ok) {
            return NextResponse.json(
                { ok: false, error: jobsJson?.error?.message || "Failed to fetch jobs" },
                { status: jobsRes.status }
            );
        }

        const jobs = arr(jobsJson?.data).map(attr).filter(isOpenJob);

        const pipelineCounts = {};
        PIPELINE_STAGES.forEach((s) => {
            pipelineCounts[s] = 0;
        });

        let pipelineCandidates = 0;
        let hiredCandidates = 0;
        let offerLetters = 0;
        let totalVacancies = 0;
        let totalPlacedOrHired = 0;
        let jobsWithoutCandidates = 0;
        let jobsLowProgress = 0;

        const jobsPerformance = [];
        const recentActivity = [];

        for (const job of jobs) {
            const assigned = arr(job?.assignCandidatesToJob);

            const jobCounts = {};
            PIPELINE_STAGES.forEach((s) => {
                jobCounts[s] = 0;
            });

            if (assigned.length === 0) {
                jobsWithoutCandidates += 1;
            }

            for (const item of assigned) {
                const stage = normalizeStage(item?.candidateProcessList);

                if (PIPELINE_STAGES.includes(stage)) {
                    pipelineCounts[stage] += 1;
                    jobCounts[stage] += 1;
                    pipelineCandidates += 1;
                }

                if (stage === "Hired Candidate" || stage === "Placed") {
                    hiredCandidates += 1;
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
            totalPlacedOrHired += progressHired;

            const progress = vacanciesNo
                ? Math.min(100, Math.round((progressHired / vacanciesNo) * 100))
                : 0;

            if (vacanciesNo > 0 && progress < 50) {
                jobsLowProgress += 1;
            }

            jobsPerformance.push({
                documentId: job?.documentId || null,
                title: job?.title || job?.jobTitle || "Untitled Job",
                referenceNo: job?.referenceNo || "N/A",
                clientName: getClientName(job?.client?.data || job?.client),
                statusList: job?.statusList || "Open",
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
            stats: {
                openJobs: jobs.length,
                activeClients: clientsJson?.meta?.pagination?.total || 0,
                hiredCandidates,
                pipelineCandidates,
                offerLetters,
                totalVacancies,
                totalPlacedOrHired,
                jobsWithoutCandidates,
                jobsLowProgress,
                interviewCandidates: pipelineCounts["Requested Interview"] || 0,
                immigrationCandidates: pipelineCounts["Immigration"] || 0,
                placedCandidates: pipelineCounts["Placed"] || 0,
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
            { ok: false, error: error?.message || "Dashboard fetch failed" },
            { status: 500 }
        );
    }
}