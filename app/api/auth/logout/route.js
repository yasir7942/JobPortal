// app/api/auth/logout/route.js
import { NextResponse } from "next/server";
import { JWT_COOKIE_NAME, USER_COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
    const response = NextResponse.json({ ok: true });

    response.cookies.set(JWT_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });

    response.cookies.set(USER_COOKIE_NAME, "", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });

    return response;
}