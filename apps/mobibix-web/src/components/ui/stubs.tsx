import * as React from "react";
import { cn } from "@/lib/utils";

export function ScrollArea({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-auto", className)}>
      {children}
    </div>
  );
}

export function Avatar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-100", className)}>
      {children}
    </div>
  );
}

export function AvatarFallback({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)}>
      {children}
    </div>
  );
}
