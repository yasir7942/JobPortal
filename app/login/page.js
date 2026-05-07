// app/login/page.js
import { Suspense } from "react";
import LoginForm from "@/app/components/auth/LoginForm";
import { ClipLoader } from "react-spinners";

export const metadata = {
    title: "Login",
};

function LoginFormFallback() {
    return (
        <div className="flex justify-start items-center gap-3 text-sm text-gray-600">
            <ClipLoader size={25} color="#b91c1c" speedMultiplier={1} />
            <div className="text-left">Loading filters...</div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-md">
                <div className="rounded-3xl border border-red-100 bg-white shadow-2xl overflow-hidden">
                    <div className="bg-red-700 px-8 py-6 text-white">
                        <h1 className="text-2xl font-bold">Job Portal Login</h1>
                        <p className="mt-1 text-sm text-red-100">
                            Sign in with your email or username
                        </p>
                    </div>

                    <div className="p-8">
                        <Suspense fallback={<LoginFormFallback />}>
                            <LoginForm />
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    );
}