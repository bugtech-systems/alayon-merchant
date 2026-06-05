// hooks/use-toast-simple.ts

import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
    
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return {
    toasts,
    toast: addToast,
    dismiss,
    success: (description: string, title?: string) => 
      addToast({ title, description, variant: "success" }),
    error: (description: string, title?: string) => 
      addToast({ title, description, variant: "destructive" }),
    info: (description: string, title?: string) => 
      addToast({ title, description, variant: "default" }),
  };
}

// Simple Toast Container Component
export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            p-4 rounded-lg shadow-lg animate-in slide-in-from-right-5
            ${toast.variant === "destructive" ? "bg-red-50 text-red-800 border border-red-200" : ""}
            ${toast.variant === "success" ? "bg-green-50 text-green-800 border border-green-200" : ""}
            ${!toast.variant || toast.variant === "default" ? "bg-white text-gray-800 border border-gray-200" : ""}
          `}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              {toast.title && <h4 className="font-semibold text-sm mb-1">{toast.title}</h4>}
              {toast.description && <p className="text-sm">{toast.description}</p>}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}