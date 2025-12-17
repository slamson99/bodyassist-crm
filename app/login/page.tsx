"use client";

import { useState } from "react";
import { authenticateUser } from "@/app/actions";
import { useUser } from "@/app/contexts/UserContext";
import { Lock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useUser();

    const handleDigit = (digit: string) => {
        if (pin.length < 6) {
            setPin(prev => prev + digit);
            setError("");
        }
    };

    const handleClear = () => {
        setPin("");
        setError("");
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
        setError("");
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (pin.length < 3) return;

        setLoading(true);
        setError("");

        try {
            const result = await authenticateUser(pin);
            if (result.success && result.user) {
                login(result.user);
            } else {
                setError(result.error || "Invalid PIN");
                setPin("");
            }
        } catch (err) {
            setError("Connection error. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl border-none">
                <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-4">
                        <div className="bg-blue-600 p-3 rounded-full text-white shadow-lg shadow-blue-500/30">
                            <Lock size={32} />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-800">Bodyassist CRM</CardTitle>
                    <CardDescription>Enter your PIN to access the portal</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* PIN Display */}
                    <div className="mb-8 flex justify-center space-x-2">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${i < pin.length
                                        ? "bg-blue-600 border-blue-600 scale-110"
                                        : "bg-transparent border-slate-300"
                                    }`}
                            />
                        ))}
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg text-center animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    {/* Keypad */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button
                                key={num}
                                onClick={() => handleDigit(num.toString())}
                                disabled={loading}
                                className="h-16 rounded-2xl bg-white border border-slate-100 shadow-sm text-2xl font-semibold text-slate-700 active:bg-slate-100 active:scale-95 transition-all hover:border-slate-200"
                            >
                                {num}
                            </button>
                        ))}
                        <button
                            onClick={handleClear}
                            disabled={loading}
                            className="h-16 rounded-2xl bg-slate-50 text-slate-500 font-medium active:bg-slate-100 active:scale-95 transition-all"
                        >
                            CLEAR
                        </button>
                        <button
                            onClick={() => handleDigit("0")}
                            disabled={loading}
                            className="h-16 rounded-2xl bg-white border border-slate-100 shadow-sm text-2xl font-semibold text-slate-700 active:bg-slate-100 active:scale-95 transition-all hover:border-slate-200"
                        >
                            0
                        </button>
                        <button
                            onClick={handleBackspace}
                            disabled={loading}
                            className="h-16 rounded-2xl bg-slate-50 text-slate-500 font-medium active:bg-slate-100 active:scale-95 transition-all"
                        >
                            ⌫
                        </button>
                    </div>

                    <Button
                        className="w-full h-14 text-lg font-semibold shadow-lg shadow-blue-500/20"
                        onClick={handleSubmit}
                        disabled={loading || pin.length < 3}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Verifying...
                            </>
                        ) : "Login"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
