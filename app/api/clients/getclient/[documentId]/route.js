export const runtime = "nodejs";
import qs from "qs";

/* ----------------------------- helpers ---------------------------- */

function joinUrl(base, path) {
    const b = String(base || "").replace(/\/+$/, "");
    const p = String(path || "").replace(/^\/+/, "");
    return `${b}/${p}`;
}

async function readBodySafe(res) {
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return { raw: text };
    }
}

function normalizeStrapiMedia(media, STRAPI_BASE_URL) {
    const m = media?.data ?? media;
    const attrs = m?.attributes ?? m;

    const id = m?.id ?? null;
    const name = attrs?.name ?? "";
    const url = attrs?.url ?? "";

    // STRAPI_BASE_URL = http://127.0.0.1:1337/api
    const origin = String(STRAPI_BASE_URL || "").replace(/\/api\/?$/, "");

    const absUrl = url
        ? url.startsWith("http")
            ? url
            : joinUrl(origin, url)
        : "";

    return { id, name, url: absUrl };
}

function unwrapClient(parsed) {
    const rec = parsed?.data ?? null;
    if (!rec) return null;
    return rec?.attributes ? { id: rec.id, ...rec.attributes } : rec;
}

function getUserFromRelation(client) {
    // IMPORTANT: your relation field name
    const rel = client?.users_permissions_user;
    const d = rel?.data ?? rel;
    const attrs = d?.attributes ?? d;

    return {
        id: d?.id ?? null,
        username: attrs?.username ?? "",
        email: attrs?.email ?? "",
    };
}

function mapContacts(client) {
    // repeatable component already comes as array of objects
    const list = Array.isArray(client?.contactList) ? client.contactList : [];
    return list.map((c) => ({
        name: c?.name || "",
        designation: c?.designation || "",
        mobile: c?.mobile || "",
        remarks: c?.remarks || "",
    }));
}

/* ----------------------------- route ------------------------------ */

export async function GET(req, { params }) {
    const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL; // e.g. http://127.0.0.1:1337/api
    const RAW_TOKEN = String(process.env.STRAPI_TOKEN || "").trim();

    if (!STRAPI_BASE_URL || !RAW_TOKEN) {
        return Response.json(
            { ok: false, error: "Missing STRAPI_BASE_URL or STRAPI_TOKEN" },
            { status: 500 }
        );
    }

    const BEARER = RAW_TOKEN.toLowerCase().startsWith("bearer ")
        ? RAW_TOKEN
        : `Bearer ${RAW_TOKEN}`;

    async function strapiFetch(path, opts = {}) {
        const url = joinUrl(STRAPI_BASE_URL, path);
        const method = opts.method || "GET";
        const useAuth = opts.useAuth !== false;

        const headers = {
            ...(useAuth ? { Authorization: BEARER } : {}),
            ...(opts.headers || {}),
        };

        let body = opts.body;
        if (opts.json !== undefined) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(opts.json);
        }

        const res = await fetch(url, {
            method,
            headers,
            body,
            redirect: "manual",
            cache: "no-store",
        });

        if (res.status >= 300 && res.status < 400) {
            const loc = res.headers.get("location");
            const err = new Error(
                `Strapi redirect detected (${res.status}). Fix STRAPI_BASE_URL. location=${loc}`
            );
            err.status = 500;
            throw err;
        }

        const parsed = await readBodySafe(res);

        if (!res.ok) {
            console.log("STRAPI ERROR", {
                url,
                status: res.status,
                hasAuth: !!headers.Authorization,
                authPreview: headers.Authorization
                    ? headers.Authorization.slice(0, 18) + "..."
                    : null,
                bodyError: parsed,
            });

            const msg =
                parsed?.error?.message ||
                parsed?.message ||
                `Strapi error: ${res.status}`;
            const err = new Error(msg);
            err.details = parsed?.error || parsed;
            err.status = res.status;
            throw err;
        }

        return parsed;
    }

    try {
        const p = params ? await params : null; // ✅ await Promise (Next 15)
        const documentId = p?.documentId;

        if (!documentId) {
            return Response.json(
                { ok: false, error: "Missing documentId param" },
                { status: 400 }
            );
        }

        // Populate like getcandidate: media + relation user + component
        const query = qs.stringify(
            {
                populate: {
                    logo: true,
                    contactList: true,
                    users_permissions_user: true,
                },
            },
            { encodeValuesOnly: true }
        );

        const parsed = await strapiFetch(`clients/${documentId}?${query}`, {
            method: "GET",
            useAuth: true,
        });

        const client = unwrapClient(parsed);
        if (!client) {
            return Response.json(
                { ok: false, error: "Client not found", parsed },
                { status: 404 }
            );
        }

        const user = getUserFromRelation(client);

        const existingMedia = {
            logo: normalizeStrapiMedia(client?.logo, STRAPI_BASE_URL),
        };

        // form defaults for edit page (match your create page fields)
        const formDefaults = {
            companyName: client?.companyName || "",
            ownerName: client?.ownerName || "",
            city: client?.city || "",
            address: client?.address || "",
            phone: client?.phone || "",
            website: client?.website || "",

            countryList: client?.countryList || "",
            industriesList: client?.industriesList || "",
            companySizeList: client?.companySizeList || "",
            statusList: client?.statusList || "",

            shortDescription: client?.shortDescription || "",
            privateNote: client?.privateNote || "",

            logo: null,
            contactList: mapContacts(client),

            // account (from related user)
            username: user?.username || "",
            email: user?.email || "",

            // edit page keeps these empty
            password: "",
            retypePassword: "",
        };

        return Response.json(
            { ok: true, documentId, existingMedia, formDefaults, client: parsed },
            { status: 200 }
        );
    } catch (err) {
        return Response.json(
            {
                ok: false,
                error: err?.message || "Server error",
                details: err?.details || null,
            },
            { status: err?.status || 500 }
        );
    }
}