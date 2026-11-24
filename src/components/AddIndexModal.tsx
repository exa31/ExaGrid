import { KeyRound, Plus, X } from 'lucide-react';
import { useState } from 'react';

import type { ColumnMeta, IndexDefinition } from '../types/database';

interface AddIndexModalProps {
  isOpen: boolean;
  tableName: string;
  columns: ColumnMeta[];
  onClose: () => void;
  onAdd: (idx: IndexDefinition) => Promise<void>;
}

export const AddIndexModal = ({
  isOpen,
  tableName,
  columns,
  onClose,
  onAdd,
}: AddIndexModalProps) => {
  const [indexName, setIndexName] = useState('');
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [isUnique, setIsUnique] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleToggleCol = (colName: string) => {
    setSelectedCols((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCols.length === 0) {
      alert('Please select at least one column for the index.');
      return;
    }

    const autoName =
      indexName.trim() || `idx_${tableName}_${selectedCols.join('_')}`.slice(0, 60);

    setIsSubmitting(true);
    try {
      await onAdd({
        name: autoName,
        columns: selectedCols,
        is_unique: isUnique,
      });
      setIndexName('');
      setSelectedCols([]);
      setIsUnique(false);
      onClose();
    } catch (err: any) {
      alert(`Failed to add index: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="h-12 border-b border-slate-800 px-5 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Create Index on <span className="text-indigo-400 font-mono">{tableName}</span>
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
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Index Name (Optional)
            </label>
            <input
              type="text"
              placeholder={`e.g. idx_${tableName}_col (Auto-generated if empty)`}
              value={indexName}
              onChange={(e) => setIndexName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Select Columns to Index * ({selectedCols.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-2 space-y-1">
              {columns.length === 0 ? (
                <div className="text-xs text-slate-500 p-2 text-center">No columns found</div>
              ) : (
                columns.map((col) => {
                  const isChecked = selectedCols.includes(col.name);
                  return (
                    <label
                      key={col.name}
                      onClick={() => handleToggleCol(col.name)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer text-xs transition ${
                        isChecked
                          ? 'bg-indigo-950/60 text-indigo-200 border border-indigo-800/60'
                          : 'text-slate-300 hover:bg-slate-900 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded bg-slate-900 border-slate-700 text-indigo-600 pointer-events-none"
                        />
                        <span className="font-mono">{col.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase">{col.data_type}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="unique-index-checkbox"
              checked={isUnique}
              onChange={(e) => setIsUnique(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:outline-hidden cursor-pointer"
            />
            <label htmlFor="unique-index-checkbox" className="text-xs text-slate-300 cursor-pointer">
              Unique Index (Enforce uniqueness)
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
              disabled={isSubmitting || selectedCols.length === 0}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium shadow-xs transition flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <span>Creating...</span>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Index</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
