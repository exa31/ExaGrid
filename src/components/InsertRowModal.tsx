import { Code2, PlusCircle, X } from 'lucide-react';
import { useState } from 'react';

import { tauriBridge } from '../services/tauriBridge';
import type { ColumnMeta, DatabaseEngine } from '../types/database';

interface InsertRowModalProps {
  isOpen: boolean;
  tableName: string;
  columns: ColumnMeta[];
  engine: DatabaseEngine;
  onClose: () => void;
  onInsert: (values: Record<string, any>) => Promise<void>;
}

export const InsertRowModal = ({
  isOpen,
  tableName,
  columns,
  engine,
  onClose,
  onInsert,
}: InsertRowModalProps) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [nullFlags, setNullFlags] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleValueChange = (colName: string, val: string) => {
    setValues((prev) => ({ ...prev, [colName]: val }));
    if (nullFlags[colName]) {
      setNullFlags((prev) => ({ ...prev, [colName]: false }));
    }
  };

  const handleToggleNull = (colName: string, isNull: boolean) => {
    setNullFlags((prev) => ({ ...prev, [colName]: isNull }));
    if (isNull) {
      setValues((prev) => {
        const copy = { ...prev };
        delete copy[colName];
        return copy;
      });
    }
  };

  // Build values payload for SQL generator
  const payload: Record<string, any> = {};
  for (const col of columns) {
    if (nullFlags[col.name]) {
      payload[col.name] = null;
    } else if (values[col.name] !== undefined && values[col.name] !== '') {
      payload[col.name] = values[col.name];
    }
  }

  const previewSql = tauriBridge.generateInsertRowSql(engine, tableName, payload);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onInsert(payload);
      setValues({});
      setNullFlags({});
      onClose();
    } catch (err: any) {
      alert(`Insert failed: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="h-12 border-b border-slate-800 px-5 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center space-x-2">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Insert New Row into <span className="text-emerald-400 font-mono">{tableName}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
            <p className="text-xs text-slate-400">
              Provide column values below. Leave empty for columns with auto-increment or default values.
            </p>

            <div className="space-y-3">
              {columns.map((col) => {
                const isNull = nullFlags[col.name] || false;
                const isPk = col.is_primary_key;

                return (
                  <div
                    key={col.name}
                    className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-semibold text-slate-200">
                          {col.name}
                        </span>
                        <span className="text-[10px] font-mono uppercase bg-slate-800 text-indigo-300 px-1.5 py-0.2 rounded border border-slate-700/60">
                          {col.data_type}
                        </span>
                        {isPk && (
                          <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800/60 px-1.5 py-0.2 rounded font-sans">
                            PK
                          </span>
                        )}
                        {!col.nullable && (
                          <span className="text-[9px] text-rose-400 bg-rose-950/60 border border-rose-800/50 px-1 rounded">
                            REQUIRED
                          </span>
                        )}
                      </div>

                      {col.nullable && (
                        <label className="flex items-center space-x-1.5 text-xs text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isNull}
                            onChange={(e) => handleToggleNull(col.name, e.target.checked)}
                            className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          />
                          <span className="text-[11px]">Set NULL</span>
                        </label>
                      )}
                    </div>

                    <input
                      type="text"
                      disabled={isNull}
                      placeholder={
                        isPk
                          ? 'Auto-generated (or enter specific ID)'
                          : isNull
                          ? 'NULL'
                          : `Enter ${col.data_type} value...`
                      }
                      value={values[col.name] || ''}
                      onChange={(e) => handleValueChange(col.name, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                );
              })}
            </div>

            {/* Live SQL Preview */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center space-x-1.5 text-[11px] font-medium text-slate-400">
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Generated SQL Statement</span>
              </div>
              <pre className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {previewSql}
              </pre>
            </div>
          </div>

          <div className="h-14 border-t border-slate-800 px-5 flex items-center justify-end space-x-2 bg-slate-950/60 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Inserting...' : 'Insert Row'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
