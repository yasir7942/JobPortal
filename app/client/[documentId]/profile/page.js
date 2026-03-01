"use client";

import React, { useMemo, useState, useEffect } from "react";
import Header from "@/app/components/layouts/client/Header";

// ✅ Full country list (search + select)
const COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
    "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
    "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
    "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)",
    "Costa Rica", "Côte d’Ivoire", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)", "Democratic Republic of the Congo",
    "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea",
    "Estonia", "Eswatini (fmr. Swaziland)", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany",
    "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland",
    "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
    "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
    "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
    "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (Burma)", "Namibia", "Nauru",
    "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman",
    "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa",
    "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia",
    "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname",
    "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago",
    "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
    "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

const isValidUrl = (value) => {
    if (!value) return true;
    try {
        const url = new URL(value.startsWith("http") ? value : `https://${value}`);
        return !!url.hostname;
    } catch {
        return false;
    }
};

const isValidPhone = (value) => {
    if (!value) return true;
    return /^[0-9+\-\s()]{7,20}$/.test(value.trim());
};

// ✅ adjust this mapper to your Strapi response structure
function normalizeProfileFromStrapi(raw) {
    // raw can be whatever your API returns (Strapi v4 usually: { data: { id, attributes: {...} } })
    // Make it safe:
    const p = raw?.data?.attributes ?? raw?.data ?? raw ?? {};

    return {
        companyName: p.companyName ?? "",
        ownerName: p.ownerName ?? "",
        country: p.country ?? "",
        address: p.address ?? "",
        phone: p.phone ?? "",
        website: p.website ?? "",
        city: p.city ?? "",
        username: p.username ?? "",
        loginEmail: p.loginEmail ?? p.email ?? "",
        contactList: Array.isArray(p.contactList) ? p.contactList : [],
    };
}

export default function ClientProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const [touched, setTouched] = useState({});

    const [form, setForm] = useState({
        companyName: "",
        ownerName: "",
        country: "",
        address: "",
        phone: "",
        website: "",
        city: "",
        username: "",
        loginEmail: "",
        password: "",
        retypePassword: "",
        contactList: [],
    });

    // ✅ Load profile from Strapi on page open
    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                setErrorMsg("");

                // TODO: Replace with your real endpoint that fetches logged-in client profile
                // Example (via Next API route): const res = await fetch("/api/client/profile", { cache: "no-store" });
                // Example (direct Strapi): const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/clients/me?populate=contactList`, { headers: {...} });

                // DEMO ONLY:
                const demo = {
                    data: {
                        attributes: {
                            companyName: "Atlantic Group LLC",
                            ownerName: "Yasir Aslam",
                            country: "United Arab Emirates",
                            address: "Office 12, Business Bay",
                            phone: "+971 50 123 4567",
                            website: "atlanticlubes.com",
                            city: "Dubai",
                            username: "atlantic-client",
                            loginEmail: "client@email.com",
                            contactList: [
                                { name: "Hassan Raza", designation: "HR Manager", phone: "+971 50 222 3333", remarks: "Primary contact" },
                            ],
                        },
                    },
                };

                const normalized = normalizeProfileFromStrapi(demo);

                if (!mounted) return;

                setForm((prev) => ({
                    ...prev,
                    ...normalized,
                    // important: password fields must always start empty
                    password: "",
                    retypePassword: "",
                }));
            } catch (err) {
                if (!mounted) return;
                setErrorMsg("Failed to load profile. Please refresh.");
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const onChange = (key, value) => {
        setForm((p) => ({ ...p, [key]: value }));
        setSuccessMsg("");
        setErrorMsg("");
    };

    const markTouched = (key) => setTouched((p) => ({ ...p, [key]: true }));

    const onContactChange = (idx, key, value) => {
        setForm((p) => {
            const next = [...(p.contactList || [])];
            next[idx] = { ...next[idx], [key]: value };
            return { ...p, contactList: next };
        });
        setSuccessMsg("");
        setErrorMsg("");
    };

    const addContact = () => {
        setForm((p) => ({
            ...p,
            contactList: [
                ...(p.contactList || []),
                { name: "", designation: "", phone: "", remarks: "" },
            ],
        }));
    };

    const removeContact = (idx) => {
        setForm((p) => {
            const next = [...(p.contactList || [])];
            next.splice(idx, 1);
            return { ...p, contactList: next };
        });
    };

    const validate = useMemo(() => {
        const e = {};

        if (!form.ownerName.trim()) e.ownerName = "Owner name is required.";
        if (!form.country.trim()) e.country = "Country is required.";
        if (form.country && !COUNTRIES.includes(form.country))
            e.country = "Please select a valid country from the list.";
        if (!form.city.trim()) e.city = "City is required.";
        if (!form.username.trim()) e.username = "Username is required.";
        if (form.username && form.username.trim().length < 3)
            e.username = "Username must be at least 3 characters.";

        if (form.website && !isValidUrl(form.website))
            e.website = "Website URL is not valid.";
        if (form.address && form.address.trim() && form.address.trim().length < 5)
            e.address = "Address looks too short.";
        if (form.phone && !isValidPhone(form.phone))
            e.phone = "Phone is invalid.";

        // ✅ password update only when BOTH fields filled
        const pass = form.password.trim();
        const repass = form.retypePassword.trim();
        if (pass || repass) {
            if (!pass) e.password = "Password is required.";
            if (!repass) e.retypePassword = "Retype password is required.";
            if (pass && pass.length < 8)
                e.password = "Password must be at least 8 characters.";
            if (pass && repass && pass !== repass)
                e.retypePassword = "Passwords do not match.";
        }

        // contacts: if row has anything, require name + phone
        const contactErrors = [];
        (form.contactList || []).forEach((c, idx) => {
            const any =
                c?.name?.trim() ||
                c?.designation?.trim() ||
                c?.phone?.trim() ||
                c?.remarks?.trim();

            if (!any) {
                contactErrors[idx] = null;
                return;
            }

            const ce = {};
            if (!c?.name?.trim()) ce.name = "Name is required.";
            if (!c?.phone?.trim()) ce.phone = "Phone is required.";
            if (c?.phone?.trim() && !isValidPhone(c.phone)) ce.phone = "Phone is invalid.";

            contactErrors[idx] = Object.keys(ce).length ? ce : null;
        });
        if (contactErrors.some(Boolean)) e.contactList = contactErrors;

        return e;
    }, [form]);

    const hasError = (key) => !!validate[key] && !!touched[key];
    const errorText = (key) => (touched[key] ? validate[key] : "");

    const contactListErrors =
        touched.contactList && Array.isArray(validate.contactList) ? validate.contactList : [];

    const submit = async (e) => {
        e.preventDefault();
        setSuccessMsg("");
        setErrorMsg("");

        setTouched((p) => ({
            ...p,
            ownerName: true,
            country: true,
            address: true,
            website: true,
            city: true,
            username: true,
            password: true,
            retypePassword: true,
            contactList: true,
        }));

        if (Object.keys(validate).length > 0) return;

        setSaving(true);
        try {
            // ✅ Build update payload
            // (companyName/phone/loginEmail are disabled, but we can still send them or ignore)
            const payload = {
                ownerName: form.ownerName.trim(),
                country: form.country.trim(),
                address: form.address.trim(),
                website: form.website.trim(),
                city: form.city.trim(),
                username: form.username.trim(),
                contactList: (form.contactList || [])
                    .map((c) => ({
                        name: c?.name?.trim(),
                        designation: c?.designation?.trim(),
                        phone: c?.phone?.trim(),
                        remarks: c?.remarks?.trim(),
                    }))
                    .filter((c) => c.name || c.designation || c.phone || c.remarks),
            };

            // ✅ only include password when BOTH typed
            if (form.password.trim() && form.retypePassword.trim()) {
                payload.password = form.password.trim();
            }

            // TODO: call your Strapi update endpoint
            // await fetch("/api/client/profile", {
            //   method: "PUT",
            //   headers: { "Content-Type": "application/json" },
            //   body: JSON.stringify(payload),
            // });

            console.log("UPDATE PAYLOAD:", payload);

            setSuccessMsg("Profile updated successfully.");
            setForm((p) => ({ ...p, password: "", retypePassword: "" }));
        } catch (err) {
            setErrorMsg("Failed to update profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Header />

            <div className="mt-10 px-6 py-5 border-b border-gray-300">
                <div className="font-bold text-3xl sm:text-5xl text-red-700">
                    Client Profile
                </div>
                <div className="text-sm text-gray-600 mt-1">
                    Update your company information and contacts.
                </div>
            </div>

            <form onSubmit={submit} className="w-full mx-auto p-4 space-y-6">
                {/* Loading */}
                {loading ? (
                    <div className="border border-gray-200 rounded-2xl p-6">
                        <div className="text-sm text-gray-600">Loading profile...</div>
                    </div>
                ) : (
                    <>
                        {/* Main card */}
                        <div className="border border-gray-200 rounded-2xl p-4 sm:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Company Name (disabled) */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Company Name
                                    </label>
                                    <input
                                        value={form.companyName}
                                        disabled
                                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                                    />
                                </div>

                                {/* Owner Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Owner Name <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        value={form.ownerName}
                                        onChange={(e) => onChange("ownerName", e.target.value)}
                                        onBlur={() => markTouched("ownerName")}
                                        className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${hasError("ownerName")
                                            ? "border-red-400 focus:ring-red-200"
                                            : "border-gray-300 focus:ring-red-200"
                                            }`}
                                    />
                                    {hasError("ownerName") && (
                                        <div className="text-xs text-red-600 mt-1">{errorText("ownerName")}</div>
                                    )}
                                </div>

                                {/* Country (search + select) */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Country <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        list="countries"
                                        value={form.country}
                                        onChange={(e) => onChange("country", e.target.value)}
                                        onBlur={() => markTouched("country")}
                                        className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${hasError("country")
                                            ? "border-red-400 focus:ring-red-200"
                                            : "border-gray-300 focus:ring-red-200"
                                            }`}
                                        placeholder="Start typing country name..."
                                    />
                                    <datalist id="countries">
                                        {COUNTRIES.map((c) => (
                                            <option value={c} key={c} />
                                        ))}
                                    </datalist>
                                    {hasError("country") && (
                                        <div className="text-xs text-red-600 mt-1">{errorText("country")}</div>
                                    )}
                                </div>

                                {/* City */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        City <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        value={form.city}
                                        onChange={(e) => onChange("city", e.target.value)}
                                        onBlur={() => markTouched("city")}
                                        className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${hasError("city")
                                            ? "border-red-400 focus:ring-red-200"
                                            : "border-gray-300 focus:ring-red-200"
                                            }`}
                                    />
                                    {hasError("city") && (
                                        <div className="text-xs text-red-600 mt-1">{errorText("city")}</div>
                                    )}
                                </div>

                                {/* Address */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Address
                                    </label>
                                    <textarea
                                        value={form.address}
                                        onChange={(e) => onChange("address", e.target.value)}
                                        onBlur={() => markTouched("address")}
                                        rows={3}
                                        className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${hasError("address")
                                            ? "border-red-400 focus:ring-red-200"
                                            : "border-gray-300 focus:ring-red-200"
                                            }`}
                                    />
                                    {hasError("address") && (
                                        <div className="text-xs text-red-600 mt-1">{errorText("address")}</div>
                                    )}
                                </div>

                                {/* Phone (disabled) */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Phone
                                    </label>
                                    <input
                                        value={form.phone}
                                        disabled
                                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                                    />
                                </div>

                                {/* Website */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Website
                                    </label>
                                    <input
                                        value={form.website}
                                        onChange={(e) => onChange("website", e.target.value)}
                                        onBlur={() => markTouched("website")}
                                        className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${hasError("website")
                                            ? "border-red-400 focus:ring-red-200"
                                            : "border-gray-300 focus:ring-red-200"
                                            }`}
                                        placeholder="example.com"
                                    />
                                    {hasError("website") && (
                                        <div className="text-xs text-red-600 mt-1">{errorText("website")}</div>
                                    )}
                                </div>

                                {/* Username */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Username <span className="text-red-600">*</span>
                                    </label>
                                    <input
                                        value={form.username}
                                        onChange={(e) => onChange("username", e.target.value)}
                                        onBlur={() => markTouched("username")}
                                        className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${hasError("username")
                                            ? "border-red-400 focus:ring-red-200"
                                            : "border-gray-300 focus:ring-red-200"
                                            }`}
                                    />
                                    {hasError("username") && (
                                        <div className="text-xs text-red-600 mt-1">{errorText("username")}</div>
                                    )}
                                </div>

                                {/* Login Email (disabled) */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Login Email
                                    </label>
                                    <input
                                        value={form.loginEmail}
                                        disabled
                                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contact List */}
                        <div className="border border-gray-200 rounded-2xl p-4 sm:p-6">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xl font-bold text-red-700">Contact List</div>
                                    <div className="text-sm text-gray-600">
                                        Add multiple contact persons (Name, Designation, Phone, Remarks).
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={addContact}
                                    className="shrink-0 rounded-full bg-red-700 text-white h-10 w-10 flex items-center justify-center hover:opacity-90"
                                    title="Add contact"
                                >
                                    +
                                </button>
                            </div>

                            {(form.contactList || []).length === 0 ? (
                                <div className="mt-4 text-sm text-gray-600">
                                    No contacts added yet. Click <b>+</b> to add.
                                </div>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {form.contactList.map((c, idx) => {
                                        const ce = contactListErrors?.[idx] || null;
                                        return (
                                            <div key={idx} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="text-sm font-semibold text-gray-800">
                                                        Contact #{idx + 1}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeContact(idx)}
                                                        className="text-sm rounded-lg border px-3 py-2 hover:bg-white"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>

                                                <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                            Name
                                                        </label>
                                                        <input
                                                            value={c?.name || ""}
                                                            onChange={(e) => onContactChange(idx, "name", e.target.value)}
                                                            className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${ce?.name
                                                                ? "border-red-400 focus:ring-red-200"
                                                                : "border-gray-300 focus:ring-red-200"
                                                                }`}
                                                        />
                                                        {ce?.name && <div className="text-xs text-red-600 mt-1">{ce.name}</div>}
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                            Designation
                                                        </label>
                                                        <input
                                                            value={c?.designation || ""}
                                                            onChange={(e) =>
                                                                onContactChange(idx, "designation", e.target.value)
                                                            }
                                                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                            Phone
                                                        </label>
                                                        <input
                                                            value={c?.phone || ""}
                                                            onChange={(e) => onContactChange(idx, "phone", e.target.value)}
                                                            className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${ce?.phone
                                                                ? "border-red-400 focus:ring-red-200"
                                                                : "border-gray-300 focus:ring-red-200"
                                                                }`}
                                                        />
                                                        {ce?.phone && <div className="text-xs text-red-600 mt-1">{ce.phone}</div>}
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                                                            Remarks
                                                        </label>
                                                        <input
                                                            value={c?.remarks || ""}
                                                            onChange={(e) => onContactChange(idx, "remarks", e.target.value)}
                                                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Password Change */}
                        <div className="border border-gray-200 rounded-2xl p-4 sm:p-6">
                            <div className="text-xl font-bold text-red-700">Change Password</div>
                            <div className="text-sm text-gray-600 mt-1">
                                Leave both fields empty if you don’t want to update password.
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => onChange("password", e.target.value)}
                                        onBlur={() => markTouched("password")}
                                        className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${hasError("password")
                                            ? "border-red-400 focus:ring-red-200"
                                            : "border-gray-300 focus:ring-red-200"
                                            }`}
                                        placeholder="Min 8 characters"
                                    />
                                    {hasError("password") && (
                                        <div className="text-xs text-red-600 mt-1">{errorText("password")}</div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Retype Password
                                    </label>
                                    <input
                                        type="password"
                                        value={form.retypePassword}
                                        onChange={(e) => onChange("retypePassword", e.target.value)}
                                        onBlur={() => markTouched("retypePassword")}
                                        className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${hasError("retypePassword")
                                            ? "border-red-400 focus:ring-red-200"
                                            : "border-gray-300 focus:ring-red-200"
                                            }`}
                                        placeholder="Retype password"
                                    />
                                    {hasError("retypePassword") && (
                                        <div className="text-xs text-red-600 mt-1">{errorText("retypePassword")}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                            <div className="text-sm">
                                {errorMsg ? (
                                    <span className="text-red-700 font-semibold">{errorMsg}</span>
                                ) : successMsg ? (
                                    <span className="text-green-700 font-semibold">{successMsg}</span>
                                ) : (
                                    <span className="text-gray-500">
                                        Fields marked <span className="text-red-600">*</span> are required.
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setForm((p) => ({ ...p, password: "", retypePassword: "" }))}
                                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                                >
                                    Clear Password Fields
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-xl bg-red-700 text-white px-5 py-2 text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </form>
        </>
    );
}