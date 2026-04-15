"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

function normalizeRole(role) {
    const value = String(role || "").trim().toLowerCase();

    if (value === "clients") return "clients";
    if (value === "candidates") return "candidates";
    if (value === "staff") return "staff";

    return value;
}

function isValidImage(image) {
    const value = String(image || "").trim();
    return value !== "" && value !== "null" && value !== "undefined";
}

function getDashboardByRole(role) {
    const normalized = normalizeRole(role);

    if (normalized === "staff") return "/staff";
    if (normalized === "clients") return "/client";
    if (normalized === "candidates") return "/candidate";

    return "/";
}

function getMenuLinksByRole(role, userDocumentId) {
    const normalized = normalizeRole(role);

    if (normalized === "staff") {
        return [
            { label: "Dashboard", href: "/staff/" },
            { label: "Advance Search Candidates", href: "/search-candidates/" },
            { label: "Clients", href: "/staff/client/" },
            { label: "Candidates", href: "/staff/candidates" },
            { label: "Jobs", href: "/jobs" },
            { label: "My Profile", href: "/staff/profile" },
        ];
    }

    if (normalized === "clients") {
        return [
            { label: "Dashboard", href: `/client/` },
            { label: "Advance Search Candidates", href: `/search-candidates/?clientDocumentId=${userDocumentId}&jobDocumentId=` },
            { label: "Candidates", href: "/staff/candidates/" },
            { label: "Jobs", href: `/client/${userDocumentId}/jobs/` },
            { label: "My Profile", href: `/staff/client/${userDocumentId}/` },
        ];
    }

    if (normalized === "candidates") {
        return [
            { label: "Dashboard", href: "/candidate" },
            { label: "My Jobs", href: `/candidate/jobs/${userDocumentId}` },
            { label: "My Profile", href: `/candidate/profile/${userDocumentId}` },
        ];
    }

    return [{ label: "Dashboard", href: "/" }];
}

function getProfileImageUrl(image) {
    const img = String(image || "").trim();
    if (!img) return "";

    if (img.startsWith("http://") || img.startsWith("https://")) {
        return img;
    }

    const baseUrl = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || "";
    return `${baseUrl}${img}`;
}

export default function Header({ user }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    const closeDrawer = () => setOpen(false);
    const openDrawer = () => setOpen(true);

    const role = normalizeRole(user?.role?.name || user?.type);
    const userDocumentId = user?.documentId || "";
    const firstName = user?.name || user?.fullName || user?.username || user?.email || "User";
    const profileImage = isValidImage(user?.image) ? user.image : "";
    const profileImageUrl = getProfileImageUrl(profileImage);
    const hasProfileImage = isValidImage(profileImageUrl);

    const dashboardLink = getDashboardByRole(role);
    const menuLinks = useMemo(() => getMenuLinksByRole(role, userDocumentId), [role, userDocumentId]);

    useEffect(() => {
        if (!open) return;

        const onKey = (e) => {
            if (e.key === "Escape") closeDrawer();
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [open]);

    async function handleLogout(e) {
        e.preventDefault();

        try {
            await fetch("/api/auth/logout", {
                method: "POST",
            });
        } catch (error) {
            console.error("[LOGOUT_ERROR]", error);
        } finally {
            closeDrawer();
            router.replace("/login");
            router.refresh();
        }
    }

    const MenuLinks = ({ onClick }) => (
        <ul className="flex flex-col gap-2 text-base font-bold text-gray-800">
            {menuLinks.map((item) => (
                <li key={item.href}>
                    <Link
                        className="block rounded-xl px-3 py-3 hover:bg-amber-50 hover:text-red-700"
                        href={item.href}
                        onClick={onClick}
                    >
                        {item.label}
                    </Link>
                </li>
            ))}

            <li>
                <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full rounded-xl px-3 py-3 text-left hover:bg-amber-50 hover:text-red-700"
                >
                    Logout
                </button>
            </li>
        </ul>
    );

    return (
        <header className="w-full overflow-x-hidden border-b border-gray-200 bg-gray-50">
            <div className="mx-auto flex w-full max-w-full items-center gap-3 px-4 py-3">
                {/* Left: profile + welcome */}
                <div className="flex min-w-0 shrink items-center gap-3">
                    {hasProfileImage ? (
                        <Image
                            src={profileImageUrl}
                            alt={firstName || "User"}
                            width={48}
                            height={48}
                            className="h-12 w-12  object-cover"
                        />
                    ) : (
                        <img
                            src="https://placehold.net/avatar.svg"
                            alt="Profile"
                            className="h-12 w-12 rounded-full object-cover"
                        />
                    )}

                    <div className="min-w-0 leading-tight">
                        <div className="text-base text-gray-800 sm:text-lg">Welcome,</div>
                        <div className="truncate text-sm font-semibold text-red-700 sm:text-base">
                            {firstName}
                        </div>
                    </div>
                </div>

                {/* Desktop menu */}
                <nav className="hidden flex-1 justify-center md:flex">
                    <ul className="flex flex-wrap items-center gap-6 text-base font-bold text-gray-800">
                        {menuLinks.map((item) => (
                            <li key={item.href}>
                                <Link
                                    className="hover:text-red-700 hover:underline"
                                    href={item.href}
                                >
                                    {item.label}
                                </Link>
                            </li>
                        ))}

                        <li>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="font-bold text-gray-800 hover:text-red-700 hover:underline"
                            >
                                Logout
                            </button>
                        </li>
                    </ul>
                </nav>

                {/* Right: profile image + hamburger */}
                <div className="ml-auto flex shrink-0 items-center gap-2">



                    <div className="hidden sm:flex items-center justify-center pr-10"    >
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="font-bold text-red-700 hover:text-gray-800 hover:underline"
                        >
                            Logout
                        </button>




                    </div>

                    <button
                        type="button"
                        onClick={openDrawer}
                        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-amber-50 md:hidden"
                        aria-label="Open menu"
                        aria-expanded={open}
                        aria-controls="mobile-drawer"
                    >
                        <svg viewBox="0 0 24 24" className="h-6 w-6 text-gray-800">
                            <path
                                fill="currentColor"
                                d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"
                            />
                        </svg>
                        <span className="text-sm font-bold text-gray-800">Menu</span>
                    </button>
                </div>
            </div>

            {open && (
                <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
                    <div onClick={closeDrawer} className="absolute inset-0 bg-black/50" />

                    <div
                        id="mobile-drawer"
                        className="absolute right-0 top-0 h-full w-[85%] max-w-sm border-l-4 border-red-700 bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b px-4 py-4">
                            <div className="flex min-w-0 items-center gap-3">
                                {hasProfileImage ? (
                                    <Image
                                        src={profileImageUrl}
                                        alt={firstName}
                                        width={44}
                                        height={44}
                                        className="h-11 w-11  object-cover"
                                    />
                                ) : (
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                                        {String(firstName).charAt(0).toUpperCase()}
                                    </div>
                                )}

                                <div className="min-w-0 leading-tight">
                                    <div className="text-sm text-gray-600">Signed in as</div>
                                    <div className="truncate text-base font-bold text-red-700">
                                        {firstName}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={closeDrawer}
                                className="flex h-10 w-10 items-center justify-center rounded-xl border bg-gray-50 hover:bg-gray-100"
                                aria-label="Close menu"
                            >
                                <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-800">
                                    <path
                                        fill="currentColor"
                                        d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div className="p-4 pb-24">
                            <div className="mb-2 text-xs font-semibold uppercase text-gray-500">
                                Menu
                            </div>
                            <MenuLinks onClick={closeDrawer} />
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 border-t bg-white p-4">
                            <Link
                                href={dashboardLink}
                                onClick={closeDrawer}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-red-700 px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                            >
                                Go to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}