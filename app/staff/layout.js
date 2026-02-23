

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

