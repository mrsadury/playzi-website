import { type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;

  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }[size];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-dark-bg/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${sizeClass} animate-scale-in`}>
        <div className="card max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between border-b border-dark-border px-5 py-4">
            <h3 className="text-lg font-semibold text-surface-light">{title}</h3>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-btn text-surface-light/50 hover:bg-dark-hover">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[calc(90vh-60px)] overflow-y-auto p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
