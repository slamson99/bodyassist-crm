"use client";

import * as React from "react";
import { Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
    onPhotoSelect: (photoDataUrl: string | null) => void;
    currentPhoto: string | null;
}

export function PhotoUpload({ onPhotoSelect, currentPhoto }: PhotoUploadProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onPhotoSelect(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="w-full">
            <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />

            {!currentPhoto ? (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl border-slate-300 bg-slate-50 transition-colors hover:bg-slate-100 hover:border-primary/50"
                >
                    <div className="p-3 bg-white rounded-full shadow-sm mb-3">
                        <Camera className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-slate-600">Take a photo</span>
                    <span className="text-xs text-slate-400 mt-1">or select from library</span>
                </button>
            ) : (
                <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-sm border bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={currentPhoto}
                        alt="Visit proof"
                        className="w-full h-full object-contain"
                    />
                    <button
                        type="button"
                        onClick={() => onPhotoSelect(null)}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-sm"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
