"use client";

import * as React from "react";
import { Camera, X } from "lucide-react";

interface PhotoUploadProps {
    onPhotosChange: (photoUrls: string[]) => void;
    currentPhotos: string[];
}

export function PhotoUpload({ onPhotosChange, currentPhotos }: PhotoUploadProps) {
    const cameraInputRef = React.useRef<HTMLInputElement>(null);
    const galleryInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const { compressImage } = await import('@/lib/utils');
                const compressedDataUrl = await compressImage(file);
                onPhotosChange([...currentPhotos, compressedDataUrl]);
            } catch (error) {
                console.error("Compression failed:", error);
                const reader = new FileReader();
                reader.onloadend = () => {
                    onPhotosChange([...currentPhotos, reader.result as string]);
                };
                reader.readAsDataURL(file);
            }
        }
        // Reset the input so the same file can be selected again if needed
        e.target.value = '';
    };

    const handleRemove = (indexToRemove: number) => {
        const updated = currentPhotos.filter((_, i) => i !== indexToRemove);
        onPhotosChange(updated);
    };

    return (
        <div className="w-full space-y-4">
            {/* Hidden Inputs */}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={cameraInputRef}
                onChange={handleFileChange}
            />
            <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={galleryInputRef}
                onChange={handleFileChange}
            />

            {/* Render Existing Photos */}
            {currentPhotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {currentPhotos.map((photo, index) => (
                        <div key={index} className="relative w-full h-32 rounded-xl overflow-hidden shadow-sm border bg-black">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={photo}
                                alt={`Visit proof ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 backdrop-blur-sm transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Photo Buttons */}
            <div className="grid grid-cols-2 gap-3 h-24">
                <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-xl border-slate-300 bg-slate-50 transition-all active:scale-95 hover:bg-blue-50 hover:border-blue-200"
                >
                    <div className="p-2 bg-white rounded-full shadow-sm mb-1 text-blue-500">
                        <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-slate-700">Take Photo</span>
                </button>

                <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-xl border-slate-300 bg-slate-50 transition-all active:scale-95 hover:bg-slate-100"
                >
                    <div className="p-2 bg-white rounded-full shadow-sm mb-1 text-slate-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                    </div>
                    <span className="text-xs font-medium text-slate-700">Upload File</span>
                </button>
            </div>
        </div>
    );
}
