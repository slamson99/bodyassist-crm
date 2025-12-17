"use client";

import * as React from "react";
import { Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
    onPhotoSelect: (photoDataUrl: string | null) => void;
    currentPhoto: string | null;
}

export function PhotoUpload({ onPhotoSelect, currentPhoto }: PhotoUploadProps) {
    const cameraInputRef = React.useRef<HTMLInputElement>(null);
    const galleryInputRef = React.useRef<HTMLInputElement>(null);

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
            {/* Camera Input (Forces Camera on Mobile) */}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={cameraInputRef}
                onChange={handleFileChange}
            />

            {/* Gallery Input (Allows File Selection) */}
            <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={galleryInputRef}
                onChange={handleFileChange}
            />

            {!currentPhoto ? (
                <div className="grid grid-cols-2 gap-3 h-32">
                    {/* Take Photo Button */}
                    <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-xl border-slate-300 bg-slate-50 transition-all active:scale-95 hover:bg-blue-50 hover:border-blue-200"
                    >
                        <div className="p-3 bg-white rounded-full shadow-sm mb-2 text-blue-500">
                            <Camera className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">Take Photo</span>
                    </button>

                    {/* Upload Button */}
                    <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-xl border-slate-300 bg-slate-50 transition-all active:scale-95 hover:bg-slate-100"
                    >
                        <div className="p-3 bg-white rounded-full shadow-sm mb-2 text-slate-500">
                            {/* Simple Upload Icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                        </div>
                        <span className="text-sm font-medium text-slate-700">Upload File</span>
                    </button>
                </div>
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
