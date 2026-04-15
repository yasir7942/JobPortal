import { cookies } from "next/headers";

export const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || "jp_token";
export const USER_COOKIE_NAME = process.env.USER_COOKIE_NAME || "jp_user";

function getCookieOptions() {
    const isProd = process.env.NODE_ENV === "production";

    return {
        httpOnly: false,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
    };
}

export function extractUserRole(user) {
    const raw =
        user?.role?.type ||
        user?.role?.name ||
        user?.role?.code ||
        user?.role ||
        user?.roleRaw ||
        user?.type ||
        "";

    const role = String(raw).trim().toLowerCase();

    if (role === "client" || role === "clients") return "clients";
    if (role === "candidate" || role === "candidates") return "candidates";
    if (role === "staffs" || role === "staff") return "staff";


    return role;
}

export async function getSession() {
    const cookieStore = await cookies();

    const token = cookieStore.get(JWT_COOKIE_NAME)?.value || null;
    const userRaw = cookieStore.get(USER_COOKIE_NAME)?.value || null;

    let user = null;

    try {
        user = userRaw ? JSON.parse(userRaw) : null;
    } catch {
        user = null;
    }

    return {
        token,
        user,
        role: extractUserRole(user),
        isLoggedIn: !!token && !!user,
    };
}

export async function setUserSession(user) {
    const cookieStore = await cookies();
    cookieStore.set(USER_COOKIE_NAME, JSON.stringify(user), getCookieOptions());
    return user;
}

export async function clearSession() {
    const cookieStore = await cookies();
    cookieStore.delete(JWT_COOKIE_NAME);
    cookieStore.delete(USER_COOKIE_NAME);
}

export function normalizeRoleForCookie(role) {
    const value = String(role || "").trim().toLowerCase();

    if (value === "staffs" || value === "staff") return "staff";
    if (value === "clients" || value === "client") return "clients";
    if (value === "candidates" || value === "candidate") return "candidates";

    return value;
}

