import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="toast">
      <div className="w-10 h-10 rounded-full bg-[#ff3b30]/20 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-5 h-5 text-[#ff3b30]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[#f4f6fb]">{message}</p>
        <p className="text-xs text-[#a6acb8]">Click to view details</p>
      </div>
      <button
        onClick={onClose}
        className="text-[#a6acb8] hover:text-[#f4f6fb] transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
