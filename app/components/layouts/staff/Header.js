"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
    const firstName = "Staff"; // dummy
    const [open, setOpen] = useState(false);

    const closeDrawer = () => setOpen(false);
    const openDrawer = () => setOpen(true);

    // ESC to close (only when open)
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && closeDrawer();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    // prevent body scroll when drawer open
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    const MenuLinks = ({ onClick }) => (
        <ul className="flex flex-col gap-2 text-base font-bold text-gray-800">
            <li>
                <Link
                    className="block rounded-xl px-3 py-3 hover:bg-amber-50 hover:text-red-700"
                    href="/staff/dashboard"
                    onClick={onClick}
                >
                    Dashboard
                </Link>
            </li>
            <li>
                <Link
                    className="block rounded-xl px-3 py-3 hover:bg-amber-50 hover:text-red-700"
                    href="/staff/search-candidates"
                    onClick={onClick}
                >
                    Advance Search Candidates
                </Link>
            </li>
            <li>
                <Link
                    className="block rounded-xl px-3 py-3 hover:bg-amber-50 hover:text-red-700"
                    href="/staff/candidates"
                    onClick={onClick}
                >
                    Candidates
                </Link>
            </li>
            <li>
                <Link
                    className="block rounded-xl px-3 py-3 hover:bg-amber-50 hover:text-red-700"
                    href="/staff/client"
                    onClick={onClick}
                >
                    Clients
                </Link>
            </li>
            <li>
                <Link
                    className="block rounded-xl px-3 py-3 hover:bg-amber-50 hover:text-red-700"
                    href="/staff/profile"
                    onClick={onClick}
                >
                    Profile
                </Link>
            </li>
        </ul>
    );

    return (
        <header className="w-full border-b border-gray-200">
            <div className="flex items-center gap-3 px-4 py-3">
                {/* Left: profile + welcome */}
                <div className="flex items-center gap-3 shrink-0">
                    <img
                        src="https://i.pravatar.cc/80?img=12"
                        alt="Profile"
                        className="h-12 w-12 sm:h-16 sm:w-16 rounded-full object-cover"
                    />
                    <div className="leading-tight">
                        <div className="text-lg sm:text-xl text-gray-800">Welcome,</div>
                        <div className="text-sm sm:text-base text-red-700 font-semibold">
                            {firstName}
                        </div>
                    </div>
                </div>

                {/* ✅ Desktop menu (hidden on mobile) */}
                <nav className="flex-1 hidden md:flex justify-center ">
                    <ul className="flex items-center text-base font-bold text-gray-800 gap-6">
                        <li>
                            <Link
                                className="hover:underline hover:text-red-700"
                                href="/staff/dashboard"
                            >
                                Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="hover:underline hover:text-red-700"
                                href="/staff/search-candidates"
                            >
                                Advance Search Candidates
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="hover:underline hover:text-red-700"
                                href="/staff/candidates"
                            >
                                Candidates
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="hover:underline hover:text-red-700"
                                href="/staff/client"
                            >
                                Clients
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="hover:underline hover:text-red-700"
                                href="/staff/profile"
                            >
                                Profile
                            </Link>
                        </li>
                    </ul>
                </nav>

                {/* Right: logo + hamburger */}
                <div className="ml-auto flex items-center gap-2 shrink-0">
                    <Link
                        href="/staff/dashboard"
                        className="hidden sm:flex flex-col items-center"
                    >
                        <img
                            src="https://i.pravatar.cc/80?img=12"
                            alt="Logo"
                            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover"
                        />
                    </Link>

                    {/* ✅ Hamburger only on mobile + "Menu" text */}

                    <button
                        type="button"
                        onClick={openDrawer}
                        className="   md:hidden inline-flex items-center gap-2 rounded-xl   hover:bg-amber-50 px-3 py-2"
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

            {/* ✅ Updated Drawer block: only renders when open=true (plus pure CSS animation) */}
            {open && (
                <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
                    {/* Overlay (50% dark) */}
                    <div onClick={closeDrawer} className="absolute inset-0 bg-black/50" />

                    {/* Right slide panel */}
                    <div
                        id="mobile-drawer"
                        className="absolute top-0 right-0 h-full w-[85%] max-w-sm bg-white shadow-2xl border-l-4 border-red-700 animate-[slideIn_.25s_ease-out]"
                    >
                        {/* Drawer header + Close button */}
                        <div className="flex items-center justify-between px-4 py-4 border-b">
                            <div className="flex items-center gap-3">
                                <img
                                    src="https://i.pravatar.cc/80?img=12"
                                    alt="Profile"
                                    className="h-11 w-11 rounded-full object-cover"
                                />
                                <div className="leading-tight">
                                    <div className="text-sm text-gray-600">Signed in as</div>
                                    <div className="text-base font-bold text-red-700">
                                        {firstName}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={closeDrawer}
                                className="h-10 w-10 rounded-xl border bg-gray-50 hover:bg-gray-100 flex items-center justify-center"
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

                        {/* Menu */}
                        <div className="p-4">
                            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                Menu
                            </div>
                            <MenuLinks onClick={closeDrawer} />
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
                            <Link
                                href="/staff/dashboard"
                                onClick={closeDrawer}
                                className="w-full inline-flex items-center justify-center rounded-xl bg-red-700 text-white px-4 py-3 text-sm font-semibold hover:opacity-90"
                            >
                                Go to Dashboard
                            </Link>
                        </div>
                    </div>

                    {/* Pure CSS animation fallback (works even if Tailwind doesn't generate transform classes) */}
                    <style jsx global>{`
            @keyframes slideIn {
              from {
                transform: translateX(100%);
              }
              to {
                transform: translateX(0);
              }
            }
          `}</style>
                </div>
            )}
        </header>
    );
}