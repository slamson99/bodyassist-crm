import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface QuickActionGridProps {
    options: string[];
    selectedActions: string[];
    onChange: (actions: string[]) => void;
}

export function QuickActionGrid({ options, selectedActions, onChange }: QuickActionGridProps) {
    const toggleAction = (action: string) => {
        if (selectedActions.includes(action)) {
            onChange(selectedActions.filter((a) => a !== action));
        } else {
            onChange([...selectedActions, action]);
        }
    };

    return (
        <div className="grid grid-cols-2 gap-3">
            {options.map((action) => {
                const isSelected = selectedActions.includes(action);
                return (
                    <button
                        key={action}
                        type="button"
                        onClick={() => toggleAction(action)}
                        className={cn(
                            "relative flex items-center justify-center p-4 text-sm font-medium transition-all rounded-lg border",
                            isSelected
                                ? "border-primary bg-primary/5 text-primary shadow-sm"
                                : "border-border bg-white text-muted-foreground hover:border-primary/50 hover:bg-slate-50"
                        )}
                    >
                        {isSelected && (
                            <div className="absolute top-2 right-2">
                                <Check size={14} className="text-primary" />
                            </div>
                        )}
                        {action}
                    </button>
                );
            })}
        </div>
    );
}
