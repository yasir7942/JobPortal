"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Header from "@/app/components/layouts/staff/Header";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import ContactListFieldArray from "../../ui/ContactListFieldArray";


/* Schema */
const EditClientSchema = z
    .object({


        companyName: z.string().min(2, "Company name is required"),
        ownerName: z.string().min(2, "Owner name is required"),

        country: z.string().min(1, "Country is required"),
        city: z.string().min(1, "City is required"),
        address: z.string().min(3, "Address is required"),

        phone: z.string().min(7, "Phone is required").max(25, "Max 25 chars"),
        website: z
            .string()
            .optional()
            .or(z.literal(""))
            .refine((v) => !v || /^https?:\/\/.+/i.test(v), "Website must start with http:// or https://"),

        email: z.string().email("Invalid email"),
        username: z.string().min(3, "Min 3 characters"),

        // optional password update (same pattern as candidate)
        setPassword: z.boolean().default(false),
        password: z.string().optional(),
        confirmPassword: z.string().optional(),

        contactList: z
            .array(
                z.object({
                    name: z.string().min(1, "Name is required"),
                    designation: z.string().max(80, "Max 80 chars").optional().or(z.literal("")),
                    mobile: z.string().min(7, "Mobile is required").max(25, "Max 25 chars"),
                    remarks: z.string().max(200, "Max 200 chars").optional().or(z.literal("")),
                })
            )
            .default([]),
    })
    .superRefine((val, ctx) => {
        if (val.setPassword) {
            if (!val.password || val.password.length < 8) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Min 8 characters" });
            }
            if (!val.confirmPassword) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Retype required" });
            }
            if (val.password && val.confirmPassword && val.password !== val.confirmPassword) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords do not match" });
            }
        }
    });

/* UI bits (same styles) */
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
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-amber-200"
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

/* Dummy loader */
function getDummyClient(id) {
    return {
        companyName: `Demo Company ${id}`,
        ownerName: "Usman Ali",
        country: "Pakistan",
        city: "Lahore",
        address: "Street 10, Block A, DHA",

        phone: "+92 300 1234567",
        website: "https://example.com",

        email: "client@example.com",
        username: "client.demo",

        setPassword: false,
        password: "",
        confirmPassword: "",

        contactList: [
            { name: "Bilal Ahmed", designation: "HR Manager", mobile: "+92 333 1112222", remarks: "Primary contact" },
            { name: "Sara Khan", designation: "Operations", mobile: "+92 321 9998888", remarks: "Call after 4pm" },
        ],
    };
}

export default function EditClientPage({ params }) {
    const id = params?.id;

    const [submitMsg, setSubmitMsg] = useState("");

    const {
        register,
        control,
        watch,
        reset,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(EditClientSchema),
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

            setPassword: false,
            password: "",
            confirmPassword: "",

            contactList: [],
        },
    });

    const setPassword = watch("setPassword");

    useEffect(() => {
        reset(getDummyClient(Number(id)));
    }, [id, reset]);

    const onSubmit = async (data) => {
        setSubmitMsg("");
        console.log("Client Edit payload:", data);
        setSubmitMsg("Client updated (dummy). Later connect to Strapi.");
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="mx-auto w-[95%] lg:w-[80%] px-2 sm:px-4 py-5">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <header className="border-b border-gray-200 bg-white px-4 py-4">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <div className="text-lg text-gray-900">Edit Client</div>
                                <div className="text-sm text-gray-600">ID: {id}</div>
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
                                <Input {...register("companyName")} placeholder="e.g. Atlantic Group" />
                            </Field>

                            <Field label="Owner Name" error={errors.ownerName?.message}>
                                <Input {...register("ownerName")} placeholder="e.g. Yasir Aslam" />
                            </Field>
                        </div>

                        {/* Location */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Field label="Country" error={errors.country?.message}>
                                <Select {...register("country")}>
                                    <option value="">Choose here</option>
                                    <option value="Pakistan">Pakistan</option>
                                    <option value="UAE">UAE</option>
                                    <option value="KSA">KSA</option>
                                    <option value="Canada">Canada</option>
                                    <option value="Other">Other</option>
                                </Select>
                            </Field>

                            <Field label="City" error={errors.city?.message}>
                                <Input {...register("city")} placeholder="e.g. Karachi" />
                            </Field>

                            <Field label="Phone" error={errors.phone?.message}>
                                <Input {...register("phone")} placeholder="+92 3xx xxxxxxx" />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Website" error={errors.website?.message}>
                                <Input {...register("website")} placeholder="https://..." />
                            </Field>

                            <Field label="Email" error={errors.email?.message}>
                                <Input {...register("email")} placeholder="client@email.com" />
                            </Field>
                        </div>

                        <Field label="Address" error={errors.address?.message}>
                            <Textarea {...register("address")} rows={3} placeholder="Full address..." />
                        </Field>

                        {/* Username */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Username" error={errors.username?.message}>
                                <Input {...register("username")} placeholder="e.g. atlantic.client" />
                            </Field>
                        </div>

                        {/* Contact List FieldArray */}
                        <ContactListFieldArray control={control} register={register} errors={errors} name="contactList" />

                        {/* Password optional */}
                        <div className="rounded-2xl border border-gray-200 p-4">
                            <div className="text-sm text-gray-900">Password</div>

                            <div className="mt-3 flex items-center gap-2">
                                <input type="checkbox" {...register("setPassword")} className="h-4 w-4" id="setPassword" />
                                <label htmlFor="setPassword" className="text-sm text-gray-800">
                                    Set / Update Password (optional)
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
                                {isSubmitting ? "Saving..." : "Update Client"}
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