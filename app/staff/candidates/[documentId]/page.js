"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/app/components/layouts/staff/Header";
import ENUMS from "../../../../config/enums.json";

import DocumentsFieldArray from "@/app/staff/ui/DocumentsFieldArray";

import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDropzone } from "react-dropzone";
import { getAllJobRoles } from "@/app/data/Loader";
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
/* Schema (EDIT) */
/* ------------------------------------------------------------------ */
const CandidateEditSchema = z
    .object({
        referenceNumber: z.string().optional(),

        fullName: z.string().min(1, "Full name is required"),
        firstName: z.string().min(2, "First name must be at least 2 characters"),
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
        job_roles: z.array(z.coerce.number()).optional(),

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

        username: z.string().min(1, "Username is required"),
        password: z.string().optional(),
        retypePassword: z.string().optional(),

        profileImage: z.any().optional(),
        CV: z.any().optional(),
        passport: z.any().optional(),
        passportExpireDate: z.string().optional(),

        workingVideo: z.any().optional(),
        miScreeningVideo: z.any().optional(),

        documents: z
            .array(
                z.object({
                    name: z.string().optional(),
                    remarks: z.string().max(200, "Max 200 characters").optional(),
                    file: z.any().optional(),
                    existingUrl: z.string().optional(), // IMPORTANT for edit
                    existingFileId: z.coerce.number().nullable().optional(), // ✅ keep existing media id
                })
            )
            .default([]),
    })
    .superRefine((val, ctx) => {
        if (val.birthDate && !isValidDateNotFuture(val.birthDate)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["birthDate"], message: "Invalid birth date" });
        }

        if (val.email) {
            const emailOk = z.string().email().safeParse(val.email).success;
            if (!emailOk) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Invalid email" });
            }
        }

        if (val.mobile) {
            const m = String(val.mobile).trim();
            if (m.length < 7 || m.length > 20) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mobile"], message: "Mobile must be 7–20 characters" });
            }
        }

        // password optional
        const p = String(val.password || "").trim();
        const rp = String(val.retypePassword || "").trim();
        if (p || rp) {
            if (p.length < 4) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Password must be at least 4 characters" });
            }
            if (!rp) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["retypePassword"], message: "Retype password is required" });
            }
            if (p && rp && p !== rp) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["retypePassword"], message: "Passwords do not match" });
            }
        }

        // profileImage ext (if selected)
        if (val.profileImage && val.profileImage instanceof File) {
            if (!fileExtOk(val.profileImage, [".jpg", ".jpeg", ".png", ".webp"])) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["profileImage"], message: "Profile image must be jpg/png/webp" });
            }
        }

        // CV ext (if selected)
        if (val.CV && val.CV instanceof File) {
            if (!fileExtOk(val.CV, [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"])) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["CV"], message: "CV must be pdf/jpg/png/webp/doc/docx" });
            }
        }

        // passport ext (if selected)
        if (val.passport && val.passport instanceof File) {
            if (!fileExtOk(val.passport, [".pdf", ".jpg", ".jpeg", ".png", ".webp"])) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["passport"], message: "Passport must be pdf/jpg/png/webp" });
            }
        }

        // videos ext (if selected)
        if (val.workingVideo && val.workingVideo instanceof File) {
            if (!fileExtOk(val.workingVideo, [".mp4", ".mov", ".webm", ".mkv"])) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["workingVideo"], message: "Video must be mp4/mov/webm/mkv" });
            }
        }
        if (val.miScreeningVideo && val.miScreeningVideo instanceof File) {
            if (!fileExtOk(val.miScreeningVideo, [".mp4", ".mov", ".webm", ".mkv"])) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["miScreeningVideo"], message: "Video must be mp4/mov/webm/mkv" });
            }
        }

        // documents: allow existingUrl OR new File
        (val.documents || []).forEach((d, i) => {
            const any =
                (d?.name || "").trim() ||
                (d?.remarks || "").trim() ||
                d?.file ||
                (d?.existingUrl || "").trim() ||
                d?.existingFileId;

            if (!any) return;

            if (!String(d?.name || "").trim()) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["documents", i, "name"], message: "Document name is required" });
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
                if (!String(d?.existingUrl || "").trim() && !d?.existingFileId) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["documents", i, "file"],
                        message: "Document file is required",
                    });
                }
            }
        });
    });

/* ------------------------------------------------------------------ */
/* Page */
/* ------------------------------------------------------------------ */
export default function EditCandidatePage() {
    const params = useParams();
    const documentId = params?.documentId;

    const [jobRoles, setJobRoles] = useState([]);
    const [submitMsg, setSubmitMsg] = useState("");
    const [loading, setLoading] = useState(true);

    const [existingMedia, setExistingMedia] = useState({
        profileImage: { url: "", name: "" },
        CV: { url: "", name: "" },
        passport: { url: "", name: "" },
        workingVideo: { url: "", name: "" },
        miScreeningVideo: { url: "", name: "" },
    });

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

    const {
        register,
        control,
        watch,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(CandidateEditSchema),
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

    // fetch candidate -> reset form
    useEffect(() => {
        if (!documentId) return;

        (async () => {
            setLoading(true);
            try {
                const json = await fetchJsonSafe(`/api/candidates/getcandidate/${documentId}`);
                console.log("Candidate data loaded:", json);

                const jr = normalizeIdArray(json?.formDefaults?.job_roles);
                reset({ ...json.formDefaults, job_roles: jr });
                setExistingMedia(json.existingMedia || existingMedia);
            } catch (e) {
                console.error(e);
                setSubmitMsg(`Error: ${e.message || "Failed to load candidate"} ❌`);
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentId, reset]);

    const profileImage = watch("profileImage");
    const CV = watch("CV");
    const passport = watch("passport");
    const workingVideo = watch("workingVideo");
    const miScreeningVideo = watch("miScreeningVideo");

    const profilePreview = useMemo(() => {
        if (profileImage && profileImage instanceof File) return URL.createObjectURL(profileImage);
        return existingMedia?.profileImage?.url || "";
    }, [profileImage, existingMedia]);

    useEffect(() => {
        if (!(profileImage instanceof File)) return;
        const url = URL.createObjectURL(profileImage);
        return () => URL.revokeObjectURL(url);
    }, [profileImage]);

    const onSubmit = async (formData) => {
        setSubmitMsg("");
        if (formData.mobile) formData.mobile = normalizePhone(formData.mobile);
        try {
            // same style as create: JSON without File objects
            const payloadData = {
                ...formData,
                profileImage: undefined,
                CV: undefined,
                passport: undefined,
                workingVideo: undefined,
                miScreeningVideo: undefined,
                documents: (formData.documents || []).map((d) => ({
                    name: d?.name || "",
                    remarks: d?.remarks || "",
                    existingUrl: d?.existingUrl || "",
                    existingFileId: d?.existingFileId ?? null,
                })),
            };

            const fd = new FormData();
            fd.append("data", JSON.stringify(payloadData));

            // only send new files if user selected
            if (formData.profileImage instanceof File) fd.append("files.profileImage", formData.profileImage);
            if (formData.CV instanceof File) fd.append("files.CV", formData.CV);
            if (formData.passport instanceof File) fd.append("files.passport", formData.passport);
            if (formData.workingVideo instanceof File) fd.append("files.workingVideo", formData.workingVideo);
            if (formData.miScreeningVideo instanceof File) fd.append("files.miScreeningVideo", formData.miScreeningVideo);

            (formData.documents || []).forEach((doc, idx) => {
                if (doc?.file instanceof File) fd.append(`files.documents.${idx}.file`, doc.file);
            });

            // ✅ 3) Call  server route (token is on server)
            const res = await fetch(`/api/candidates/update/${documentId}`, {
                method: "POST",
                body: fd,
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.error || "Candidate not saved");
            }

            console.log("EDIT READY (not saving yet)", { documentId, payloadData });
            setSubmitMsg("Candidate updated ✅");
        } catch (e) {
            console.error("Add Candidate Error:", e);
            setSubmitMsg(`Error: ${e.message || "Candidate not saved"} ❌`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <main className="mx-auto w-[95%] lg:w-[85%] px-2 sm:px-4 py-5">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6">Loading candidate...</div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="mx-auto w-[95%] lg:w-[85%] px-2 sm:px-4 py-5">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <header className="border-b border-gray-200 bg-white px-4 py-4">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <div className="text-lg text-gray-900">Edit Candidate</div>
                                <div className="text-sm text-gray-600">Update candidate details.</div>
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
                            <div className="text-sm text-gray-800 mt-1">Edit basic information.</div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Reference Number" info="Auto-generated by system.">
                                    <Input {...register("referenceNumber")} disabled placeholder="Auto-generated cursor-text" />
                                </Field>

                                <Field label="Full Name" info="Full name of candidate" error={errors.fullName?.message}>
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
                                        <img
                                            src={profilePreview}
                                            className="h-40 w-40 rounded-2xl object-cover border border-gray-200 bg-white"
                                            alt=""
                                        />
                                        {existingMedia?.profileImage?.url && !(profileImage instanceof File) ? (
                                            <div className="mt-2 text-xs text-gray-600">
                                                Current: {existingMedia.profileImage.name || "profileImage"}
                                            </div>
                                        ) : null}
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
                                <Field label="Gender" info="Enumeration from Strapi." error={errors.genderList?.message}>
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
                                    <Input {...register("mobile")} placeholder="+92 3xx xxxxxxx" />
                                </Field>
                            </div>
                        </div>

                        {/* ------------------ JOB / STATUS ------------------ */}
                        <div className="rounded-2xl border border-red-200 p-4">
                            <div className="text-base text-red-600 font-semibold">Job & Status</div>
                            <div className="text-sm text-gray-800 mt-1">Most-used screening fields for shortlisting.</div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Controller
                                    control={control}
                                    name="job_roles"
                                    render={({ field }) => {
                                        const safeValue = (Array.isArray(field.value) ? field.value : [])
                                            .map((x) => Number((x && typeof x === "object") ? (x.id ?? x.value ?? x) : x))
                                            .filter((n) => Number.isFinite(n));

                                        return (
                                            <MultiSelectSearchIds
                                                label="Job Roles"
                                                info="Search and select multiple roles (Strapi relation)."
                                                hint="Type to search roles. Select multiple."
                                                options={jobRoles}
                                                value={safeValue}
                                                onChange={(ids) =>
                                                    field.onChange((ids || []).map(Number).filter(Number.isFinite))
                                                }
                                                error={errors.job_roles?.message}
                                                getLabel={(o) => o.title || o.attributes?.title || o.name || ""}
                                                getValue={(o) => Number(o.id)}
                                            />
                                        );
                                    }}
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

                                <Field label="Profile Verified" info="Set after document checks.">
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
                                <Field label="Number of Experience (Years)" info="Total experience in years." error={errors.numberOfExperience?.message}>
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

                                <Field label="Source" info='Schema uses "Source" but form uses "source".' error={errors.source?.message}>
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

                                <Field label="Previous Job Experience" info="Years." error={errors.previousJobExperiece?.message}>
                                    <Input {...register("previousJobExperiece")} type="number" min={0} step={1} />
                                </Field>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Field label="Current Company" info="Current company name (if any)." error={errors.currentCompany?.message}>
                                    <Input {...register("currentCompany")} placeholder="Company name" />
                                </Field>

                                <Field label="Current Job Experience" info="Years." error={errors.currentJobExperiece?.message}>
                                    <Input {...register("currentJobExperiece")} type="number" min={0} step={1} />
                                </Field>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Short Summary" info="Max 250 chars." error={errors.shortSummary?.message}>
                                    <Textarea {...register("shortSummary")} placeholder="e.g. Ready to join..." rows={4} maxLength={250} />
                                </Field>

                                <Field label="Private Notes" info="Internal only." error={errors.privateNotes?.message}>
                                    <Textarea {...register("privateNotes")} placeholder="Recruiter notes..." rows={4} maxLength={2000} />
                                </Field>
                            </div>
                        </div>

                        {/* ------------------ DOCUMENTS & MEDIA ------------------ */}
                        <div className="rounded-2xl border border-red-200 p-4">
                            <div className="text-base text-red-600 font-semibold">Documents & Media</div>
                            <div className="text-sm text-gray-800 mt-1">Upload/replace media files.</div>

                            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <Controller
                                    control={control}
                                    name="CV"
                                    render={({ field }) => (
                                        <div>
                                            <DropzoneBox
                                                label="CV"
                                                info="Strapi media: PDF or image."
                                                hint="Accepted: .pdf, .jpg, .png, .webp, .doc, .docx"
                                                acceptText="Accepted: .pdf, .jpg, .png, .webp, .doc, .docx"
                                                multiple={false}
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={errors.CV?.message}
                                            />
                                            {existingMedia?.CV?.url && !(CV instanceof File) ? (
                                                <a
                                                    href={existingMedia.CV.url}
                                                    target="_blank"
                                                    className="mt-2 inline-block text-xs text-red-700 hover:underline"
                                                >
                                                    View current CV ({existingMedia.CV.name || "file"})
                                                </a>
                                            ) : null}
                                        </div>
                                    )}
                                />

                                <Controller
                                    control={control}
                                    name="passport"
                                    render={({ field }) => (
                                        <div>
                                            <DropzoneBox
                                                label="Passport"
                                                info="Passport scan image or PDF."
                                                hint="Accepted: .pdf, .jpg, .png, .webp"
                                                acceptText="Accepted: .pdf, .jpg, .png, .webp"
                                                multiple={false}
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={errors.passport?.message}
                                            />
                                            {existingMedia?.passport?.url && !(passport instanceof File) ? (
                                                <a
                                                    href={existingMedia.passport.url}
                                                    target="_blank"
                                                    className="mt-2 inline-block text-xs text-red-700 hover:underline"
                                                >
                                                    View current Passport ({existingMedia.passport.name || "file"})
                                                </a>
                                            ) : null}
                                        </div>
                                    )}
                                />
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Passport Expiry Date" info="Used for visa processing." error={errors.passportExpireDate?.message}>
                                    <Input {...register("passportExpireDate")} type="date" />
                                </Field>
                            </div>

                            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <Controller
                                    control={control}
                                    name="workingVideo"
                                    render={({ field }) => (
                                        <div>
                                            <DropzoneBox
                                                label="Working Video"
                                                info="Upload single working video (mp4/mov/webm/mkv)."
                                                hint="Optional"
                                                acceptText="Accepted: .mp4, .mov, .webm, .mkv"
                                                multiple={false}
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={errors.workingVideo?.message}
                                            />
                                            {existingMedia?.workingVideo?.url && !(workingVideo instanceof File) ? (
                                                <a
                                                    href={existingMedia.workingVideo.url}
                                                    target="_blank"
                                                    className="mt-2 inline-block text-xs text-red-700 hover:underline"
                                                >
                                                    View current Working Video ({existingMedia.workingVideo.name || "file"})
                                                </a>
                                            ) : null}
                                        </div>
                                    )}
                                />
                            </div>

                            {/* Repeatable documents component */}
                            <div className="mt-4">
                                <DocumentsFieldArray control={control} register={register} errors={errors} name="documents" />
                            </div>
                        </div>

                        {/* ------------------ SCREENING ------------------ */}
                        <div className="rounded-2xl border border-red-200 p-4">
                            <div className="text-base text-red-600 font-semibold">Screening</div>
                            <div className="text-sm text-gray-800 mt-1">Interview date and video</div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Screening Interview Date" info="Optional." error={errors.dateScreeningInterview?.message}>
                                    <Input {...register("dateScreeningInterview")} type="date" />
                                </Field>

                                <Controller
                                    control={control}
                                    name="miScreeningVideo"
                                    render={({ field }) => (
                                        <div>
                                            <DropzoneBox
                                                label="MI Screening Video"
                                                info="Screening interview recording."
                                                acceptText="Accepted: .mp4, .mov, .webm, .mkv"
                                                multiple={false}
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={errors.miScreeningVideo?.message}
                                            />
                                            {existingMedia?.miScreeningVideo?.url && !(miScreeningVideo instanceof File) ? (
                                                <a
                                                    href={existingMedia.miScreeningVideo.url}
                                                    target="_blank"
                                                    className="mt-2 inline-block text-xs text-red-700 hover:underline"
                                                >
                                                    View current Screening Video ({existingMedia.miScreeningVideo.name || "file"})
                                                </a>
                                            ) : null}
                                        </div>
                                    )}
                                />
                            </div>
                        </div>

                        {/* ------------------ ACCOUNT ------------------ */}
                        <div className="rounded-2xl border border-red-200 p-4">
                            <div className="text-base text-red-600 font-semibold">Account</div>
                            <div className="text-sm text-gray-800 mt-1">Candidate login credentials.</div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Username" info="Login username." error={errors.username?.message}>
                                    <Input {...register("username")} />
                                </Field>

                                <Field label="Email" info="Login email." error={errors.email?.message}>
                                    <Input {...register("email")} />
                                </Field>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Password" info="Leave empty if you don't want to change." error={errors.password?.message}>
                                    <Controller
                                        control={control}
                                        name="password"
                                        render={({ field }) => (
                                            <PasswordInput value={field.value} onChange={field.onChange} autoComplete="new-password" placeholder="If password change required" error={errors.password?.message} />
                                        )}
                                    />
                                </Field>

                                <Field label="Retype Password" info="Must match password." error={errors.retypePassword?.message}>
                                    <Controller
                                        control={control}
                                        name="retypePassword"
                                        render={({ field }) => (
                                            <PasswordInput value={field.value} onChange={field.onChange} placeholder="Retype second time" error={errors.retypePassword?.message} />
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