import * as React from "react";

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const toast = React.useCallback(({ title, description }: ToastProps) => {
    // Simple implementation using window.alert for now
    // In production, this should use a proper toast library like sonner or radix-ui toast
    if (title && description) {
      alert(`${title}\n${description}`);
    } else if (title) {
      alert(title);
    } else if (description) {
      alert(description);
    }
  }, []);

  return { toast };
}
