"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
    name: string;
    areaCode?: string;
}

interface UserContextType {
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Hydrate from localStorage
        const stored = localStorage.getItem("bodyassist_user");
        if (stored) {
            try {
                setUser(JSON.parse(stored));
                setIsAuthenticated(true);
            } catch (e) {
                localStorage.removeItem("bodyassist_user");
            }
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (isLoading) return;

        // Route protection
        if (!isAuthenticated && pathname !== "/login") {
            router.push("/login");
        }
    }, [isAuthenticated, pathname, isLoading, router]);

    const login = (userData: User) => {
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem("bodyassist_user", JSON.stringify(userData));
        router.push("/");
    };

    const logout = () => {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("bodyassist_user");
        router.push("/login");
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading...</div>;
    }

    return (
        <UserContext.Provider value={{ user, login, logout, isAuthenticated }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
}
