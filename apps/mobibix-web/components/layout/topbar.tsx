import { Button } from "@/components/ui/button";

export function Topbar() {
  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4">
      <div className="text-sm text-muted-foreground">Owner Dashboard</div>

      <Button size="sm" variant="outline">
        Logout
      </Button>
    </header>
  );
}
