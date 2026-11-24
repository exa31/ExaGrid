import { AlertCircle, Database, X } from 'lucide-react';
import { useState } from 'react';

import type { DatabaseEngine } from '../types/database';

interface CreateDatabaseModalProps {
  isOpen: boolean;
  engine: DatabaseEngine;
  onClose: () => void;
  onCreate: (name: string, charset: string, collation: string) => Promise<void>;
}

const CHARSET_OPTIONS = [
  { value: 'utf8mb4', label: 'utf8mb4 (Recommended, Full Unicode & Emojis)' },
  { value: 'utf8', label: 'utf8 (3-byte UTF-8)' },
  { value: 'latin1', label: 'latin1 (ISO-8859-1 West European)' },
  { value: 'ascii', label: 'ascii (US ASCII)' },
];

const COLLATION_OPTIONS = [
  { value: 'utf8mb4_unicode_ci', label: 'utf8mb4_unicode_ci (Recommended, Accurate)' },
  { value: 'utf8mb4_general_ci', label: 'utf8mb4_general_ci (Fast)' },
  { value: 'utf8mb4_0900_ai_ci', label: 'utf8mb4_0900_ai_ci (MySQL 8.0 Default)' },
  { value: 'utf8_general_ci', label: 'utf8_general_ci' },
];

export const CreateDatabaseModal = ({
  isOpen,
  engine,
  onClose,
  onCreate,
}: CreateDatabaseModalProps) => {
  const [name, setName] = useState('');
  const [charset, setCharset] = useState('utf8mb4');
  const [collation, setCollation] = useState('utf8mb4_unicode_ci');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const trimmedName = name.trim();
  const q = engine === 'mysql' ? '`' : '"';
  const previewSql =
    engine === 'mysql'
      ? `CREATE DATABASE ${q}${trimmedName || 'new_database'}${q} CHARACTER SET ${charset} COLLATE ${collation};`
      : `CREATE DATABASE ${q}${trimmedName || 'new_database'}${q};`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedName) {
      setError('Database name is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onCreate(trimmedName, charset, collation);
      setName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create database');
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
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Create New Database</h3>
              <p className="text-[11px] text-slate-400">Create schema on {engine.toUpperCase()} server</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Database Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. analytics_db, production_v2"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500 font-mono"
            />
          </div>

          {engine === 'mysql' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Character Set</label>
                <select
                  value={charset}
                  onChange={(e) => setCharset(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                >
                  {CHARSET_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Collation</label>
                <select
                  value={collation}
                  onChange={(e) => setCollation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                >
                  {COLLATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">SQL Statement Preview</label>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap select-text">
              {previewSql}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !trimmedName}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
            >
              {loading ? (
                <span>Creating...</span>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  <span>Create Database</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
