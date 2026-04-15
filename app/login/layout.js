
import "../../app/globals.css";
import { Open_Sans } from "next/font/google";


const openSans = Open_Sans({
    subsets: ["latin"],
    weight: ["300", "400", "600", "700"],
});

export const metadata = {
    title: "MatchWorker Job Portal",
    description: "Job Portal by Match Workers",
};


export default function RootLayout({ children }) {
    return (
        <html lang="en" >
            <body className={openSans.className}>
                <div className="bg-gray-400">{children}</div>
            </body>
        </html>
    );
}