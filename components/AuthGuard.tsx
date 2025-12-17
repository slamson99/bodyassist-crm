"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const isAuth = localStorage.getItem("bodyassist_auth") === "true";

        if (!isAuth && pathname !== "/login") {
            router.push("/login");
        } else {
            setAuthorized(true);
        }
    }, [pathname, router]);

    // Prevent flash of content
    if (!authorized && pathname !== "/login") {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading...</div>;
    }

    return <>{children}</>;
}
