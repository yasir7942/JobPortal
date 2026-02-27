"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/layouts/staff/Header";

import ENUMS from "../../../../config/enums.json";

// ✅ your existing component
import DocumentsFieldArray from "@/app/staff/ui/DocumentsFieldArray";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDropzone } from "react-dropzone";
import { createCandidate, getAllJobRoles } from "@/app/data/Loader";

import {
    Field,
    Input,
    Select,
    Textarea,
    DropzoneBox,
    MultiSelectSearchIds,
    PasswordInput,
    InfoTip,
    fetchJsonSafe,
    normalizePhone,
    fileExtOk,
    isValidDateNotFuture,
    normalizeIdArray
} from "@/app/staff/ui/CandidateFormUI";


/* ------------------------------------------------------------------ */
/* Schema (Strapi fields) */
/* ------------------------------------------------------------------ */
const CandidateCreateSchema = z
    .object({
        referenceNumber: z.string().optional(), // auto by Strapi

        // ✅ REQUIRED ONLY
        fullName: z.string().min(1, "Full name is required"),
        firstName: z.string().min(2, "First name must be at least 2 characters"),

        // ✅ OPTIONAL
        lastName: z.string().optional(),

        genderList: z.string().optional(),
        birthDate: z.string().optional(),
        nationalityList: z.string().optional(),
        maritalStatusList: z.string().optional(),
        seasonalStatusList: z.string().optional(),
        englishLevelList: z.string().optional(),

        mobile: z.string().optional(),
        email: z.string().min(1, "Email is required"),

        jobStatus: z.string().optional(),
        job_roles: z.array(z.number()).optional(),

        isProfileVerifiedList: z.string().optional(),
        currentlyEmployed: z.boolean().optional(),

        numberOfExperience: z.coerce.number().optional(),
        shortSummary: z.string().max(250, "Max 250 characters").optional(),
        privateNotes: z.string().max(2000, "Max 2000 characters").optional(),

        currentJobExperiece: z.coerce.number().optional(),
        previousJobExperiece: z.coerce.number().optional(),
        previousCompany: z.string().max(120, "Max 120 characters").optional(),
        currentCompany: z.string().max(120, "Max 120 characters").optional(),

        source: z.string().max(120, "Max 120 characters").optional(),

        dateScreeningInterview: z.string().optional(),


        // account (optional now)
        username: z.string().min(1, "Username is required"),
        password: z.string().min(3, "Password must be at least 3 characters"),
        retypePassword: z.string().min(3, "Retype Password must be at least 3 characters"),

        // media (all optional)
        profileImage: z.any().optional(),
        CV: z.any().optional(),
        passport: z.any().optional(),
        passportExpireDate: z.string().optional(),

        workingVideo: z.any().optional(), // single file
        miScreeningVideo: z.any().optional(), // single file

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
        // ✅ Profile Image (optional) - image only
        if (val.profileImage && val.profileImage instanceof File) {
            if (!fileExtOk(val.profileImage, [".jpg", ".jpeg", ".png", ".webp"])) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["profileImage"],
                    message: "Profile image must be jpg/png/webp",
                });
            }
        }

        // ✅ birthDate validate ONLY if user provided it
        if (val.birthDate) {
            if (!isValidDateNotFuture(val.birthDate)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["birthDate"],
                    message: "Invalid birth date",
                });
            }
        }

        // ✅ Email validate ONLY if user provided it
        if (val.email) {
            const emailOk = z.string().email().safeParse(val.email).success;
            if (!emailOk) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["email"],
                    message: "Invalid email",
                });
            }
        }

        // ✅ Mobile validate ONLY if user provided it
        if (val.mobile) {
            const m = String(val.mobile).trim();
            if (m.length < 7 || m.length > 20) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["mobile"],
                    message: "Mobile must be 7–20 characters",
                });
            }
        }

        // ✅ Password logic (optional)
        // If user typed any password field -> validate both and match
        const p = (val.password || "").trim();
        const rp = (val.retypePassword || "").trim();
        if (p || rp) {
            if (p.length < 4) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["password"],
                    message: "Password must be at least 4 characters",
                });
            }
            if (!rp) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["retypePassword"],
                    message: "Retype password is required",
                });
            }
            if (p && rp && p !== rp) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["retypePassword"],
                    message: "Passwords do not match",
                });
            }
        }



        // ✅ CV validate ONLY if file selected
        if (val.CV && val.CV instanceof File) {
            if (!fileExtOk(val.CV, [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"])) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["CV"],
                    message: "CV must be pdf/jpg/png/webp/doc/docx",
                });
            }
        }

        // ✅ Passport validate ONLY if file selected
        if (val.passport && val.passport instanceof File) {
            if (!fileExtOk(val.passport, [".pdf", ".jpg", ".jpeg", ".png", ".webp"])) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["passport"],
                    message: "Passport must be pdf/jpg/png/webp",
                });
            }
        }

        // ✅ passportExpireDate validate ONLY if provided
        // (no validation needed otherwise)
        // if (val.passportExpireDate) { ... }

        // ✅ workingVideo validate ONLY if selected
        if (val.workingVideo && val.workingVideo instanceof File) {
            if (!fileExtOk(val.workingVideo, [".mp4", ".mov", ".webm", ".mkv"])) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["workingVideo"],
                    message: "Video must be mp4/mov/webm/mkv",
                });
            }
        }

        // ✅ miScreeningVideo validate ONLY if selected
        if (val.miScreeningVideo && val.miScreeningVideo instanceof File) {
            if (!fileExtOk(val.miScreeningVideo, [".mp4", ".mov", ".webm", ".mkv"])) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["miScreeningVideo"],
                    message: "Video must be mp4/mov/webm/mkv",
                });
            }
        }

        // ✅ documents validate ONLY if row has something
        (val.documents || []).forEach((d, i) => {
            const any = (d?.name || "").trim() || (d?.remarks || "").trim() || d?.file;
            if (!any) return;

            // If user started a doc row, then enforce proper structure
            if (!String(d?.name || "").trim()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["documents", i, "name"],
                    message: "Document name is required",
                });
            }

            if (d?.file && d.file instanceof File) {
                if (!fileExtOk(d.file, [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx", ".csv"])) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["documents", i, "file"],
                        message: "Invalid file type (pdf/image/doc/xls/csv allowed)",
                    });
                }
            } else {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["documents", i, "file"],
                    message: "Document file is required",
                });
            }
        });
    });

/* ------------------------------------------------------------------ */
/* Page */
/* ------------------------------------------------------------------ */
export default function NewCandidatePage() {
    // ✅ these should come from Strapi enums / API
    /* const [ENUMS, setENUMS] = useState({
         genders: ["Male", "Female", "Undisclosed"],
         nationalities: ["Pakistan", "UAE", "KSA", "India", "Bangladesh", "Philippines", "Egypt", "Other"],
         maritalStatus: ["Single", "Married", "Divorced", "Widowed"],
         seasonalStatus: ["Seasonal", "Permanent", "Any"],
         englishLevel: ["Average", "Basic", "Below Basic", "Excellent"],
         jobStatus: ["Available", "Working", "On Hold", "Blacklisted"],
         isProfileVerified: ["Documents Pending", "Verified", "On Hold", "Blacklisted"],
     }); */

    // ✅ job roles should be fetched from strapi(too many)
    const [jobRoles, setJobRoles] = useState([]);

    // OPTIONAL: fetch real options (recommended)
    useEffect(() => {
        (async () => {
            try {
                const res = await getAllJobRoles();
                setJobRoles(res);
            } catch (e) {
                console.log(e);
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
            profileImage: null,
            genderList: "",
            birthDate: "",
            nationalityList: "",
            maritalStatusList: "",
            seasonalStatusList: "",
            englishLevelList: "",

            mobile: "",
            email: "",

            jobStatus: "",
            job_roles: [],

            isProfileVerifiedList: "",
            currentlyEmployed: false,

            numberOfExperience: 0,
            shortSummary: "",
            privateNotes: "",

            currentJobExperiece: 0,
            previousJobExperiece: 0,
            previousCompany: "",
            currentCompany: "",

            source: "",

            dateScreeningInterview: "",


            username: "",
            password: "",
            retypePassword: "",

            CV: null,
            passport: null,
            passportExpireDate: "",

            workingVideo: null,
            miScreeningVideo: null,

            documents: [],
        },
    });

    const firstName = watch("firstName");
    const lastName = watch("lastName");

    const profileImage = watch("profileImage");
    const profilePreview = useMemo(() => {
        if (profileImage && profileImage instanceof File) {
            return URL.createObjectURL(profileImage);
        }
        return ""; // no existing image in create
    }, [profileImage]);

    useEffect(() => {
        if (!(profileImage instanceof File)) return;
        const url = URL.createObjectURL(profileImage);
        return () => URL.revokeObjectURL(url);
    }, [profileImage]);


    // auto fullName
    /* useEffect(() => {
         const fn = `${firstName || ""} ${lastName || ""}`.trim();
         setValue("fullName", fn, { shouldValidate: true, shouldDirty: true });
    }, [firstName, lastName, setValue]);
*/
    const onSubmit = async (formData) => {
        setSubmitMsg("");
        console.log("Candidate payload:", formData);

        // optional normalize
        if (formData.mobile) formData.mobile = normalizePhone(formData.mobile);

        try {
            // ✅ 1) Build JSON part (NO files inside JSON)
            const payloadData = {
                ...formData,

                // IMPORTANT: remove File objects from JSON (server will receive them from fd keys)
                profileImage: undefined,
                CV: undefined,
                passport: undefined,
                workingVideo: undefined,
                miScreeningVideo: undefined,

                // documents: remove file objects from JSON but keep name/remarks
                documents: (formData.documents || []).map((d) => ({
                    name: d?.name || "",
                    remarks: d?.remarks || "",
                    // file goes separately in FormData
                })),
            };

            // ✅ 2) Build FormData for server route
            const fd = new FormData();
            fd.append("data", JSON.stringify(payloadData));

            // ✅ files must match your Strapi field keys (same as you used before)
            if (formData.profileImage instanceof File) {
                fd.append("files.profileImage", formData.profileImage);
            }
            if (formData.CV instanceof File) {
                fd.append("files.CV", formData.CV);
            }
            if (formData.passport instanceof File) {
                fd.append("files.passport", formData.passport);
            }

            // single video
            if (formData.workingVideo instanceof File) {
                fd.append("files.workingVideo", formData.workingVideo);
            }

            // single video
            if (formData.miScreeningVideo instanceof File) {
                fd.append("files.miScreeningVideo", formData.miScreeningVideo);
            }

            // documents component files
            (formData.documents || []).forEach((doc, idx) => {
                if (doc?.file instanceof File) {
                    fd.append(`files.documents.${idx}.file`, doc.file);
                }
            });

            // ✅ 3) Call YOUR server route (token is on server)
            const res = await fetch("/api/candidates/create", {
                method: "POST",
                body: fd,
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.error || "Candidate not saved");
            }

            console.log("Created (server):", json);
            setSubmitMsg(`Candidate saved ✅ Ref: ${json.referenceNumber || ""}`);
        } catch (e) {
            console.error("Add Candidate Error:", e);
            setSubmitMsg(`Error: ${e.message || "Candidate not saved"} ❌`);
        }
    };
    /******end onSubmit */

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="mx-auto w-[95%] lg:w-[85%] px-2 sm:px-4 py-5">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <header className="border-b border-gray-200 bg-white px-4 py-4">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <div className="text-lg text-gray-900">Create Candidate</div>
                                <div className="text-sm text-gray-600">Create new candidate.</div>
                            </div>
                            <Link
                                href="/staff/candidates"
                                className="rounded-xl border border-gray-400 bg-white px-6 py-2 text-base text-gray-700 hover:bg-gray-50"
                            >
                                Back
                            </Link>
                        </div>
                    </header>

                    <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-6">
                        {/* ------------------ TOP: Identity + Contact ------------------ */}
                        <div className="rounded-2xl border border-red-200 p-4">
                            <div className="text-base text-red-600 font-semibold">Identity & Contact</div>
                            <div className="text-sm text-gray-800 mt-1">Start with required information for quick processing.</div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 ">
                                {/* ----    <Field
                                    label="Reference Number"
                                    hint="Auto-generated by system, unique identifier for the candidate."
                                    info="This is generated after saving the candidate."
                                >
                                    <Input {...register("referenceNumber")} disabled placeholder="Auto-generated" />
                                </Field>

                                 ---- */}
                                <Field
                                    label={
                                        <>
                                            Full Name <span className="text-red-600 text-lg ">*</span>
                                        </>
                                    } hint="" info="Full name of candidate" error={errors.fullName?.message}>
                                    <Input {...register("fullName")} placeholder="First + Middle + Last" />
                                </Field>



                            </div>

                            {/* Profile Image */}
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Controller
                                    control={control}
                                    name="profileImage"
                                    render={({ field }) => (
                                        <DropzoneBox
                                            label="Profile Image"
                                            acceptText="Accepted: .jpg, .png, .webp"
                                            multiple={false}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={errors.profileImage?.message}
                                        />
                                    )}
                                />

                                {profilePreview ? (
                                    <div className="rounded-2xl border border-gray-200 p-3 bg-gray-50">
                                        <div className="text-sm text-gray-800 mb-2">Preview</div>
                                        <img src={profilePreview} className="h-40 w-40 rounded-2xl object-cover border border-gray-200 bg-white" />
                                    </div>
                                ) : null}  </div>



                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label={
                                    <>
                                        First Name <span className="text-red-600 text-lg ">*</span>
                                    </>
                                } info="Candidate first name as per passport." error={errors.firstName?.message}>
                                    <Input {...register("firstName")} />
                                </Field>
                                <Field label="Last Name" info="Candidate last name as per passport." error={errors.lastName?.message}>
                                    <Input {...register("lastName")} />
                                </Field>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Field label="Gender" info="Enumeration from Strapi (Male/Female/Undisclosed)." error={errors.genderList?.message}>
                                    <Select {...register("genderList")}>
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

                                <Field label="Nationality" info="Enumeration from Strapi." error={errors.nationalityList?.message}>
                                    <Select {...register("nationalityList")}>
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
                                    <Input {...register("mobile")} placeholder="+971 5xx xxxxxxx" />
                                </Field>


                            </div>
                        </div>

                        {/* ------------------ JOB / STATUS (important) ------------------ */}
                        <div className="rounded-2xl border border-red-200 p-4">
                            <div className="text-base text-red-600 font-semibold">Job & Status</div>
                            <div className="text-sm text-gray-800 mt-1">Most-used screening fields for shortlisting.</div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Controller
                                    control={control}
                                    name="job_roles"
                                    render={({ field }) => (
                                        <MultiSelectSearchIds
                                            label="Job Roles"
                                            info="Search and select multiple roles (Strapi relation)."
                                            hint="Type to search roles. Select multiple."
                                            options={jobRoles}          // ✅ [{id,title,...}]
                                            value={field.value || []}   // ✅ [2,6,11]
                                            onChange={field.onChange}   // ✅ sets IDs
                                            error={errors.job_roles?.message}
                                            getLabel={(o) => o.title}   // ✅ show title
                                            getValue={(o) => o.id}      // ✅ store id
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
                                <Field label="Marital Status" info="Enumeration from Strapi." error={errors.maritalStatusList?.message}>
                                    <Select {...register("maritalStatusList")}>
                                        <option value="">Choose here</option>
                                        {ENUMS.maritalStatus.map((x) => (
                                            <option key={x} value={x}>
                                                {x}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>

                                <Field label="Seasonal Status" info="Enumeration from Strapi." error={errors.seasonalStatusList?.message}>
                                    <Select {...register("seasonalStatusList")}>
                                        <option value="">Choose here</option>
                                        {ENUMS.seasonalStatus.map((x) => (
                                            <option key={x} value={x}>
                                                {x}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>

                                <Field label="English Level" info="Enumeration from Strapi." error={errors.englishLevelList?.message}>
                                    <Select {...register("englishLevelList")}>
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
                                        name="isProfileVerifiedList"
                                        render={({ field }) => (
                                            <Select value={field.value || ""} onChange={(e) => field.onChange(e.target.value)}>
                                                <option value="">Choose here</option>
                                                {ENUMS.isProfileVerified.map((x, idx) => (
                                                    <option key={`${x}-${idx}`} value={x}>
                                                        {x}
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
                        <div className="rounded-2xl border border-red-200 p-4">
                            <div className="text-base text-red-600 font-semibold">Experience Details</div>
                            <div className="text-sm text-gray-800 mt-1">Useful for recruiters and screening.</div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Field label="Previous Company" info="Last company name (if any)." error={errors.previousCompany?.message}>
                                    <Input {...register("previousCompany")} placeholder="Company name" />
                                </Field>

                                <Field label="Previous Job Experience" info="Short details about previous jobs." error={errors.previousJobExperiece?.message}>
                                    <Input {...register("previousJobExperiece")} type="number" min={0} step={1} />
                                </Field>



                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Field label="Current Company" info="Last company name (if any)." error={errors.currentCompany?.message}>
                                    <Input {...register("currentCompany")} placeholder="Company name" />
                                </Field>

                                <Field label="Current Job Experience" info="Short details about current job." error={errors.currentJobExperiece?.message}>
                                    <Input {...register("currentJobExperiece")} type="number" min={0} step={1} />
                                </Field>

                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field
                                    label="Short Summary"
                                    info="Max 250 chars. Good for quick review."
                                    error={errors.shortSummary?.message}
                                >
                                    <Textarea
                                        {...register("shortSummary")}
                                        placeholder="e.g. Ready to join, strong skills in..."
                                        rows={4}
                                        maxLength={250}
                                    />
                                </Field>

                                <Field
                                    label="Private Notes"
                                    info="Internal only (not for clients)."
                                    error={errors.privateNotes?.message}
                                >
                                    <Textarea
                                        {...register("privateNotes")}
                                        placeholder="Recruiter notes..."
                                        rows={4}
                                        maxLength={2000}
                                    />
                                </Field>
                            </div>
                        </div>

                        {/* ------------------ DOCUMENTS & MEDIA ------------------ */}
                        <div className="rounded-2xl border border-red-200 p-4">
                            <div className="text-base text-red-600 font-semibold">Documents & Media</div>
                            <div className="text-sm text-gray-800 mt-1">Upload required media. CV supports PDF/images.</div>

                            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <Controller
                                    control={control}
                                    name="CV"
                                    render={({ field }) => (
                                        <DropzoneBox
                                            label="CV (Required)"
                                            info="Strapi media: PDF or image."
                                            hint="Accepted: .pdf, .jpg, .png, .webp"
                                            acceptText="Accepted: .pdf, .jpg, .png, .webp"
                                            multiple={false}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={errors.CV?.message}
                                        />
                                    )}
                                />

                                <Controller
                                    control={control}
                                    name="passport"
                                    render={({ field }) => (
                                        <DropzoneBox
                                            label="Passport (Required)"
                                            info="Passport scan image or PDF."
                                            hint="Accepted: .pdf, .jpg, .png, .webp"
                                            acceptText="Accepted: .pdf, .jpg, .png, .webp"
                                            multiple={false}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={errors.passport?.message}
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
                                    name="workingVideo"
                                    render={({ field }) => (
                                        <DropzoneBox
                                            label="Working Video"
                                            info="Upload single  working video (mp4/mov/webm/mkv)."
                                            hint="upload single working video."
                                            acceptText="Accepted: .mp4, .mov, .webm, .mkv"
                                            multiple={false}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={errors.workingVideo?.message}
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
                        <div className="rounded-2xl border border-red-200 p-4">
                            <div className="text-base text-red-600 font-semibold">Screening</div>
                            <div className="text-sm text-gray-800 mt-1">Store interview date and video</div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Screening Interview Date" info="Date of screening interview (optional)." error={errors.dateScreeningInterview?.message}>
                                    <Input {...register("dateScreeningInterview")} type="date" />
                                </Field>

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
                        </div>

                        {/* ------------------ ACCOUNT (LOGIN) ------------------ */}
                        <div className="rounded-2xl border border-red-200 p-4">
                            <div className="text-base text-red-600 font-semibold">Account</div>
                            <div className="text-sm text-gray-800 mt-1">Candidate login credentials.</div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field
                                    label={
                                        <>
                                            Username <span className="text-red-600 text-lg ">*</span>
                                        </>
                                    }
                                    info="Login username (min 3 chars)." error={errors.username?.message}>
                                    <Input {...register("username")} />
                                </Field>

                                <Field label={
                                    <>
                                        Email <span className="text-red-600 text-lg ">*</span>
                                    </>
                                } info="Login email." error={errors.email?.message}>
                                    <Input {...register("email")} />
                                </Field>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label={
                                    <>
                                        Password <span className="text-red-600 text-lg ">*</span>
                                    </>
                                } info="Min 8 characters." error={errors.password?.message}>
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

                                <Field label={
                                    <>
                                        Retype Password <span className="text-red-600 text-lg ">*</span>
                                    </>
                                } info="Must match password." error={errors.retypePassword?.message}>
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