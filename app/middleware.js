import { NextResponse } from "next/server";

const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || "jp_token";
const USER_COOKIE_NAME = process.env.USER_COOKIE_NAME || "jp_user";

const ROLE_ACCESS = [
    { prefix: "/staff/client/", roles: ["staff", "clients"] }, // dynamic child routes first
    { prefix: "/staff/client", roles: ["staff"] },             // exact list page
    { prefix: "/search-candidates/", roles: ["staff", "clients"] },
    { prefix: "/candidate/", roles: ["candidates", "staff", "clients"] },
    { prefix: "/jobs", roles: ["staff", "clients"] },
    { prefix: "/client", roles: ["clients", "staff"] },
    { prefix: "/candidate", roles: ["candidates"] },
    { prefix: "/staff", roles: ["staff"] },
];

function normalizeRole(role) {
    const value = String(role || "").trim().toLowerCase();

    if (value === "staff") return "staff";
    if (value === "client" || value === "clients") return "clients";
    if (value === "candidate" || value === "candidates") return "candidates";

    return value;
}

function getAllowedRolesForPath(pathname) {
    // exact page: only staff
    if (pathname === "/staff/client") {
        return ["staff"];
    }
    // any child page under /staff/client/:documentId...
    if (pathname.startsWith("/staff/client/")) {
        return ["staff", "clients"];
    }

    const matched = ROLE_ACCESS.find((item) => pathname.startsWith(item.prefix));
    return matched?.roles || null;
}

export function middleware(request) {
    const { pathname, search } = request.nextUrl;

    const isPublic =
        pathname === "/login" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico");

    if (isPublic) {
        return NextResponse.next();
    }

    const allowedRoles = getAllowedRolesForPath(pathname);

    if (!allowedRoles) {
        return NextResponse.next();
    }

    const token = request.cookies.get(JWT_COOKIE_NAME)?.value;
    const userRaw = request.cookies.get(USER_COOKIE_NAME)?.value;

    let user = null;
    try {
        user = userRaw ? JSON.parse(userRaw) : null;
    } catch {
        user = null;
    }

    const role = normalizeRole(user?.role || user?.type || user?.roleRaw);

    if (!token || !user) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", pathname + search);
        return NextResponse.redirect(loginUrl);
    }

    if (!allowedRoles.includes(role)) {
        let redirectTo = "/login";

        if (role === "staff") redirectTo = "/staff";
        else if (role === "clients") redirectTo = "/client";
        else if (role === "candidates") redirectTo = "/candidate";

        return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)"],
};


/*

import { NextResponse } from "next/server";

const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || "jp_token";
const USER_COOKIE_NAME = process.env.USER_COOKIE_NAME || "jp_user";

const ROLE_ACCESS = [
    { prefix: "/staff", roles: ["staff"] },
    { prefix: "/client", roles: ["clients", "staff"] },
    { prefix: "/candidate", roles: ["candidates", "clients", "staff"] },

    // shared pages
    { prefix: "/jobs", roles: ["staff", "clients"] },
    { prefix: "/staff/", roles: ["staff", "clients"] },
    { prefix: "/staff/client", roles: ["staff"] },
    { prefix: "/candidate/", roles: ["candidates", "staff", "clients"] },

    { prefix: "/search-candidates/", roles: ["staff", "clients"] },
];

function getAllowedRolesForPath(pathname) {
    const matched = ROLE_ACCESS.find((item) => pathname.startsWith(item.prefix));
    return matched?.roles || null;
}

export function middleware(request) {
    const { pathname, search } = request.nextUrl;

    const isPublic =
        pathname === "/login" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico");

    if (isPublic) {
        return NextResponse.next();
    }

    const allowedRoles = getAllowedRolesForPath(pathname);

    if (!allowedRoles) {
        return NextResponse.next();
    }

    const token = request.cookies.get(JWT_COOKIE_NAME)?.value;
    const userRaw = request.cookies.get(USER_COOKIE_NAME)?.value;

    let user = null;
    try {
        user = userRaw ? JSON.parse(userRaw) : null;
    } catch {
        user = null;
    }

    const role = user?.role || null;

    if (!token || !user) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", pathname + search);
        return NextResponse.redirect(loginUrl);
    }

    if (!allowedRoles.includes(role)) {
        let redirectTo = "/login";

        if (role === "staff") redirectTo = "/staff";
        else if (role === "clients") redirectTo = "/client";
        else if (role === "candidates") redirectTo = "/candidate";

        return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)"],
};


*/