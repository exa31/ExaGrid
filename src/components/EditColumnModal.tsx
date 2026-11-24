import { Code2, Edit3, X } from 'lucide-react';
import { useState } from 'react';

import { tauriBridge } from '../services/tauriBridge';
import type { ColumnDefinition, ColumnMeta, DatabaseEngine } from '../types/database';

interface EditColumnModalProps {
  isOpen: boolean;
  tableName: string;
  engine: DatabaseEngine;
  column: ColumnMeta | null;
  onClose: () => void;
  onSave: (oldColName: string, updatedCol: ColumnDefinition) => Promise<void>;
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

interface EditColumnFormProps {
  tableName: string;
  engine: DatabaseEngine;
  column: ColumnMeta;
  onClose: () => void;
  onSave: (oldColName: string, updatedCol: ColumnDefinition) => Promise<void>;
}

const EditColumnForm = ({
  tableName,
  engine,
  column,
  onClose,
  onSave,
}: EditColumnFormProps) => {
  const rawType = column.data_type.toUpperCase();
  const match = rawType.match(/^([A-Z]+)(?:\(([^)]+)\))?/);
  const initialType = match ? match[1] : rawType || 'VARCHAR';
  const initialLen = match ? match[2] || '' : '';

  const [name, setName] = useState(column.name);
  const [dataType, setDataType] = useState(initialType);
  const [lengthOrPrecision, setLengthOrPrecision] = useState(initialLen);
  const [nullable, setNullable] = useState(column.nullable);
  const [defaultValue, setDefaultValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewSql = tauriBridge.generateEditColumnSql(engine, tableName, column.name, {
    name: name.trim() || column.name,
    data_type: dataType,
    length_or_precision: lengthOrPrecision.trim() || undefined,
    nullable,
    is_primary_key: column.is_primary_key,
    default_value: defaultValue.trim() || undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave(column.name, {
        name: name.trim(),
        data_type: dataType,
        length_or_precision: lengthOrPrecision.trim() || undefined,
        nullable,
        is_primary_key: column.is_primary_key,
        default_value: defaultValue.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      alert(`Failed to edit column: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="h-12 border-b border-slate-800 px-5 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center space-x-2">
          <Edit3 className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-100">
            Edit Column <span className="text-indigo-400 font-mono">{column.name}</span> in{' '}
            <span className="text-slate-300 font-mono">{tableName}</span>
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Data Type</label>
            <select
              value={dataType}
              onChange={(e) => setDataType(e.target.value)}
              className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono cursor-pointer"
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
              className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono"
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
            className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono"
          />
        </div>

        <div className="flex items-center space-x-2 pt-1">
          <input
            type="checkbox"
            id="edit-nullable-checkbox"
            checked={nullable}
            onChange={(e) => setNullable(e.target.checked)}
            className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
          />
          <label htmlFor="edit-nullable-checkbox" className="text-xs text-slate-300 cursor-pointer">
            Allow NULL Values
          </label>
        </div>

        {/* Live SQL Preview */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center space-x-1.5 text-[11px] font-medium text-slate-400">
            <Code2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>SQL Preview ({engine.toUpperCase()})</span>
          </div>
          <pre className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg font-mono text-[11px] text-indigo-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {previewSql}
          </pre>
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : 'Apply Alteration'}
          </button>
        </div>
      </form>
    </>
  );
};

export const EditColumnModal = ({
  isOpen,
  tableName,
  engine,
  column,
  onClose,
  onSave,
}: EditColumnModalProps) => {
  if (!isOpen || !column) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <EditColumnForm
          key={`${tableName}-${column.name}`}
          tableName={tableName}
          engine={engine}
          column={column}
          onClose={onClose}
          onSave={onSave}
        />
      </div>
    </div>
  );
};
