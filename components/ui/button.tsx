import * as React from "react"

import { cn } from "@/lib/utils"

// Since I didn't install cva, I'll install it or just use simple cn logic.
// Ah, best to install 'class-variance-authority' and '@radix-ui/react-slot' for standard shadcn implementation.
// Let me quickly install them in the background task or just write a simpler button if I don't want to wait.
// I'll write a simpler one for now to avoid blocking, but wait...
// "cva" is standard. I'll add 'class-variance-authority' to the install list or just run it now.
// Actually, I can build a robust button without CVA too, but CVA is cleaner.
// I'll stick to simple prop logic for speed and no extra deps if I missed them. 
// Wait, I missed installing them. I'll just write standard React components with clsx/tailwind-merge.

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    size?: "default" | "sm" | "lg" | "icon"
    asChild?: boolean // skipping slot logic for simplicity unless requested
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {

        const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

        const variants = {
            default: "bg-primary text-primary-foreground hover:bg-primary/90",
            destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            ghost: "hover:bg-accent hover:text-accent-foreground",
            link: "text-primary underline-offset-4 hover:underline",
        }

        const sizes = {
            default: "h-10 px-4 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-11 rounded-md px-8",
            icon: "h-10 w-10",
        }

        return (
            <button
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
