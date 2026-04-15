
/*
export const metadata = {
    title: "Staff Area",
};

export default function ClientLayout({ children }) {
    return (
        <div className="min-h-screen flex">

            <main className="flex-1 p-6">{children}</main>
        </div>
    );
}
    */



import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function StaffLayout({ children }) {
    const session = await getSession();

    if (!session.isLoggedIn) {
        redirect("/login?next=/staff");
    }

    if (session.role !== "staff") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="border-b bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-red-700">Staff Panel</h2>
                        <p className="text-sm text-gray-500">
                            Welcome, {session.user?.username || session.user?.email}
                        </p>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-6" >{children}</main>
        </div>
    );
}

