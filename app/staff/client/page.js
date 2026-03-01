"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/app/components/layouts/staff/Header";

/* ✅ Default logo fallback */
const DEFAULT_LOGO =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <rect x="70" y="90" width="160" height="120" rx="18" fill="#d1d5db"/>
    <text x="150" y="235" text-anchor="middle" font-family="Arial" font-size="18" fill="#6b7280">
      Logo
    </text>
  </svg>
`);

function safeImgSrc(src) {
    const s = (src || "").trim();
    return s ? s : DEFAULT_LOGO;
}

async function fetchJsonSafe(url) {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    let json;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        throw new Error(
            `API returned non-JSON (status ${res.status}). First bytes: ${text.slice(0, 80)}`
        );
    }
    if (!res.ok || json?.ok === false)
        throw new Error(json?.error || `Request failed (${res.status})`);
    return json;
}

function StatusPill({ status }) {
    const s = (status || "").toLowerCase();
    const cls =
        s === "active"
            ? "border-green-200 bg-green-50 text-green-700"
            : s === "inactive"
                ? "border-gray-200 bg-gray-50 text-gray-700"
                : s === "blocked"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-gray-200 bg-gray-50 text-gray-700";

    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${cls}`}>
            {status || "—"}
        </span>
    );
}

function InfoChip({ label, value }) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700">
            <span className="text-gray-800">{label}</span>
            <span className="text-gray-900">{value}</span>
        </span>
    );
}

export default function ClientsPage() {
    const pageSize = 15;

    const [search, setSearch] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [page, setPage] = useState(1);

    const [rows, setRows] = useState([]);
    const [pageCount, setPageCount] = useState(1);
    const [total, setTotal] = useState(0);

    const [loadingTable, setLoadingTable] = useState(true);
    const [tableError, setTableError] = useState("");

    // View modal
    const [selected, setSelected] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");
    const [detail, setDetail] = useState(null);

    // Debounce search (same as candidates)
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(search.trim()), 350);
        return () => clearTimeout(t);
    }, [search]);

    async function loadClients(nextPage = page, q = debouncedQ) {
        setLoadingTable(true);
        setTableError("");
        try {
            const url = `/api/clients/list?page=${nextPage}&pageSize=${pageSize}&q=${encodeURIComponent(
                q || ""
            )}`;
            const json = await fetchJsonSafe(url);
            setRows(Array.isArray(json.items) ? json.items : []);
            setPageCount(Number(json.pageCount || 1));
            setTotal(Number(json.total || 0));
        } catch (e) {
            setTableError(e?.message || "Failed to load clients");
            setRows([]);
            setPageCount(1);
            setTotal(0);
        } finally {
            setLoadingTable(false);
        }
    }

    // Load table (server-side pagination)
    useEffect(() => {
        loadClients(page, debouncedQ);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, debouncedQ]);

    function closeModal() {
        setSelected(null);
        setDetail(null);
        setDetailError("");
        setDetailLoading(false);
    }

    // ESC to close modal
    useEffect(() => {
        if (!selected) return;
        const onKey = (e) => e.key === "Escape" && closeModal();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selected]);

    // body scroll lock
    useEffect(() => {
        if (!selected) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => (document.body.style.overflow = prev);
    }, [selected]);

    async function openClient(row) {
        setSelected(row);
        setDetail(null);
        setDetailError("");
        setDetailLoading(true);

        try {
            // You already created getclient route earlier:
            const json = await fetchJsonSafe(`/api/clients/getclient/${row.documentId}`);
            setDetail(json);
        } catch (e) {
            setDetailError(e?.message || "Failed to load client details");
        } finally {
            setDetailLoading(false);
        }
    }

    const headerText = useMemo(() => {
        const q = (debouncedQ || "").trim();
        if (!q) return `(${total} clients)`;
        return `(${total} results for "${q}")`;
    }, [debouncedQ, total]);

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <div className="mt-2 p-6 font-bold text-2xl sm:text-3xl text-red-700 border-b border-gray-300">
                Clients
            </div>

            <main className="mt-10 mx-auto w-[95%] lg:w-[90%] px-2 sm:px-4 py-5">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <header className="border-b border-gray-200 bg-white px-4 py-4 ">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between  ">
                            <div>
                                <div className="text-lg text-gray-900">Clients</div>
                                <div className="text-sm text-gray-800">{headerText}</div>
                            </div>

                            <div className="flex w-full sm:w-auto items-center gap-2 sm:justify-end  ">
                                <div className="relative w-full sm:w-lg">
                                    <input
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Search (company/phone/email/country/status)..."
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 pr-10 text-sm text-gray-800 outline-none  focus:border-red-200 focus:ring-2 focus:ring-red-300"
                                    />
                                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 text-2xl">
                                        ⌕
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => loadClients(page, debouncedQ)}
                                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                                    title="Reload from DB"
                                >
                                    Refresh
                                </button>

                                <Link
                                    href="/staff/client/new"
                                    className="rounded-xl bg-red-700 px-3 py-2 text-sm text-white hover:opacity-90 whitespace-nowrap"
                                >
                                    + Create New
                                </Link>
                            </div>
                        </div>
                    </header>

                    {/* TABLE */}
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr className="text-xs uppercase text-gray-800">
                                    <th className="px-3 py-2">Id</th>
                                    <th className="px-3 py-2">Logo</th>
                                    <th className="px-3 py-2">Company</th>
                                    <th className="px-3 py-2">Phone</th>
                                    <th className="px-3 py-2">Country</th>
                                    <th className="px-3 py-2">Industry</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2">Account</th>
                                    <th className="px-3 py-2">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loadingTable ? (
                                    <tr>
                                        <td colSpan={9} className="px-3 py-6 text-sm text-gray-800">
                                            Loading clients...
                                        </td>
                                    </tr>
                                ) : tableError ? (
                                    <tr>
                                        <td colSpan={9} className="px-3 py-6 text-sm text-red-700">
                                            {tableError}
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-3 py-6 text-sm text-gray-800">
                                            No clients found.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((c) => (
                                        <tr
                                            key={c.documentId || c.id}
                                            className="border-b border-gray-200 hover:bg-gray-50"
                                        >
                                            <td className="px-3 py-2">{c.id}</td>

                                            <td className="px-3 py-2">
                                                <img
                                                    src={safeImgSrc(c.logoUrl)}
                                                    alt={c.companyName}
                                                    className="h-9 w-9 rounded-xl object-cover border border-gray-200 bg-white"
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = DEFAULT_LOGO;
                                                    }}
                                                />
                                            </td>

                                            <td className="px-3 py-2 text-sm text-gray-900">
                                                {c.companyName || "—"}
                                                <div className="text-xs text-gray-500">{c.city || "—"}</div>
                                            </td>

                                            <td className="px-3 py-2 text-sm text-gray-800">{c.phone || "—"}</td>
                                            <td className="px-3 py-2 text-sm text-gray-800">
                                                {c.countryList || "—"}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-gray-800">
                                                {c.industriesList || "—"}
                                            </td>

                                            <td className="px-3 py-2">
                                                <StatusPill status={c.statusList} />
                                            </td>

                                            <td className="px-3 py-2 text-sm text-gray-900">
                                                {c.username || "—"}
                                                <div className="text-xs text-gray-500">{c.email || "—"}</div>
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
                                                        href={`/staff/client/${c.documentId}/`}
                                                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                                    >
                                                        Edit
                                                    </Link>
                                                    <Link
                                                        href={`/client/${c.documentId}/dashboard`}
                                                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-gray-50"
                                                    >
                                                        Client Dashboard
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
                        <div className="text-sm text-gray-800">
                            Page {page} of {pageCount}
                            <span className="ml-2 text-xs text-gray-500">({total} clients)</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1 || loadingTable}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            >
                                Prev
                            </button>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                disabled={page >= pageCount || loadingTable}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* VIEW MODAL */}
                {selected && (
                    <div
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                        role="dialog"
                        aria-modal="true"
                        onMouseDown={(e) => {
                            if (e.target === e.currentTarget) closeModal();
                        }}
                    >
                        <div className="absolute inset-0 bg-black/50" />

                        <div className="relative w-full sm:max-w-5xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-lg sm:text-xl truncate">Client Profile</div>
                                    <div className="text-sm text-gray-800 truncate">
                                        {selected.companyName || "—"}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/staff/client/${selected.documentId}/`}
                                        className="rounded-lg bg-red-700 text-white px-3 py-2 text-sm hover:opacity-90"
                                        onClick={closeModal}
                                    >
                                        Edit Client
                                    </Link>

                                    <Link
                                        href={`/client/${selected.documentId}/dashboard`}
                                        className="rounded-lg bg-red-700 text-white px-3 py-2 text-sm hover:opacity-90"
                                        onClick={closeModal}
                                    >
                                        Client Dashboard
                                    </Link>

                                    <button
                                        onClick={closeModal}
                                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                        type="button"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                            {detailLoading ? (
                                <div className="mt-4 rounded-xl border border-gray-300 p-4 text-sm text-gray-700">
                                    Loading details...
                                </div>
                            ) : detailError ? (
                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                    {detailError}
                                </div>
                            ) : (
                                <>
                                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={safeImgSrc(detail?.existingMedia?.logo?.url || selected.logoUrl)}
                                                alt={selected.companyName}
                                                className="h-24 w-24 rounded-2xl object-cover border border-gray-200 bg-white"
                                                onError={(e) => {
                                                    e.currentTarget.onerror = null;
                                                    e.currentTarget.src = DEFAULT_LOGO;
                                                }}
                                            />
                                            <div>
                                                <div className="text-xl text-red-700">
                                                    {detail?.formDefaults?.companyName || selected.companyName}
                                                </div>
                                                <div className="text-sm text-gray-800">
                                                    {detail?.formDefaults?.city || selected.city || "—"} •{" "}
                                                    <span className="font-medium">
                                                        {detail?.formDefaults?.statusList || selected.statusList || "—"}
                                                    </span>
                                                </div>

                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <InfoChip label="Country:" value={detail?.formDefaults?.countryList || "—"} />
                                                    <InfoChip label="Industry:" value={detail?.formDefaults?.industriesList || "—"} />
                                                    <InfoChip label="Size:" value={detail?.formDefaults?.companySizeList || "—"} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="sm:ml-auto">
                                            <StatusPill status={detail?.formDefaults?.statusList || selected.statusList} />
                                        </div>
                                    </div>

                                    {/* Details grid */}
                                    <div className="mt-4 rounded-xl border border-gray-300 p-3">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                            {[
                                                ["Owner", detail?.formDefaults?.ownerName],
                                                ["Phone", detail?.formDefaults?.phone],
                                                ["Website", detail?.formDefaults?.website],
                                                ["City", detail?.formDefaults?.city],
                                                ["Country", detail?.formDefaults?.countryList],
                                                ["Industry", detail?.formDefaults?.industriesList],
                                                ["Company Size", detail?.formDefaults?.companySizeList],
                                                ["Status", detail?.formDefaults?.statusList],
                                                ["Username", detail?.formDefaults?.username],
                                                ["Email", detail?.formDefaults?.email],
                                            ].map(([k, v]) => (
                                                <div className="text-sm" key={k}>
                                                    <div className="text-gray-700">{k}</div>
                                                    <div className="text-gray-800 break-words">{v || "—"}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <div className="text-sm">
                                                <div className="text-gray-700">Short Description</div>
                                                <div className="text-gray-800">
                                                    {detail?.formDefaults?.shortDescription || "—"}
                                                </div>
                                            </div>
                                            <div className="text-sm">
                                                <div className="text-gray-700">Private Note</div>
                                                <div className="text-gray-800">
                                                    {detail?.formDefaults?.privateNote || "—"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contacts */}
                                    <div className="mt-4 rounded-xl border border-gray-300 p-3">
                                        <div className="text-sm text-gray-800">
                                            Contacts ({detail?.formDefaults?.contactList?.length || 0})
                                        </div>

                                        <div className="mt-3 space-y-2">
                                            {(detail?.formDefaults?.contactList || []).map((c, idx) => (
                                                <div
                                                    key={idx}
                                                    className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex flex-col sm:flex-row sm:items-center gap-2"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm text-gray-800 truncate">{c.name || "—"}</div>
                                                        <div className="text-xs text-gray-700">
                                                            {c.designation || "—"} • {c.mobile || "—"}
                                                        </div>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            Remarks: {c.remarks || "—"}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(detail?.formDefaults?.contactList || []).length === 0 ? (
                                                <div className="text-xs text-gray-500">No contacts</div>
                                            ) : null}
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={closeModal}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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