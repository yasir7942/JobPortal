"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/layouts/staff/Header";

// ✅ your existing component
import DocumentsFieldArray from "@/app/staff/ui/DocumentsFieldArray";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDropzone } from "react-dropzone";

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */
function isValidDateNotFuture(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    d.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return d <= now;
}
function isValidUrl(value) {
    if (!value) return true;
    try {
        const u = new URL(value);
        return !!u.hostname;
    } catch {
        return false;
    }
}
function fileExtOk(file, allowedExt) {
    const name = (file?.name || "").toLowerCase();
    return allowedExt.some((ext) => name.endsWith(ext));
}
function normalizePhone(value) {
    return String(value || "").trim();
}

/* ------------------------------------------------------------------ */
/* UI bits: Tooltip + Inputs */
/* ------------------------------------------------------------------ */
function InfoTip({ text }) {
    if (!text) return null;
    return (
        <span className="relative inline-flex items-center group">
            <svg
                className="h-4 w-4 text-gray-400 group-hover:text-gray-700"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <path
                    fill="currentColor"
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1Zm0-8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1Z"
                />
            </svg>

            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg opacity-0 group-hover:opacity-100 transition">
                {text}
            </span>
        </span>
    );
}

function Field({ label, hint, info, error, children }) {
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2">
                <div className="text-sm text-gray-700">{label}</div>
                <InfoTip text={info} />
            </div>
            {hint ? <div className="text-xs text-gray-500">{hint}</div> : null}
            {children}
            {error ? <div className="text-xs text-red-700">{error}</div> : null}
        </div>
    );
}

function Input(props) {
    return (
        <input
            {...props}
            className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-amber-200 ${props.disabled ? "opacity-60" : ""
                }`}
        />
    );
}
function Select({ children, ...props }) {
    return (
        <select
            {...props}
            className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-amber-200 ${props.disabled ? "opacity-60" : ""
                }`}
        >
            {children}
        </select>
    );
}
function Textarea(props) {
    return (
        <textarea
            {...props}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-amber-200"
        />
    );
}

function PasswordInput({ value, onChange, placeholder, error }) {
    const [show, setShow] = useState(false);
    return (
        <div className="space-y-1">
            <div className="relative">
                <input
                    type={show ? "text" : "password"}
                    value={value || ""}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2 pr-10 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-amber-200 ${error ? "border-red-400" : ""
                        }`}
                />
                <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-500 hover:text-gray-800"
                    title={show ? "Hide" : "Show"}
                >
                    {show ? (
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M12 6c5 0 9.27 3.11 11 6-1.73 2.89-6 6-11 6S2.73 14.89 1 12c1.73-2.89 6-6 11-6Zm0 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                            />
                        </svg>
                    ) : (
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M2.1 3.51 3.51 2.1 21.9 20.49 20.49 21.9l-3.1-3.1A12.9 12.9 0 0 1 12 20C7 20 2.73 16.89 1 14c.76-1.27 2.02-2.68 3.66-3.92L2.1 3.51ZM12 6c5 0 9.27 3.11 11 6-.62 1.04-1.56 2.16-2.78 3.21l-2.24-2.24A4 4 0 0 0 11.03 6.02L9.35 4.34A12.7 12.7 0 0 1 12 6Z"
                            />
                        </svg>
                    )}
                </button>
            </div>
            {error ? <div className="text-xs text-red-700">{error}</div> : null}
        </div>
    );
}

function DropzoneBox({ label, acceptText, multiple, value, onChange, error, info, hint }) {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        multiple,
        onDrop: (acceptedFiles) => {
            if (!multiple) onChange(acceptedFiles?.[0] || null);
            else onChange(acceptedFiles || []);
        },
    });

    const files = useMemo(() => {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
    }, [value]);

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2">
                <div className="text-sm text-gray-700">{label}</div>
                <InfoTip text={info} />
            </div>
            {hint ? <div className="text-xs text-gray-500">{hint}</div> : null}

            <div
                {...getRootProps()}
                className={`rounded-2xl border border-dashed px-4 py-4 text-sm cursor-pointer ${isDragActive ? "bg-amber-50 border-amber-300" : "bg-gray-50 border-gray-200"
                    }`}
            >
                <input {...getInputProps()} />
                <div className="text-gray-700">Click to add an asset or drag & drop</div>
                <div className="text-xs text-gray-500 mt-1">{acceptText}</div>

                <div className="mt-3 space-y-2">
                    {files.length === 0 ? (
                        <div className="text-xs text-gray-500">No file selected.</div>
                    ) : (
                        files.map((f, idx) => (
                            <div key={`${f.name}-${idx}`} className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                                <div className="text-xs text-gray-900 truncate">{f.name}</div>
                                <div className="text-xs text-gray-500">{Math.round((f.size || 0) / 1024)} KB</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {error ? <div className="text-xs text-red-700">{error}</div> : null}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Searchable Multi-Select for job_roles */
/* ------------------------------------------------------------------ */
function MultiSelectSearch({ label, info, hint, options, value, onChange, error }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");

    const selected = Array.isArray(value) ? value : [];

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return options;
        return options.filter((o) => String(o).toLowerCase().includes(s));
    }, [q, options]);

    function toggle(opt) {
        const exists = selected.includes(opt);
        const next = exists ? selected.filter((x) => x !== opt) : [...selected, opt];
        onChange(next);
    }

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2">
                <div className="text-sm text-gray-700">{label}</div>
                <InfoTip text={info} />
            </div>
            {hint ? <div className="text-xs text-gray-500">{hint}</div> : null}

            {/* selected chips */}
            <div className="flex flex-wrap gap-2">
                {selected.length === 0 ? (
                    <div className="text-xs text-gray-500">No role selected.</div>
                ) : (
                    selected.map((r) => (
                        <span
                            key={r}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-800"
                        >
                            {r}
                            <button
                                type="button"
                                className="text-gray-500 hover:text-gray-900"
                                onClick={() => onChange(selected.filter((x) => x !== r))}
                                title="Remove"
                            >
                                ✕
                            </button>
                        </span>
                    ))
                )}
            </div>

            <div className="relative">
                <button
                    type="button"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                    onClick={() => setOpen((s) => !s)}
                >
                    {open ? "Close roles list" : "Select job roles"}
                </button>

                {open && (
                    <div className="absolute z-40 mt-2 w-full rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                        <div className="p-3 border-b border-gray-200">
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search roles..."
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                            />
                            <div className="mt-2 flex items-center justify-between">
                                <div className="text-xs text-gray-500">{filtered.length} results</div>
                                <button
                                    type="button"
                                    className="text-xs text-red-700 hover:underline"
                                    onClick={() => onChange([])}
                                >
                                    Clear all
                                </button>
                            </div>
                        </div>

                        <div className="max-h-64 overflow-auto p-2">
                            {filtered.length === 0 ? (
                                <div className="p-3 text-sm text-gray-600">No roles found.</div>
                            ) : (
                                filtered.map((opt) => (
                                    <label key={opt} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(opt)}
                                            onChange={() => toggle(opt)}
                                            className="h-4 w-4"
                                        />
                                        <span className="text-sm text-gray-800">{opt}</span>
                                    </label>
                                ))
                            )}
                        </div>

                        <div className="p-2 border-t border-gray-200 bg-gray-50 flex justify-end">
                            <button
                                type="button"
                                className="rounded-xl bg-red-700 px-3 py-2 text-sm text-white hover:opacity-90"
                                onClick={() => setOpen(false)}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {error ? <div className="text-xs text-red-700">{error}</div> : null}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Schema (Strapi fields) */
/* ------------------------------------------------------------------ */
const CandidateCreateSchema = z
    .object({
        referenceNumber: z.string().optional(), // auto by Strapi

        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        fullName: z.string().min(1, "Full name is required"),

        gender: z.string().min(1, "Gender is required"),
        birthDate: z.string().min(1, "Birth date is required"),
        nationality: z.string().min(1, "Nationality is required"),
        maritalStatus: z.string().min(1, "Marital status is required"),
        seasonalStatus: z.string().min(1, "Seasonal status is required"),
        englishLevel: z.string().min(1, "English level is required"),

        mobile: z.string().min(7, "Mobile is too short").max(20, "Mobile is too long"),
        email: z.string().email("Invalid email"),

        jobStatus: z.string().min(1, "Job status is required"),
        job_roles: z.array(z.string()).min(1, "Select at least 1 job role"),

        isProfileVerified: z.boolean(),
        currentlyEmployed: z.boolean().default(false),

        numberOfExperience: z.coerce.number().min(0, "Must be 0 or more").optional(),
        shortSummary: z.string().max(250, "Max 250 characters").optional(),
        privateNotes: z.string().max(2000, "Max 2000 characters").optional(),

        // experience text fields (keep your Strapi names)
        currentJobExperiece: z.string().max(1200, "Max 1200 characters").optional(),
        previousJobExperiece: z.string().max(1200, "Max 1200 characters").optional(),
        previousCompany: z.string().max(120, "Max 120 characters").optional(),

        source: z.string().max(120, "Max 120 characters").optional(),

        // screening
        dateScreeningInterview: z.string().optional(),
        screeningVideoLink: z.string().optional(),

        // account
        username: z.string().min(3, "Username must be at least 3 characters"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        retypePassword: z.string().min(8, "Retype password is required"),

        // media
        profileImageFile: z.any().optional(),
        cvFile: z.any().optional(),
        passportFile: z.any().optional(),
        passportExpireDate: z.string().optional(),

        workingVideos: z.any().optional(), // multiple files
        miScreeningVideo: z.any().optional(), // single file

        // documents repeatable
        documents: z
            .array(
                z.object({
                    name: z.string().optional(),
                    remarks: z.string().max(200, "Max 200 characters").optional(),
                    file: z.any().optional(),
                    existingUrl: z.string().optional(),
                })
            )
            .default([]),
    })
    .superRefine((val, ctx) => {

        // Profile Image (optional) - image only
        if (val.profileImageFile && val.profileImageFile instanceof File) {
            if (!fileExtOk(val.profileImageFile, [".jpg", ".jpeg", ".png", ".webp"])) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["profileImageFile"],
                    message: "Profile image must be jpg/png/webp",
                });
            }
        }

        // birth date
        if (!isValidDateNotFuture(val.birthDate)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["birthDate"], message: "Invalid birth date" });
        }

        // password match
        if (val.password && val.retypePassword && val.password !== val.retypePassword) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["retypePassword"], message: "Passwords do not match" });
        }

        // screening link
        if (val.screeningVideoLink && !isValidUrl(val.screeningVideoLink)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["screeningVideoLink"],
                message: "Invalid URL (must include https://...)",
            });
        }

        // CV required (PDF or image)
        const cv = val.cvFile;
        if (!cv || !(cv instanceof File)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cvFile"], message: "CV is required" });
        } else if (!fileExtOk(cv, [".pdf", ".jpg", ".jpeg", ".png", ".webp"])) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["cvFile"],
                message: "CV must be PDF or image (jpg/png/webp)",
            });
        }

        // Passport required + expiry date
        const pass = val.passportFile;
        if (!pass || !(pass instanceof File)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["passportFile"], message: "Passport is required" });
        } else if (!fileExtOk(pass, [".pdf", ".jpg", ".jpeg", ".png", ".webp"])) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["passportFile"],
                message: "Passport must be PDF or image (jpg/png/webp)",
            });
        }
        if (!val.passportExpireDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["passportExpireDate"],
                message: "Passport expiry date is required",
            });
        }

        // workingVideos: optional but validate if selected
        const vids = val.workingVideos;
        if (Array.isArray(vids)) {
            vids.forEach((f, i) => {
                if (f instanceof File && !fileExtOk(f, [".mp4", ".mov", ".webm", ".mkv"])) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["workingVideos", i],
                        message: "Video must be mp4/mov/webm/mkv",
                    });
                }
            });
        }

        // miScreeningVideo optional validate if selected
        if (val.miScreeningVideo && val.miScreeningVideo instanceof File) {
            if (!fileExtOk(val.miScreeningVideo, [".mp4", ".mov", ".webm", ".mkv"])) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["miScreeningVideo"],
                    message: "Video must be mp4/mov/webm/mkv",
                });
            }
        }

        // documents: validate only if row has something
        (val.documents || []).forEach((d, i) => {
            const any = (d?.name || "").trim() || (d?.remarks || "").trim() || (d?.file instanceof File);
            if (!any) return;

            if (!d?.name || !String(d.name).trim()) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["documents", i, "name"], message: "Document name is required" });
            }
            if (!d?.file || !(d.file instanceof File)) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["documents", i, "file"], message: "Document file is required" });
            } else if (!fileExtOk(d.file, [".pdf", ".jpg", ".jpeg", ".png", ".webp"])) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["documents", i, "file"],
                    message: "Documents must be PDF or image files",
                });
            }
        });
    });

/* ------------------------------------------------------------------ */
/* Page */
/* ------------------------------------------------------------------ */
export default function NewCandidatePage() {
    // ✅ these should come from Strapi enums / API
    const [ENUMS, setENUMS] = useState({
        genders: ["Male", "Female", "Undisclosed"],
        nationalities: ["Pakistan", "UAE", "KSA", "India", "Bangladesh", "Philippines", "Egypt", "Other"],
        maritalStatus: ["Single", "Married", "Divorced", "Widowed"],
        seasonalStatus: ["Seasonal", "Permanent", "Any"],
        englishLevel: ["Average", "Basic", "Below Basic", "Excellent"],
        jobStatus: ["Available", "Working", "On Hold", "Blacklisted"],
        yesNo: [
            { label: "Yes", value: true },
            { label: "No", value: false },
        ],
    });

    // ✅ job roles should be fetched (too many)
    const [jobRoles, setJobRoles] = useState([
        "CNC Machine Operator",
        "Electrician",
        "Fabricator",
        "General Worker",
        "Car Mechanic",
        "Forklift Operator",
        "Welder",

    ]);

    // OPTIONAL: fetch real options (recommended)
    useEffect(() => {
        (async () => {
            try {
                // Example:
                // const res = await fetch("/api/meta/candidate", { cache: "no-store" });
                // const json = await res.json();
                // setENUMS(json.enums);
                // setJobRoles(json.jobRoles);
            } catch {
                // keep fallback
            }
        })();
    }, []);

    const [submitMsg, setSubmitMsg] = useState("");

    const {
        register,
        control,
        watch,
        setValue,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(CandidateCreateSchema),
        defaultValues: {
            referenceNumber: "",

            firstName: "",
            lastName: "",
            fullName: "",
            profileImageFile: null,
            gender: "",
            birthDate: "",
            nationality: "",
            maritalStatus: "",
            seasonalStatus: "",
            englishLevel: "",

            mobile: "",
            email: "",

            jobStatus: "",
            job_roles: [],

            isProfileVerified: false,
            currentlyEmployed: false,

            numberOfExperience: 0,
            shortSummary: "",
            privateNotes: "",

            currentJobExperiece: "",
            previousJobExperiece: "",
            previousCompany: "",

            source: "",

            dateScreeningInterview: "",
            screeningVideoLink: "",

            username: "",
            password: "",
            retypePassword: "",

            cvFile: null,
            passportFile: null,
            passportExpireDate: "",

            workingVideos: [],
            miScreeningVideo: null,

            documents: [],
        },
    });

    const firstName = watch("firstName");
    const lastName = watch("lastName");

    const profileImageFile = watch("profileImageFile");
    const profilePreview = useMemo(() => {
        if (profileImageFile && profileImageFile instanceof File) {
            return URL.createObjectURL(profileImageFile);
        }
        return ""; // no existing image in create
    }, [profileImageFile]);

    useEffect(() => {
        if (!(profileImageFile instanceof File)) return;
        const url = URL.createObjectURL(profileImageFile);
        return () => URL.revokeObjectURL(url);
    }, [profileImageFile]);


    // auto fullName
    useEffect(() => {
        const fn = `${firstName || ""} ${lastName || ""}`.trim();
        setValue("fullName", fn, { shouldValidate: true, shouldDirty: true });
    }, [firstName, lastName, setValue]);

    const onSubmit = async (data) => {
        setSubmitMsg("");
        // normalize phone (optional)
        data.mobile = normalizePhone(data.mobile);

        // ✅ When connecting to Strapi, use FormData for media upload
        console.log("Candidate payload:", data);
        setSubmitMsg("Candidate saved (dummy). Later connect to Strapi.");
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="mx-auto w-[95%] lg:w-[85%] px-2 sm:px-4 py-5">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <header className="border-b border-gray-200 bg-white px-4 py-4">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <div className="text-lg text-gray-900">Create Candidate</div>
                                <div className="text-sm text-gray-600">Sorted fields + tooltips + searchable job roles.</div>
                            </div>
                            <Link
                                href="/staff/candidates"
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Back
                            </Link>
                        </div>
                    </header>

                    <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-6">
                        {/* ------------------ TOP: Identity + Contact ------------------ */}
                        <div className="rounded-2xl border border-gray-200 p-4">
                            <div className="text-sm text-gray-900 font-semibold">Identity & Contact</div>
                            <div className="text-xs text-gray-600 mt-1">Start with required information for quick processing.</div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field
                                    label="Reference Number"
                                    hint="Auto-generated by Strapi"
                                    info="This is generated after saving the candidate."
                                >
                                    <Input {...register("referenceNumber")} disabled placeholder="Auto-generated" />
                                </Field>

                                <Field label="Full Name" hint="Auto from first + last" info="Full name is automatically created." error={errors.fullName?.message}>
                                    <Input {...register("fullName")} readOnly placeholder="Auto from first + last" />
                                </Field>

                                {/* Profile Image */}
                                <Controller
                                    control={control}
                                    name="profileImageFile"
                                    render={({ field }) => (
                                        <DropzoneBox
                                            label="Profile Image"
                                            acceptText="Accepted: .jpg, .png, .webp"
                                            multiple={false}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={errors.profileImageFile?.message}
                                        />
                                    )}
                                />

                                {profilePreview ? (
                                    <div className="rounded-2xl border border-gray-200 p-3 bg-gray-50">
                                        <div className="text-sm text-gray-800 mb-2">Preview</div>
                                        <img src={profilePreview} className="h-40 w-40 rounded-2xl object-cover border border-gray-200 bg-white" />
                                    </div>
                                ) : null}

                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="First Name" info="Candidate first name as per passport." error={errors.firstName?.message}>
                                    <Input {...register("firstName")} />
                                </Field>
                                <Field label="Last Name" info="Candidate last name as per passport." error={errors.lastName?.message}>
                                    <Input {...register("lastName")} />
                                </Field>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Field label="Gender" info="Enumeration from Strapi (Male/Female/Undisclosed)." error={errors.gender?.message}>
                                    <Select {...register("gender")}>
                                        <option value="">Choose here</option>
                                        {ENUMS.genders.map((g) => (
                                            <option key={g} value={g}>
                                                {g}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>

                                <Field label="Birth Date" info="Must not be in future." error={errors.birthDate?.message}>
                                    <Input {...register("birthDate")} type="date" />
                                </Field>

                                <Field label="Nationality" info="Enumeration from Strapi." error={errors.nationality?.message}>
                                    <Select {...register("nationality")}>
                                        <option value="">Choose here</option>
                                        {ENUMS.nationalities.map((n) => (
                                            <option key={n} value={n}>
                                                {n}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Mobile" info="Phone number 7–20 chars." error={errors.mobile?.message}>
                                    <Input {...register("mobile")} placeholder="+92 3xx xxxxxxx" />
                                </Field>

                                <Field label="Email" info="Candidate email for login/communication." error={errors.email?.message}>
                                    <Input {...register("email")} placeholder="name@email.com" />
                                </Field>
                            </div>
                        </div>

                        {/* ------------------ JOB / STATUS (important) ------------------ */}
                        <div className="rounded-2xl border border-gray-200 p-4">
                            <div className="text-sm text-gray-900 font-semibold">Job & Status</div>
                            <div className="text-xs text-gray-600 mt-1">Most-used screening fields for shortlisting.</div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Controller
                                    control={control}
                                    name="job_roles"
                                    render={({ field }) => (
                                        <MultiSelectSearch
                                            label="Job Roles"
                                            info="Search and select multiple roles (Strapi relation)."
                                            hint="Type to search roles. Select multiple."
                                            options={jobRoles}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={errors.job_roles?.message}
                                        />
                                    )}
                                />

                                <Field label="Job Status" info="Current candidate availability status." error={errors.jobStatus?.message}>
                                    <Select {...register("jobStatus")}>
                                        <option value="">Choose here</option>
                                        {ENUMS.jobStatus.map((x) => (
                                            <option key={x} value={x}>
                                                {x}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Field label="Marital Status" info="Enumeration from Strapi." error={errors.maritalStatus?.message}>
                                    <Select {...register("maritalStatus")}>
                                        <option value="">Choose here</option>
                                        {ENUMS.maritalStatus.map((x) => (
                                            <option key={x} value={x}>
                                                {x}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>

                                <Field label="Seasonal Status" info="Enumeration from Strapi." error={errors.seasonalStatus?.message}>
                                    <Select {...register("seasonalStatus")}>
                                        <option value="">Choose here</option>
                                        {ENUMS.seasonalStatus.map((x) => (
                                            <option key={x} value={x}>
                                                {x}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>

                                <Field label="English Level" info="Enumeration from Strapi." error={errors.englishLevel?.message}>
                                    <Select {...register("englishLevel")}>
                                        <option value="">Choose here</option>
                                        {ENUMS.englishLevel.map((x) => (
                                            <option key={x} value={x}>
                                                {x}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>

                                <Field label="Profile Verified" info="Set Yes only after document checks.">
                                    <Controller
                                        control={control}
                                        name="isProfileVerified"
                                        render={({ field }) => (
                                            <Select value={String(field.value)} onChange={(e) => field.onChange(e.target.value === "true")}>
                                                <option value="">Choose here</option>
                                                {ENUMS.yesNo.map((x) => (
                                                    <option key={x.label} value={String(x.value)}>
                                                        {x.label}
                                                    </option>
                                                ))}
                                            </Select>
                                        )}
                                    />
                                </Field>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Field label="Number of Experience (Years)" info="Total experience in years. (number field)" error={errors.numberOfExperience?.message}>
                                    <Input {...register("numberOfExperience")} type="number" min={0} step={1} />
                                </Field>

                                <Field label="Currently Employed" info="Yes if candidate is currently working.">
                                    <Controller
                                        control={control}
                                        name="currentlyEmployed"
                                        render={({ field }) => (
                                            <Select value={String(field.value)} onChange={(e) => field.onChange(e.target.value === "true")}>
                                                <option value="">Choose here</option>
                                                {ENUMS.yesNo.map((x) => (
                                                    <option key={x.label} value={String(x.value)}>
                                                        {x.label}
                                                    </option>
                                                ))}
                                            </Select>
                                        )}
                                    />
                                </Field>

                                <Field label="Source" info="Where did this candidate come from? (e.g. Facebook, Referral, Agency)" error={errors.source?.message}>
                                    <Input {...register("source")} placeholder="e.g. Facebook / Referral / Agency" />
                                </Field>
                            </div>
                        </div>

                        {/* ------------------ EXPERIENCE ------------------ */}
                        <div className="rounded-2xl border border-gray-200 p-4">
                            <div className="text-sm text-gray-900 font-semibold">Experience Details</div>
                            <div className="text-xs text-gray-600 mt-1">Useful for recruiters and screening.</div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Field label="Previous Company" info="Last company name (if any)." error={errors.previousCompany?.message}>
                                    <Input {...register("previousCompany")} placeholder="Company name" />
                                </Field>

                                <Field label="Current Job Experience" info="Short details about current job." error={errors.currentJobExperiece?.message}>
                                    <Input {...register("currentJobExperiece")} placeholder="e.g. 2 years CNC operator, machine model..." />
                                </Field>

                                <Field label="Previous Job Experience" info="Short details about previous jobs." error={errors.previousJobExperiece?.message}>
                                    <Input {...register("previousJobExperiece")} placeholder="e.g. 3 years electrician..." />
                                </Field>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Short Summary" info="Max 250 chars. Good for quick review." error={errors.shortSummary?.message}>
                                    <Input {...register("shortSummary")} placeholder="e.g. Ready to join, strong skills in..." />
                                </Field>

                                <Field label="Private Notes" info="Internal only (not for clients)."
                                    error={errors.privateNotes?.message}
                                >
                                    <Input {...register("privateNotes")} placeholder="Recruiter notes..." />
                                </Field>
                            </div>
                        </div>

                        {/* ------------------ DOCUMENTS & MEDIA ------------------ */}
                        <div className="rounded-2xl border border-gray-200 p-4">
                            <div className="text-sm text-gray-900 font-semibold">Documents & Media</div>
                            <div className="text-xs text-gray-600 mt-1">Upload required media. CV supports PDF/images.</div>

                            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <Controller
                                    control={control}
                                    name="cvFile"
                                    render={({ field }) => (
                                        <DropzoneBox
                                            label="CV (Required)"
                                            info="Strapi media: PDF or image."
                                            hint="Accepted: .pdf, .jpg, .png, .webp"
                                            acceptText="Accepted: .pdf, .jpg, .png, .webp"
                                            multiple={false}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={errors.cvFile?.message}
                                        />
                                    )}
                                />

                                <Controller
                                    control={control}
                                    name="passportFile"
                                    render={({ field }) => (
                                        <DropzoneBox
                                            label="Passport (Required)"
                                            info="Passport scan image or PDF."
                                            hint="Accepted: .pdf, .jpg, .png, .webp"
                                            acceptText="Accepted: .pdf, .jpg, .png, .webp"
                                            multiple={false}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={errors.passportFile?.message}
                                        />
                                    )}
                                />
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Passport Expiry Date" info="Required. Used for visa processing." error={errors.passportExpireDate?.message}>
                                    <Input {...register("passportExpireDate")} type="date" />
                                </Field>
                            </div>

                            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <Controller
                                    control={control}
                                    name="workingVideos"
                                    render={({ field }) => (
                                        <DropzoneBox
                                            label="Working Videos (Optional)"
                                            info="Upload multiple working videos (mp4/mov/webm/mkv)."
                                            hint="You can select multiple files."
                                            acceptText="Accepted: .mp4, .mov, .webm, .mkv"
                                            multiple={true}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={errors.workingVideos?.message}
                                        />
                                    )}
                                />

                                <Controller
                                    control={control}
                                    name="miScreeningVideo"
                                    render={({ field }) => (
                                        <DropzoneBox
                                            label="MI Screening Video (Optional)"
                                            info="Screening interview recording."
                                            acceptText="Accepted: .mp4, .mov, .webm, .mkv"
                                            multiple={false}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={errors.miScreeningVideo?.message}
                                        />
                                    )}
                                />
                            </div>

                            {/* ✅ Repeatable component documents */}
                            <div className="mt-4">
                                <DocumentsFieldArray control={control} register={register} errors={errors} name="documents" />
                            </div>
                        </div>

                        {/* ------------------ SCREENING ------------------ */}
                        <div className="rounded-2xl border border-gray-200 p-4">
                            <div className="text-sm text-gray-900 font-semibold">Screening</div>
                            <div className="text-xs text-gray-600 mt-1">Store interview date + optional link.</div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Screening Interview Date" info="Date of screening interview (optional)." error={errors.dateScreeningInterview?.message}>
                                    <Input {...register("dateScreeningInterview")} type="date" />
                                </Field>

                                <Field
                                    label="Screening Video Link (Optional)"
                                    info="Paste a full URL like https://drive.google.com/... or https://youtube.com/..."
                                    error={errors.screeningVideoLink?.message}
                                >
                                    <Input {...register("screeningVideoLink")} placeholder="https://..." />
                                </Field>
                            </div>
                        </div>

                        {/* ------------------ ACCOUNT (LOGIN) ------------------ */}
                        <div className="rounded-2xl border border-gray-200 p-4">
                            <div className="text-sm text-gray-900 font-semibold">Account</div>
                            <div className="text-xs text-gray-600 mt-1">Candidate login credentials.</div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Username" info="Login username (min 3 chars)." error={errors.username?.message}>
                                    <Input {...register("username")} />
                                </Field>

                                <Field label="Email" info="Login email." error={errors.email?.message}>
                                    <Input {...register("email")} />
                                </Field>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Password" info="Min 8 characters." error={errors.password?.message}>
                                    <Controller
                                        control={control}
                                        name="password"
                                        render={({ field }) => (
                                            <PasswordInput
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder="Min 8 characters"
                                                error={errors.password?.message}
                                            />
                                        )}
                                    />
                                </Field>

                                <Field label="Retype Password" info="Must match password." error={errors.retypePassword?.message}>
                                    <Controller
                                        control={control}
                                        name="retypePassword"
                                        render={({ field }) => (
                                            <PasswordInput
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder="Retype password"
                                                error={errors.retypePassword?.message}
                                            />
                                        )}
                                    />
                                </Field>
                            </div>
                        </div>

                        {/* ------------------ ACTIONS ------------------ */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                            <Link
                                href="/staff/candidates"
                                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-center"
                            >
                                Cancel
                            </Link>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="rounded-xl bg-red-700 px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
                            >
                                {isSubmitting ? "Saving..." : "Save Candidate"}
                            </button>
                        </div>

                        {submitMsg ? (
                            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                                {submitMsg}
                            </div>
                        ) : null}
                    </form>
                </div>
            </main>
        </div>
    );
}