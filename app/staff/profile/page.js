"use client";

import React, { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/layouts/staff/Header";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDropzone } from "react-dropzone";

/* ------------------------- Helpers ------------------------- */
const DEFAULT_AVATAR =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <circle cx="150" cy="120" r="55" fill="#d1d5db"/>
    <rect x="70" y="200" width="160" height="30" rx="15" fill="#d1d5db"/>
    <text x="150" y="265" text-anchor="middle" font-family="Arial" font-size="18" fill="#6b7280">
      Profile
    </text>
  </svg>
`);

const isValidPhone = (value) => /^[0-9+\-\s()]{7,20}$/.test(String(value || "").trim());

function fileExtOk(file, allowedExt) {
    const name = (file?.name || "").toLowerCase();
    return allowedExt.some((ext) => name.endsWith(ext));
}

// ✅ adjust this mapper to your Strapi response structure
function normalizeStaffFromStrapi(raw) {
    const p = raw?.data?.attributes ?? raw?.data ?? raw ?? {};
    return {
        fullName: p.fullName ?? "",
        mobile: p.mobile ?? "",
        designation: p.designation ?? "",
        email: p.email ?? "",
        username: p.username ?? "",
        // ✅ if you store image url in strapi
        existingProfileImageUrl: p.profileImageUrl ?? p.avatarUrl ?? "",
    };
}

/* ------------------------- Zod Schema ------------------------- */
const StaffProfileSchema = z
    .object({
        fullName: z.string().min(1, "Full name is required"),
        mobile: z.string().min(7, "Mobile is too short").max(20, "Mobile is too long"),
        designation: z.string().min(1, "Designation is required"),
        email: z.string().email("Invalid email"),
        username: z.string().min(3, "Username must be at least 3 characters"),

        // image
        existingProfileImageUrl: z.string().optional(),
        profileImageFile: z.any().optional(),

        // password optional
        password: z.string().optional(),
        retypePassword: z.string().optional(),
    })
    .superRefine((val, ctx) => {
        if (!isValidPhone(val.mobile)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mobile"], message: "Mobile is invalid" });
        }

        const pass = (val.password || "").trim();
        const repass = (val.retypePassword || "").trim();
        if (pass || repass) {
            if (!pass) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Password is required" });
            if (!repass)
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["retypePassword"], message: "Retype password is required" });
            if (pass && pass.length < 8)
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Min 8 characters" });
            if (pass && repass && pass !== repass)
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["retypePassword"], message: "Passwords do not match" });
        }

        // ✅ validate profile image if selected
        if (val.profileImageFile && val.profileImageFile instanceof File) {
            if (!fileExtOk(val.profileImageFile, [".jpg", ".jpeg", ".png", ".webp"])) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["profileImageFile"],
                    message: "Profile image must be jpg/png/webp",
                });
            }
        }
    });

/* ------------------------- UI bits ------------------------- */
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
export default function StaffProfilePage() {
    const [loading, setLoading] = useState(true);
    const [submitMsg, setSubmitMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const {
        register,
        reset,
        setValue,
        handleSubmit,
        watch,
        control,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(StaffProfileSchema),
        defaultValues: {
            fullName: "",
            mobile: "",
            designation: "",
            email: "",
            username: "",
            existingProfileImageUrl: "",
            profileImageFile: null,
            password: "",
            retypePassword: "",
        },
    });

    const existingProfileImageUrl = watch("existingProfileImageUrl");
    const profileImageFile = watch("profileImageFile");

    // ✅ preview selected image (or existing or default)
    const previewSrc = useMemo(() => {
        if (profileImageFile && profileImageFile instanceof File) {
            return URL.createObjectURL(profileImageFile);
        }
        return (existingProfileImageUrl || "").trim() || DEFAULT_AVATAR;
    }, [profileImageFile, existingProfileImageUrl]);

    // cleanup blob url
    useEffect(() => {
        if (!(profileImageFile instanceof File)) return;
        const url = URL.createObjectURL(profileImageFile);
        return () => URL.revokeObjectURL(url);
    }, [profileImageFile]);

    // ✅ Load staff profile on open
    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                setErrorMsg("");
                setSubmitMsg("");

                // TODO: replace with your real endpoint
                // const res = await fetch("/api/staff/profile", { cache: "no-store" });
                // const json = await res.json();

                // DEMO ONLY:
                const demo = {
                    data: {
                        attributes: {
                            fullName: "Usman Ali",
                            mobile: "+92 300 1234567",
                            designation: "HR Executive",
                            email: "staff@example.com",
                            username: "staff.user",
                            profileImageUrl: "", // put a real url to test
                        },
                    },
                };

                const normalized = normalizeStaffFromStrapi(demo);
                if (!mounted) return;

                reset({
                    ...normalized,
                    profileImageFile: null,
                    password: "",
                    retypePassword: "",
                });
            } catch (e) {
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
    }, [reset]);

    const onSubmit = async (data) => {
        setSubmitMsg("");
        setErrorMsg("");

        try {
            // ✅ Basic payload
            const payload = {
                fullName: data.fullName.trim(),
                mobile: data.mobile.trim(),
                designation: data.designation.trim(),
                email: data.email.trim(),
                username: data.username.trim(),
            };

            if (data.password?.trim() && data.retypePassword?.trim()) {
                payload.password = data.password.trim();
            }

            // ✅ If you selected a new image, you will typically send FormData to Strapi
            // For now we just log it
            const hasNewImage = data.profileImageFile instanceof File;

            console.log("STAFF UPDATE PAYLOAD:", payload);
            console.log("NEW PROFILE IMAGE:", hasNewImage ? data.profileImageFile : null);

            // Example FormData (when you connect Strapi):
            // const fd = new FormData();
            // fd.append("data", JSON.stringify(payload));
            // if (hasNewImage) fd.append("files.profileImage", data.profileImageFile); // field name depends on Strapi model
            // await fetch("/api/staff/profile", { method: "PUT", body: fd });

            setSubmitMsg("Staff profile updated (dummy). Later connect to Strapi.");
            setValue("password", "");
            setValue("retypePassword", "");
            // keep selected image or clear it (your choice):
            // setValue("profileImageFile", null);
        } catch (e) {
            setErrorMsg("Failed to update profile. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <div className="mt-10 px-6 py-5 border-b border-gray-300">
                <div className="font-bold text-3xl sm:text-5xl text-red-700">Staff Profile</div>
                <div className="text-sm text-gray-600 mt-1">Update your profile details.</div>
            </div>

            <main className="mx-auto w-[95%] lg:w-[80%] px-2 sm:px-4 py-5">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <header className="border-b border-gray-200 bg-white px-4 py-4">
                        <div className="text-lg text-gray-900">My Profile</div>
                        <div className="text-sm text-gray-600">Password is optional (leave empty to keep old password).</div>
                    </header>

                    {loading ? (
                        <div className="p-6 text-sm text-gray-600">Loading profile...</div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-6">
                            {/* ✅ Profile image */}
                            <div className="rounded-2xl border border-gray-200 p-4">
                                <div className="text-sm text-gray-900">Profile Image</div>

                                <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                                    <div className="lg:col-span-1">
                                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                                            <img
                                                src={previewSrc}
                                                alt="Profile preview"
                                                className="w-full h-56 object-cover rounded-2xl border border-gray-200 bg-white"
                                                onError={(e) => {
                                                    e.currentTarget.onerror = null;
                                                    e.currentTarget.src = DEFAULT_AVATAR;
                                                }}
                                            />
                                            <div className="mt-2 text-xs text-gray-500">
                                                {profileImageFile instanceof File ? "New image selected" : "Current image"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-2">
                                        <Controller
                                            control={control}
                                            name="profileImageFile"
                                            render={({ field }) => (
                                                <DropzoneBox
                                                    label="Upload / Replace Profile Image"
                                                    acceptText="Accepted: .jpg, .png, .webp"
                                                    multiple={false}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    error={errors.profileImageFile?.message}
                                                />
                                            )}
                                        />

                                        <div className="mt-2 flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setValue("profileImageFile", null)}
                                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                            >
                                                Clear Selected Image
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setValue("existingProfileImageUrl", "")}
                                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                            >
                                                Remove Existing Image
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Full Name" error={errors.fullName?.message}>
                                    <Input {...register("fullName")} />
                                </Field>

                                <Field label="Mobile" error={errors.mobile?.message}>
                                    <Input {...register("mobile")} />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Designation" error={errors.designation?.message}>
                                    <Input {...register("designation")} />
                                </Field>

                                <Field label="Username" error={errors.username?.message}>
                                    <Input {...register("username")} />
                                </Field>
                            </div>

                            <Field label="Email" error={errors.email?.message}>
                                <Input {...register("email")} />
                            </Field>

                            {/* Password */}
                            <div className="rounded-2xl border border-gray-200 p-4">
                                <div className="text-sm text-gray-900">Change Password</div>
                                <div className="text-xs text-gray-600 mt-1">Leave both fields empty if you don’t want to update.</div>

                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label="Password" error={errors.password?.message}>
                                        <Input {...register("password")} type="password" placeholder="Min 8 characters" />
                                    </Field>

                                    <Field label="Retype Password" error={errors.retypePassword?.message}>
                                        <Input {...register("retypePassword")} type="password" placeholder="Retype password" />
                                    </Field>
                                </div>

                                <div className="mt-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setValue("password", "");
                                            setValue("retypePassword", "");
                                        }}
                                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        Clear Password Fields
                                    </button>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                                <div className="text-sm">
                                    {errorMsg ? (
                                        <span className="text-red-700 font-semibold">{errorMsg}</span>
                                    ) : submitMsg ? (
                                        <span className="text-green-700 font-semibold">{submitMsg}</span>
                                    ) : (
                                        <span className="text-gray-500">Update your info and click Save.</span>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="rounded-xl bg-red-700 text-white px-5 py-2 text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}