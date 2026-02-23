"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Header from "@/app/components/layouts/staff/Header";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDropzone } from "react-dropzone";

// ✅ reuse your existing docs field array (optional docs for client)
import DocumentsFieldArray from "@/app/staff/ui/DocumentsFieldArray";

// ✅ new: client contacts field array
import ContactListFieldArray from "../../ui/ContactListFieldArray";

/* ------------------------- Options (dummy) ------------------------- */
const COUNTRIES = ["Pakistan", "UAE", "KSA", "Canada", "Egypt", "Other"];

/* ------------------------- Helpers ------------------------- */
function fileExtOk(file, allowedExt) {
    const name = (file?.name || "").toLowerCase();
    return allowedExt.some((ext) => name.endsWith(ext));
}

/* ------------------------- Zod Schema ------------------------- */
const ClientSchema = z
    .object({
        companyName: z.string().min(2, "Company name is required"),
        ownerName: z.string().min(2, "Owner name is required"),

        country: z.string().min(1, "Country is required"),
        city: z.string().min(1, "City is required"),
        address: z.string().min(3, "Address is required"),

        phone: z.string().min(7, "Phone is too short").max(25, "Phone is too long"),
        website: z
            .string()
            .optional()
            .or(z.literal(""))
            .refine((v) => !v || /^https?:\/\/.+/i.test(v), "Website must start with http:// or https://"),

        email: z.string().email("Invalid email"),
        username: z.string().min(3, "Username must be at least 3 characters"),

        // ✅ password always available in add
        setPassword: z.boolean().default(true),
        password: z.string().optional(),
        confirmPassword: z.string().optional(),

        // ✅ logo upload
        logoFile: z.any().optional(),

        // ✅ contacts array
        contactList: z
            .array(
                z.object({
                    name: z.string().min(1, "Contact name is required"),
                    designation: z.string().max(80, "Max 80 characters").optional().or(z.literal("")),
                    mobile: z.string().min(7, "Mobile is too short").max(25, "Mobile is too long"),
                    remarks: z.string().max(200, "Max 200 characters").optional().or(z.literal("")),
                })
            )
            .default([]),

        // ✅ optional documents (same component as candidate, but not required)
        documents: z
            .array(
                z.object({
                    name: z.string().min(1, "Document name is required"),
                    remarks: z.string().max(200, "Max 200 characters").optional(),
                    file: z.any().optional(),
                    existingUrl: z.string().optional(),
                })
            )
            .default([]),
    })
    .superRefine((val, ctx) => {
        // password required
        if (val.setPassword) {
            if (!val.password || val.password.length < 8) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Password must be at least 8 characters" });
            }
            if (!val.confirmPassword || val.confirmPassword.length < 8) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Retype password is required" });
            }
            if (val.password && val.confirmPassword && val.password !== val.confirmPassword) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords do not match" });
            }
        }

        // ✅ Logo required (image only)
        const logo = val.logoFile;
        if (!logo || !(logo instanceof File)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["logoFile"], message: "Logo is required" });
        } else if (!fileExtOk(logo, [".jpg", ".jpeg", ".png", ".webp", ".svg"])) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["logoFile"],
                message: "Logo must be jpg/png/webp/svg",
            });
        }

        // ✅ documents optional: validate only when user uploaded
        (val.documents || []).forEach((d, i) => {
            if (d.file && d.file instanceof File) {
                if (!fileExtOk(d.file, [".pdf", ".jpg", ".jpeg", ".png", ".webp"])) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["documents", i, "file"],
                        message: "Documents must be PDF or image files",
                    });
                }
            }
        });
    });

/* ------------------------- UI ------------------------- */
function Field({ label, error, children }) {
    return (
        <div className="space-y-1">
            <div className="text-sm text-gray-700">{label}</div>
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

function DropzoneBox({ label, acceptText, multiple, value, onChange, error }) {
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
            <div className="text-sm text-gray-700">{label}</div>
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

/* ------------------------- Page ------------------------- */
export default function NewClientPage() {
    const [submitMsg, setSubmitMsg] = useState("");

    const {
        register,
        control,
        watch,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(ClientSchema),
        defaultValues: {
            companyName: "",
            ownerName: "",

            country: "",
            city: "",
            address: "",

            phone: "",
            website: "",

            email: "",
            username: "",

            setPassword: true,
            password: "",
            confirmPassword: "",

            logoFile: null,

            contactList: [],
            documents: [],
        },
    });

    const setPassword = watch("setPassword");

    const onSubmit = async (data) => {
        setSubmitMsg("");
        console.log("Client payload:", data);
        setSubmitMsg("Client saved (dummy). Later connect to Strapi.");
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="mx-auto w-[95%] lg:w-[80%] px-2 sm:px-4 py-5">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <header className="border-b border-gray-200 bg-white px-4 py-4">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <div className="text-lg text-gray-900">Create Client</div>
                                <div className="text-sm text-gray-600">All fields included (dummy). Strapi later.</div>
                            </div>
                            <Link
                                href="/staff/client"
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Back
                            </Link>
                        </div>
                    </header>

                    <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-6">
                        {/* Company + Owner */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Company Name" error={errors.companyName?.message}>
                                <Input {...register("companyName")} />
                            </Field>
                            <Field label="Owner Name" error={errors.ownerName?.message}>
                                <Input {...register("ownerName")} />
                            </Field>
                        </div>

                        {/* Country / City / Phone */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Field label="Country" error={errors.country?.message}>
                                <Select {...register("country")}>
                                    <option value="">Choose here</option>
                                    {COUNTRIES.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </Select>
                            </Field>

                            <Field label="City" error={errors.city?.message}>
                                <Input {...register("city")} />
                            </Field>

                            <Field label="Phone" error={errors.phone?.message}>
                                <Input {...register("phone")} />
                            </Field>
                        </div>

                        {/* Address */}
                        <Field label="Address" error={errors.address?.message}>
                            <Textarea {...register("address")} rows={3} />
                        </Field>

                        {/* Website + Email */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Website" error={errors.website?.message}>
                                <Input {...register("website")} placeholder="https://..." />
                            </Field>

                            <Field label="Email" error={errors.email?.message}>
                                <Input {...register("email")} />
                            </Field>
                        </div>

                        {/* ✅ Logo */}
                        <Controller
                            control={control}
                            name="logoFile"
                            render={({ field }) => (
                                <DropzoneBox
                                    label="Company Logo (Required)"
                                    acceptText="Accepted: .jpg, .png, .webp, .svg"
                                    multiple={false}
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors.logoFile?.message}
                                />
                            )}
                        />

                        {/* ✅ Contact List FieldArray */}
                        <ContactListFieldArray control={control} register={register} errors={errors} name="contactList" />

                        {/* Account */}
                        <div className="rounded-2xl border border-gray-200 p-4">
                            <div className="text-sm text-gray-900">Account</div>

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Username" error={errors.username?.message}>
                                    <Input {...register("username")} />
                                </Field>

                                <Field label="Email" error={errors.email?.message}>
                                    <Input {...register("email")} />
                                </Field>
                            </div>

                            <div className="mt-4 flex items-center gap-2">
                                <input type="checkbox" {...register("setPassword")} className="h-4 w-4" id="setPassword" />
                                <label htmlFor="setPassword" className="text-sm text-gray-800">
                                    Set Password
                                </label>
                            </div>

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Password" error={errors.password?.message}>
                                    <Input {...register("password")} type="password" disabled={!setPassword} />
                                </Field>

                                <Field label="Retype Password" error={errors.confirmPassword?.message}>
                                    <Input {...register("confirmPassword")} type="password" disabled={!setPassword} />
                                </Field>
                            </div>
                        </div>

                        {/* Optional Documents */}
                        <DocumentsFieldArray control={control} register={register} errors={errors} name="documents" />

                        {/* Submit */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                            <Link
                                href="/staff/client"
                                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-center"
                            >
                                Cancel
                            </Link>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="rounded-xl bg-red-700 px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
                            >
                                {isSubmitting ? "Saving..." : "Save Client"}
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