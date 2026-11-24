import { AlertCircle, Key, X } from 'lucide-react';
import { useState } from 'react';

import type { ColumnMeta, DatabaseEngine, ForeignKeyDefinition, TableMeta } from '../types/database';

interface AddForeignKeyModalProps {
  isOpen: boolean;
  tableName: string;
  columns: ColumnMeta[];
  tables: TableMeta[];
  engine: DatabaseEngine;
  onClose: () => void;
  onAdd: (fk: ForeignKeyDefinition) => Promise<void>;
}

export const AddForeignKeyModal = ({
  isOpen,
  tableName,
  columns,
  tables,
  engine: _engine,
  onClose,
  onAdd,
}: AddForeignKeyModalProps) => {
  const [fkName, setFkName] = useState('');
  const [localCol, setLocalCol] = useState(columns[0]?.name || '');
  const [foreignTable, setForeignTable] = useState(tables.find((t) => t.name !== tableName)?.name || '');
  const [foreignCol, setForeignCol] = useState('id');
  const [onDelete, setOnDelete] = useState<'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'>('RESTRICT');
  const [onUpdate, setOnUpdate] = useState<'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'>('CASCADE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const defaultName = fkName.trim() || `fk_${tableName}_${localCol || 'col'}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localCol || !foreignTable || !foreignCol) {
      setError('Please select local column, foreign table, and foreign column.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onAdd({
        name: defaultName,
        column: localCol,
        foreign_table: foreignTable,
        foreign_column: foreignCol,
        on_delete: onDelete,
        on_update: onUpdate,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add foreign key constraint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Add Foreign Key Constraint</h3>
              <p className="text-xs text-slate-400 font-mono">Table: {tableName}</p>
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
              Constraint Name
            </label>
            <input
              type="text"
              placeholder={defaultName}
              value={fkName}
              onChange={(e) => setFkName(e.target.value)}
              className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Local Column
              </label>
              <select
                value={localCol}
                onChange={(e) => setLocalCol(e.target.value)}
                className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500 transition"
              >
                {columns.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} ({col.data_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Referenced Table
              </label>
              <select
                value={foreignTable}
                onChange={(e) => setForeignTable(e.target.value)}
                className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500 transition"
              >
                {tables.map((tbl) => (
                  <option key={tbl.name} value={tbl.name}>
                    {tbl.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Referenced Column (in Foreign Table)
            </label>
            <input
              type="text"
              value={foreignCol}
              onChange={(e) => setForeignCol(e.target.value)}
              placeholder="e.g. id"
              className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                ON DELETE Rule
              </label>
              <select
                value={onDelete}
                onChange={(e) => setOnDelete(e.target.value as any)}
                className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="RESTRICT">RESTRICT</option>
                <option value="CASCADE">CASCADE</option>
                <option value="SET NULL">SET NULL</option>
                <option value="NO ACTION">NO ACTION</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                ON UPDATE Rule
              </label>
              <select
                value={onUpdate}
                onChange={(e) => setOnUpdate(e.target.value as any)}
                className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="CASCADE">CASCADE</option>
                <option value="RESTRICT">RESTRICT</option>
                <option value="SET NULL">SET NULL</option>
                <option value="NO ACTION">NO ACTION</option>
              </select>
            </div>
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
              <span>Add Foreign Key</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
