import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ADMIN_ORIGIN =
    process.env.NEXT_PUBLIC_ADMIN_BASE_URL?.replace(/\/$/, "") ||
    "admin.matchworkers.com";

function normalizeFileUrl(inputUrl) {
    const raw = String(inputUrl || "").trim();

    if (!raw) return "";

    // If Strapi returns relative path like /uploads/file.pdf
    if (raw.startsWith("/uploads/")) {
        return `${ADMIN_ORIGIN}${raw}`;
    }

    // If full URL
    try {
        const u = new URL(raw);

        const allowedHosts = [
            "admin.matchworkers.com",
            "www.admin.matchworkers.com",
            "admin.enginemover.com",
            "www.admin.enginemover.com",
            "127.0.0.1",
            "localhost",
        ];

        if (!allowedHosts.includes(u.hostname)) {
            return "";
        }

        return u.toString();
    } catch {
        return "";
    }
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const inputUrl = searchParams.get("url");

        const fileUrl = normalizeFileUrl(inputUrl);

        if (!fileUrl) {
            return NextResponse.json(
                {
                    error: "Blocked file url",
                    received: inputUrl || null,
                },
                { status: 403 }
            );
        }

        const res = await fetch(fileUrl, {
            method: "GET",
            cache: "no-store",
        });

        if (!res.ok) {
            return NextResponse.json(
                {
                    error: "Failed to load file",
                    status: res.status,
                    fileUrl,
                },
                { status: res.status }
            );
        }

        const buffer = await res.arrayBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": res.headers.get("content-type") || "application/pdf",
                "Content-Disposition": "inline",
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("[MEDIA_PROXY_ERROR]", error);

        return NextResponse.json(
            { error: "Server error while loading media" },
            { status: 500 }
        );
    }
}