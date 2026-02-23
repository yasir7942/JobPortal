"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/app/components/layouts/staff/Header";

/** ✅ Default logo (inline SVG as data-uri) */
const DEFAULT_LOGO =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
    <defs>
      <linearGradient id="g" x1="0" x2="1">
        <stop offset="0" stop-color="#f3f4f6"/>
        <stop offset="1" stop-color="#e5e7eb"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="150" cy="120" r="46" fill="#d1d5db"/>
    <rect x="70" y="185" width="160" height="26" rx="13" fill="#d1d5db"/>
    <text x="150" y="255" text-anchor="middle" font-family="Arial" font-size="18" fill="#6b7280">
      No Logo
    </text>
  </svg>
`);

/** Dummy clients (replace later with Strapi fetch) */
const DUMMY_CLIENTS = Array.from({ length: 35 }).map((_, i) => {
    const id = 2001 + i;

    const companies = [
        "Atlantic Group",
        "Chempol Chemicals",
        "BathStore.pk",
        "EngineMover",
        "Atlantic Oil Store",
        "Atlantic Perfumes",
        "Sailo Sanitary",
        "ArkVanity",
    ];

    const owners = ["Yasir Aslam", "Usman Ali", "Bilal Ahmed", "Sara Khan", "Omar Hassan", "Ayesha Malik"];
    const countries = ["Pakistan", "UAE", "KSA", "Canada", "Egypt"];
    const cities = ["Karachi", "Lahore", "Dubai", "Riyadh", "Toronto", "Cairo"];
    const statuses = ["Active", "Inactive", "Onboarded"];

    // Some clients have no logo (to test fallback)
    const logos = [
        "https://upload.wikimedia.org/wikipedia/commons/a/ab/Logo_TV_2015.png",
        "https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png",
        "", // missing
        null, // missing
        "https://invalid-domain-xyz123.com/logo.png", // broken
    ];

    const companyName = companies[i % companies.length] + " " + (i + 1);
    const ownerName = owners[i % owners.length];
    const country = countries[i % countries.length];
    const city = cities[i % cities.length];
    const status = statuses[i % statuses.length];

    const contactList = Array.from({ length: (i % 4) + 1 }).map((__, j) => ({
        name: ["Bilal Ahmed", "Sara Khan", "Zain Ali", "Hina Noor"][j % 4],
        designation: ["HR Manager", "Operations", "Procurement", "Accounts"][j % 4],
        mobile: `+92 3${(i % 10) + 1}${j} ${1000000 + i + j}`,
        remarks: j === 0 ? "Primary contact" : "Secondary contact",
    }));

    return {
        id,
        logo: logos[i % logos.length],
        companyName,
        ownerName,
        country,
        city,
        address: `Street ${i + 1}, Block ${(i % 10) + 1}`,
        phone: `+92 30${(i % 10) + 1} ${1000000 + i}`,
        website: i % 3 === 0 ? "https://example.com" : "",
        email: `client${id}@example.com`,
        username: `client.${id}`,
        status,
        contactList,
    };
});

function StatusPill({ status }) {
    const s = (status || "").toLowerCase();
    const cls =
        s === "active"
            ? "border-green-200 bg-green-50 text-green-700"
            : s === "inactive"
                ? "border-gray-200 bg-gray-50 text-gray-700"
                : s === "onboarded"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-gray-50 text-gray-700";

    return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${cls}`}>{status || "—"}</span>;
}

function InfoChip({ label, value }) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700">
            <span className="text-gray-600">{label}</span>
            <span className="text-gray-900">{value}</span>
        </span>
    );
}

function getLogoSrc(logo) {
    const s = (logo || "").trim();
    return s ? s : DEFAULT_LOGO;
}

export default function ClientsPage() {
    const [allClients] = useState(DUMMY_CLIENTS);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 12;

    const [selectedClient, setSelectedClient] = useState(null);

    // ✅ Hover preview (fixed, high z-index, not clipped)
    const [hover, setHover] = useState({ show: false, x: 0, y: 0, client: null });

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return allClients;

        return allClients.filter((c) => {
            const hay = [
                c.companyName,
                c.ownerName,
                c.country,
                c.city,
                c.status,
                c.phone,
                c.email,
                c.username,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return hay.includes(q);
        });
    }, [search, allClients]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const rows = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    useEffect(() => {
        if (page > pageCount) setPage(1);
    }, [page, pageCount]);

    function openClient(c) {
        setSelectedClient(c);
    }

    function closeClient() {
        setSelectedClient(null);
    }

    // ESC to close popup
    useEffect(() => {
        if (!selectedClient) return;
        const onKey = (e) => e.key === "Escape" && closeClient();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selectedClient]);

    // body scroll lock when popup open
    useEffect(() => {
        if (!selectedClient) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => (document.body.style.overflow = prev);
    }, [selectedClient]);

    // Hover helpers
    function onLogoEnter(e, c) {
        setHover({ show: true, x: e.clientX, y: e.clientY, client: c });
    }
    function onLogoMove(e) {
        if (!hover.show) return;
        setHover((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
    }
    function onLogoLeave() {
        setHover({ show: false, x: 0, y: 0, client: null });
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <div className="mt-10 p-6 font-bold text-3xl sm:text-5xl text-red-700 border-b border-gray-300">
                Clients
            </div>

            <main className="mt-10 mx-auto w-[95%] lg:w-[90%] px-2 sm:px-4 py-5">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    {/* header */}
                    <header className="border-b border-gray-200 bg-white px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="text-lg text-gray-900">Clients</div>
                                <div className="text-sm text-gray-600">Dummy data for now. Later connect Strapi.</div>
                            </div>

                            <div className="flex w-full sm:w-auto items-center gap-2 sm:justify-end">
                                <Link
                                    href="/staff/search-clients"
                                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                                >
                                    Advanced Search
                                </Link>

                                <div className="relative w-full sm:w-72">
                                    <input
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Search in table..."
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 pr-10 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-amber-200"
                                    />
                                    <span className="pointer-events-none absolute right-3 top-2.5 text-gray-400">⌕</span>
                                </div>

                                <Link
                                    href="/staff/client/new"
                                    className="rounded-xl bg-red-700 px-3 py-2 text-sm text-white hover:opacity-90 whitespace-nowrap"
                                >
                                    + Create New
                                </Link>
                            </div>
                        </div>
                    </header>

                    {/* table */}
                    <div className="w-full overflow-x-auto">
                        <table className="min-w-[1250px] w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr className="text-xs uppercase text-gray-600">
                                    <th className="px-3 py-2">Logo</th>
                                    <th className="px-3 py-2">Company</th>
                                    <th className="px-3 py-2">Owner</th>
                                    <th className="px-3 py-2">Country</th>
                                    <th className="px-3 py-2">City</th>
                                    <th className="px-3 py-2">Contacts</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-3 py-6 text-sm text-gray-600">
                                            No clients found.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((c) => (
                                        <tr key={c.id} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="px-3 py-2">
                                                <img
                                                    src={getLogoSrc(c.logo)}
                                                    alt={c.companyName}
                                                    className="h-9 w-9 rounded-xl object-cover border border-gray-200 bg-white"
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = DEFAULT_LOGO;
                                                    }}
                                                    onMouseEnter={(e) => onLogoEnter(e, c)}
                                                    onMouseMove={onLogoMove}
                                                    onMouseLeave={onLogoLeave}
                                                />
                                            </td>

                                            <td className="px-3 py-2 text-sm text-gray-900">
                                                {c.companyName}
                                                <div className="text-xs text-gray-500">{c.email}</div>
                                            </td>

                                            <td className="px-3 py-2 text-sm text-gray-800">{c.ownerName}</td>

                                            <td className="px-3 py-2 text-sm text-gray-800">{c.country}</td>

                                            <td className="px-3 py-2 text-sm text-gray-800">{c.city}</td>

                                            <td className="px-3 py-2 text-sm text-gray-900">
                                                {c.contactList?.length || 0}
                                            </td>

                                            <td className="px-3 py-2">
                                                <StatusPill status={c.status} />
                                            </td>

                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openClient(c)}
                                                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                                    >
                                                        View
                                                    </button>

                                                    <Link
                                                        href={`/staff/client/${c.id}/`}
                                                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                                    >
                                                        Edit
                                                    </Link>
                                                    <Link
                                                        href={`/client/jobs/${c.id}/`}
                                                        className="rounded-lg border border-red-600 bg-white px-6 py-1.5 text-sm text-gray-700 hover:text-white hover:bg-red-600"
                                                    >
                                                        Jobs
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* pagination */}
                    <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3">
                        <div className="text-sm text-gray-600">
                            Page {page} of {pageCount}
                            <span className="ml-2 text-xs text-gray-500">({filtered.length} clients)</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            >
                                Prev
                            </button>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                disabled={page >= pageCount}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* ✅ Hover Preview */}
                {hover.show && hover.client && (
                    <div
                        style={{
                            position: "fixed",
                            left: Math.min(hover.x + 18, window.innerWidth - 260),
                            top: Math.min(hover.y - 80, window.innerHeight - 260),
                            zIndex: 9999,
                            width: 240,
                            pointerEvents: "none",
                        }}
                    >
                        <div
                            style={{
                                background: "white",
                                border: "1px solid rgba(0,0,0,0.12)",
                                borderRadius: 16,
                                boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
                                padding: 10,
                            }}
                        >
                            <img
                                src={getLogoSrc(hover.client.logo)}
                                alt={hover.client.companyName}
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = DEFAULT_LOGO;
                                }}
                                style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 14 }}
                            />
                            <div style={{ marginTop: 8, fontSize: 12, color: "#111827" }}>{hover.client.companyName}</div>
                            <div style={{ fontSize: 12, color: "#6B7280" }}>{hover.client.country} • {hover.client.city}</div>
                        </div>
                    </div>
                )}

                {/* ✅ Client Popup */}
                {selectedClient && (
                    <div
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                        role="dialog"
                        aria-modal="true"
                        onMouseDown={(e) => {
                            if (e.target === e.currentTarget) closeClient();
                        }}
                    >
                        <div className="absolute inset-0 bg-black/50" />

                        <div className="relative w-full sm:max-w-5xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
                            {/* Top bar */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-lg sm:text-xl truncate">Client Profile</div>
                                    <div className="text-sm text-gray-600 truncate">
                                        {selectedClient.companyName} • ID: {selectedClient.id}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/staff/client/${selectedClient.id}/`}
                                        className="rounded-lg bg-red-700 text-white px-3 py-2 text-sm hover:opacity-90"
                                        onClick={closeClient}
                                    >
                                        Edit Client
                                    </Link>

                                    <button
                                        onClick={closeClient}
                                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                        type="button"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                            {/* Client header */}
                            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <img
                                        src={getLogoSrc(selectedClient.logo)}
                                        alt={selectedClient.companyName}
                                        className="h-24 w-24 rounded-2xl object-cover border border-gray-200 bg-white"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = DEFAULT_LOGO;
                                        }}
                                    />
                                    <div>
                                        <div className="text-xl text-red-700">{selectedClient.companyName}</div>
                                        <div className="text-sm text-gray-600">
                                            Owner: {selectedClient.ownerName} • {selectedClient.country}, {selectedClient.city}
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <InfoChip label="Contacts:" value={selectedClient.contactList?.length || 0} />
                                            <InfoChip label="Status:" value={selectedClient.status || "—"} />
                                        </div>
                                    </div>
                                </div>

                                <div className="sm:ml-auto">
                                    <StatusPill status={selectedClient.status} />
                                </div>
                            </div>

                            {/* Info */}
                            <div className="mt-4 rounded-xl border border-gray-200 p-3">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {[
                                        ["Company", selectedClient.companyName],
                                        ["Owner", selectedClient.ownerName],
                                        ["Email", selectedClient.email],
                                        ["Phone", selectedClient.phone],
                                        ["Website", selectedClient.website || "—"],
                                        ["Country", selectedClient.country],
                                        ["City", selectedClient.city],
                                        ["Username", selectedClient.username],
                                    ].map(([k, v]) => (
                                        <div className="text-xs" key={k}>
                                            <div className="text-gray-500">{k}</div>
                                            <div className="text-gray-800 break-words">
                                                {k === "Website" && v !== "—" ? (
                                                    <a className="text-blue-600 hover:underline" href={v} target="_blank" rel="noreferrer">
                                                        {v}
                                                    </a>
                                                ) : (
                                                    v || "—"
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-3 text-xs">
                                    <div className="text-gray-500">Address</div>
                                    <div className="text-gray-800">{selectedClient.address || "—"}</div>
                                </div>
                            </div>

                            {/* Contact List */}
                            <div className="mt-4 rounded-xl border border-gray-200 p-3">
                                <div className="text-sm text-gray-800">
                                    Contact List ({selectedClient.contactList?.length || 0})
                                </div>

                                <div className="mt-3 space-y-2">
                                    {(selectedClient.contactList || []).map((d, idx) => (
                                        <div
                                            key={idx}
                                            className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex flex-col sm:flex-row sm:items-center gap-2"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-gray-800 truncate">{d.name}</div>
                                                <div className="text-xs text-gray-600">
                                                    Designation: <span className="text-gray-800">{d.designation || "—"}</span>
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    Mobile: <span className="text-gray-800">{d.mobile || "—"}</span>
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    Remarks: <span className="text-gray-800">{d.remarks || "—"}</span>
                                                </div>
                                            </div>

                                            <a
                                                href={d.mobile ? `tel:${String(d.mobile).replace(/\s+/g, "")}` : "#"}
                                                className="w-full sm:w-auto text-center rounded-lg bg-gray-900 text-white px-3 py-2 text-sm hover:opacity-90"
                                                onClick={(e) => {
                                                    if (!d.mobile) e.preventDefault();
                                                }}
                                            >
                                                Call
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={closeClient}
                                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    type="button"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}