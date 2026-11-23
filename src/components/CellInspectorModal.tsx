import React from 'react';
import { X, Copy, Check } from 'lucide-react';

interface CellInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: any;
}

export const CellInspectorModal: React.FC<CellInspectorModalProps> = ({
  isOpen,
  onClose,
  title,
  value,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const formattedText =
    typeof value === 'object' && value !== null
      ? JSON.stringify(value, null, 2)
      : String(value ?? 'NULL');

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Cell Inspector
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-sm font-medium text-emerald-400 font-mono">{title}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-100 rounded-md hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="p-4 overflow-auto flex-1 font-mono text-xs bg-slate-950 text-slate-200">
          <pre className="whitespace-pre-wrap break-all leading-relaxed select-text">
            {formattedText}
          </pre>
        </div>
      </div>
    </div>
  );
};
