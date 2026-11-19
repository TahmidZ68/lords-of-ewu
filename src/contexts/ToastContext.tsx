import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'default' | 'success' | 'error';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    ({
      title,
      description,
      variant = 'default',
    }: {
      title: string;
      description?: string;
      variant?: ToastVariant;
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev, { id, title, description, variant }]);
      setTimeout(() => dismiss(id), 4800);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 z-[100] flex flex-col gap-2 sm:left-auto sm:max-w-sm">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              'flex items-start gap-3 rounded-sm border px-4 py-3 shadow-lg',
              item.variant === 'success' && 'border-forest bg-forest text-cream',
              item.variant === 'error' && 'border-red-800 bg-red-900 text-cream',
              item.variant === 'default' && 'border-forest/30 bg-cream-50 text-charcoal'
            )}
          >
            {item.variant === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />}
            {item.variant === 'error' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-cream" />}
            {item.variant === 'default' && <Info className="mt-0.5 h-4 w-4 shrink-0 text-forest" />}
            <div className="flex-1 text-sm">
              <p className="font-semibold">{item.title}</p>
              {item.description && <p className="mt-0.5 text-xs opacity-90">{item.description}</p>}
            </div>
            <button
              onClick={() => dismiss(item.id)}
              className="opacity-70 hover:opacity-100"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
