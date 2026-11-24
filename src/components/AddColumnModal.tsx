import { Plus, X } from 'lucide-react';
import { useState } from 'react';

import type { ColumnDefinition, DatabaseEngine } from '../types/database';

interface AddColumnModalProps {
  isOpen: boolean;
  tableName: string;
  engine: DatabaseEngine;
  onClose: () => void;
  onAdd: (col: ColumnDefinition) => Promise<void>;
}

const COMMON_DATA_TYPES = [
  'VARCHAR',
  'TEXT',
  'INT',
  'BIGINT',
  'BOOLEAN',
  'TIMESTAMP',
  'DATETIME',
  'DATE',
  'DECIMAL',
  'FLOAT',
  'DOUBLE',
  'JSON',
  'BLOB',
  'UUID',
];

export const AddColumnModal = ({
  isOpen,
  tableName,
  onClose,
  onAdd,
}: AddColumnModalProps) => {
  const [name, setName] = useState('');
  const [dataType, setDataType] = useState('VARCHAR');
  const [lengthOrPrecision, setLengthOrPrecision] = useState('255');
  const [nullable, setNullable] = useState(true);
  const [defaultValue, setDefaultValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        name: name.trim(),
        data_type: dataType,
        length_or_precision: lengthOrPrecision.trim() || undefined,
        nullable,
        is_primary_key: false,
        default_value: defaultValue.trim() || undefined,
      });
      setName('');
      setDataType('VARCHAR');
      setLengthOrPrecision('255');
      setNullable(true);
      setDefaultValue('');
      onClose();
    } catch (err: any) {
      alert(`Failed to add column: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="h-12 border-b border-slate-800 px-5 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Add Column to <span className="text-indigo-400 font-mono">{tableName}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Column Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. phone_number, is_verified"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Data Type</label>
              <select
                value={dataType}
                onChange={(e) => setDataType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono"
              >
                {COMMON_DATA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Length / Precision
              </label>
              <input
                type="text"
                placeholder="e.g. 255 or 10,2"
                value={lengthOrPrecision}
                onChange={(e) => setLengthOrPrecision(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Default Value</label>
            <input
              type="text"
              placeholder="e.g. 'active', 0, CURRENT_TIMESTAMP"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="nullable-checkbox"
              checked={nullable}
              onChange={(e) => setNullable(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:outline-hidden cursor-pointer"
            />
            <label htmlFor="nullable-checkbox" className="text-xs text-slate-300 cursor-pointer">
              Allow Null (Nullable)
            </label>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium shadow-xs transition flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <span>Adding...</span>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Column</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
