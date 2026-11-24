import { AlertCircle, Copy, X } from 'lucide-react';
import { useState } from 'react';

import type { DatabaseEngine } from '../types/database';

interface CloneTableModalProps {
  isOpen: boolean;
  sourceTable: string;
  engine: DatabaseEngine;
  onClose: () => void;
  onClone: (targetTable: string, withData: boolean) => Promise<void>;
}

export const CloneTableModal = ({
  isOpen,
  sourceTable,
  engine: _engine,
  onClose,
  onClone,
}: CloneTableModalProps) => {
  const [targetTable, setTargetTable] = useState('');
  const [withData, setWithData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const defaultTargetName = targetTable.trim() || `${sourceTable}_backup`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onClone(defaultTargetName, withData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to clone table');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Duplicate Table</h3>
              <p className="text-xs text-slate-400 font-mono">Source: {sourceTable}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              New Table Name
            </label>
            <input
              type="text"
              placeholder={defaultTargetName}
              value={targetTable}
              onChange={(e) => setTargetTable(e.target.value)}
              className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500 transition"
              autoFocus
            />
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
            <span className="text-xs font-medium text-slate-300 block">Copy Options</span>
            <label className="flex items-center space-x-2 text-xs text-slate-200 cursor-pointer select-none">
              <input
                type="radio"
                name="cloneMode"
                checked={withData}
                onChange={() => setWithData(true)}
                className="text-indigo-600 focus:ring-0"
              />
              <span>Clone structure and copy all records</span>
            </label>
            <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="radio"
                name="cloneMode"
                checked={!withData}
                onChange={() => setWithData(false)}
                className="text-indigo-600 focus:ring-0"
              />
              <span>Clone table structure only (empty table)</span>
            </label>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              {loading && (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>Duplicate Table</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
