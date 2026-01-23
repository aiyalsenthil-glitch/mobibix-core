"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Wrench, FileText, Palette, Sun, Moon } from "lucide-react";
import { useDarkMode } from "@/components/theme/mode-provider";
import { useThemeColor } from "@/components/theme/theme-provider";

export default function HomePage() {
  const { setPrimary } = useThemeColor();
  const { dark, toggle } = useDarkMode();

  const themes = [
    { id: "blue", name: "Classic Blue", value: "0.488 0.243 264.376" },
    { id: "green", name: "Repair Green", value: "0.696 0.17 162.48" },
    { id: "orange", name: "Service Orange", value: "0.769 0.188 70.08" },
    { id: "rose", name: "Modern Rose", value: "0.645 0.246 16.439" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/70 backdrop-blur px-6 py-4">
        <div className="text-xl font-bold">MobiBix</div>

        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                className="bg-muted/40 text-foreground hover:bg-muted"
              >
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-64">
              <div className="mb-2 text-sm font-medium">Choose Theme</div>

              <div className="grid grid-cols-2 gap-3">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setPrimary(theme.value)}
                    className="
            flex items-center gap-2 rounded-lg border p-2 text-left
            transition hover:border-primary hover:bg-muted
            focus:outline-none focus:ring-2 focus:ring-ring
          "
                  >
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: `oklch(${theme.value})` }}
                    />
                    <span className="text-xs font-medium">{theme.name}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            size="icon"
            onClick={toggle}
            className="bg-muted/40 text-foreground hover:bg-muted"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Link href="/login">
            <Button>Login</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main
        className="
    relative flex h-screen flex-col items-center justify-center overflow-hidden
    bg-black
  "
      >
        {/* Depth background */}
        <div className="absolute inset-0">
          {/* Primary glow */}
          <div
            className="absolute left-1/2 top-[45%] h-[700px] w-[700px]
    -translate-x-1/2 -translate-y-1/2
    rounded-full bg-primary/25 blur-[120px]"
          />

          {/* Secondary shadow */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
        </div>

        {/* Hero device */}
        <div className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-[60%]">
          <div
            className="relative h-[520px] w-[260px] rounded-[36px]
    bg-gradient-to-b from-neutral-800 to-black
    shadow-[0_40px_120px_rgba(0,0,0,0.8)]
    ring-1 ring-white/10
    animate-[float_12s_ease-in-out_infinite]
  "
          >
            {/* Screen */}
            <div className="absolute inset-[14px] rounded-[26px] bg-black" />
          </div>
        </div>

        <h1 className="relative z-10 max-w-4xl text-center text-5xl font-black tracking-tight text-white md:text-7xl">
          Run Your Mobile Shop{" "}
          <span className="text-primary drop-shadow-[0_0_30px_oklch(var(--primary)/0.8)]">
            Smarter
          </span>
        </h1>

        <h4
          className="relative z-10 max-w-4xl text-center
  text-5xl font-black tracking-tight text-white md:text-7xl"
        >
          Manage repair job cards, track device status, handle billing, and run
          your mobile shop efficiently — all in one place.
        </h4>

        <div className="relative z-10 mt-6 flex gap-3">
          <Button className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-primary dark:hover:bg-primary/90">
            Login
          </Button>
          <Button
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-100
               dark:border-border dark:text-foreground dark:hover:bg-muted"
          >
            Request Demo
          </Button>
        </div>
      </main>
      <div className="h-24 bg-gradient-to-b from-muted to-background" />

      {/* Features */}
      <section className="bg-background px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <Smartphone className="h-8 w-8 text-primary" />
            <h3 className="mt-4 text-lg font-semibold text-white">Job Cards</h3>
            <p className="mt-2 text-sm text-white/70">
              Create, track, and manage repair job cards with ease.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <Wrench className="h-8 w-8 text-primary" />
            <h3 className="mt-4 text-lg font-semibold text-white">
              Repair Tracking
            </h3>
            <p className="mt-2 text-sm text-white/70">
              Update repair status and keep customers informed.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <FileText className="h-8 w-8 text-primary" />
            <h3 className="mt-4 text-lg font-semibold text-white">
              Billing & Reports
            </h3>
            <p className="mt-2 text-sm text-white/70">
              Generate bills, print receipts, and view business reports.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-4 text-center text-sm text-foreground/60">
        © {new Date().getFullYear()} MobiBix. All rights reserved.
      </footer>
    </div>
  );
}
