"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, PlusCircle, History, Users, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useUser } from "@/app/contexts/UserContext";

export function Header() {
    const { logout, user } = useUser();

    return (
        <header className="bg-white border-b sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/">
                    <img
                        src="https://www.bodyassist.com/media/logo/websites/1/logo-m-bodyassist.png"
                        alt="Bodyassist"
                        className="h-8 w-auto object-contain"
                    />
                </Link>

                {/* Desktop/Tablet Navigation Shortcuts */}
                <nav className="hidden md:flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <LayoutDashboard size={16} />
                            Dashboard
                        </Button>
                    </Link>
                    <Link href="/customers">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <Users size={16} />
                            Customers
                        </Button>
                    </Link>
                    <Link href="/new-visit">
                        <Button size="sm" className="gap-2">
                            <PlusCircle size={16} />
                            New Visit
                        </Button>
                    </Link>
                    <div className="h-6 w-px bg-slate-200 mx-2" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            if (window.confirm("Are you sure you want to logout?")) {
                                logout();
                            }
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
                    >
                        <LogOut size={16} />
                        Logout
                    </Button>
                </nav>

                {/* Mobile User Icon / Placeholder */}
                <div className="md:hidden w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                    {user?.name?.charAt(0) || "U"}
                </div>
            </div>
        </header>
    );
}



export function BottomNav() {
    const router = useRouter();
    const { logout } = useUser();

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to logout?")) {
            logout();
        }
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t h-16 flex items-center justify-around z-50 md:hidden px-2">
            <Link href="/" className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-primary transition-colors">
                <Home size={20} />
                <span className="text-[10px] mt-1 font-medium">Home</span>
            </Link>
            <Link href="/customers" className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-primary transition-colors">
                <Users size={20} />
                <span className="text-[10px] mt-1 font-medium">Customers</span>
            </Link>
            <Link href="/new-visit" className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-primary transition-colors">
                <div className="bg-primary text-white p-2 rounded-full mb-1 shadow-lg transform -translate-y-2 hover:bg-blue-600 transition-colors">
                    <PlusCircle size={24} />
                </div>
            </Link>
            <Link href="/history" className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-primary transition-colors">
                <History size={20} />
                <span className="text-[10px] mt-1 font-medium">History</span>
            </Link>
            <button onClick={handleLogout} className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-red-600 transition-colors">
                <LogOut size={20} />
                <span className="text-[10px] mt-1 font-medium">Logout</span>
            </button>
        </nav>
    );
}
