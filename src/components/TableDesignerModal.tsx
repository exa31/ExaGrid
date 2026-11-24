import {
  Code2,
  Columns3,
  KeyRound,
  Plus,
  Table2,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { tauriBridge } from '../services/tauriBridge';
import type {
  ColumnDefinition,
  DatabaseEngine,
  IndexDefinition,
  TableSchemaSpec,
} from '../types/database';

interface TableDesignerModalProps {
  isOpen: boolean;
  engine: DatabaseEngine;
  databaseName?: string;
  onClose: () => void;
  onCreateSuccess: (tableName: string) => void;
}

const DATA_TYPES = [
  'VARCHAR',
  'TEXT',
  'INT',
  'BIGINT',
  'SMALLINT',
  'BOOLEAN',
  'TIMESTAMP',
  'DATETIME',
  'DATE',
  'TIME',
  'DECIMAL',
  'FLOAT',
  'DOUBLE',
  'JSON',
  'BLOB',
  'UUID',
];

export const TableDesignerModal = ({
  isOpen,
  engine,
  databaseName,
  onClose,
  onCreateSuccess,
}: TableDesignerModalProps) => {
  const [tableName, setTableName] = useState('');
  const [activeTab, setActiveTab] = useState<'columns' | 'indexes' | 'preview'>('columns');

  const [columns, setColumns] = useState<ColumnDefinition[]>([
    {
      name: 'id',
      data_type: engine === 'mysql' ? 'BIGINT' : 'INT',
      length_or_precision: '',
      nullable: false,
      is_primary_key: true,
      auto_increment: true,
      default_value: '',
    },
    {
      name: 'name',
      data_type: 'VARCHAR',
      length_or_precision: '255',
      nullable: false,
      is_primary_key: false,
      auto_increment: false,
      default_value: '',
    },
    {
      name: 'created_at',
      data_type: 'TIMESTAMP',
      length_or_precision: '',
      nullable: true,
      is_primary_key: false,
      auto_increment: false,
      default_value: 'CURRENT_TIMESTAMP',
    },
  ]);

  const [indexes, setIndexes] = useState<IndexDefinition[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const spec: TableSchemaSpec = useMemo(
    () => ({
      table_name: tableName.trim() || 'new_table',
      columns,
      indexes,
    }),
    [tableName, columns, indexes]
  );

  const generatedSql = useMemo(
    () => tauriBridge.generateCreateTableSql(engine, spec),
    [engine, spec]
  );

  if (!isOpen) return null;

  const handleAddColumn = () => {
    setColumns((prev) => [
      ...prev,
      {
        name: `column_${prev.length + 1}`,
        data_type: 'VARCHAR',
        length_or_precision: '255',
        nullable: true,
        is_primary_key: false,
        auto_increment: false,
        default_value: '',
      },
    ]);
  };

  const handleRemoveColumn = (index: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const handleColumnChange = (
    index: number,
    field: keyof ColumnDefinition,
    value: any
  ) => {
    setColumns((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const handleAddIndex = () => {
    const firstCol = columns[0]?.name || 'id';
    setIndexes((prev) => [
      ...prev,
      {
        name: `idx_${tableName || 'table'}_${firstCol}_${prev.length + 1}`,
        columns: [firstCol],
        is_unique: false,
      },
    ]);
  };

  const handleRemoveIndex = (index: number) => {
    setIndexes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleIndexChange = (
    index: number,
    field: keyof IndexDefinition,
    value: any
  ) => {
    setIndexes((prev) =>
      prev.map((idx, i) => (i === index ? { ...idx, [field]: value } : idx))
    );
  };

  const handleToggleIndexCol = (indexIdx: number, colName: string) => {
    setIndexes((prev) =>
      prev.map((idx, i) => {
        if (i !== indexIdx) return idx;
        const exists = idx.columns.includes(colName);
        const newCols = exists
          ? idx.columns.filter((c) => c !== colName)
          : [...idx.columns, colName];
        return { ...idx, columns: newCols };
      })
    );
  };

  const handleCreate = async () => {
    if (!tableName.trim()) {
      alert('Please enter a valid table name');
      return;
    }
    if (columns.length === 0) {
      alert('A table must have at least one column');
      return;
    }

    setIsSubmitting(true);
    try {
      onCreateSuccess(tableName.trim());
      onClose();
    } catch (err: any) {
      alert(`Failed to create table: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Table2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Create New Table</h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Database: {databaseName || 'default'} ({engine.toUpperCase()})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Controls: Table Name & Sub-Tabs */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <label className="text-xs font-medium text-slate-300 shrink-0">Table Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. orders, user_profiles"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('columns')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
                activeTab === 'columns'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Columns ({columns.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('indexes')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
                activeTab === 'indexes'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Indexes ({indexes.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
                activeTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>SQL Preview</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'columns' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  Define table columns, types, and constraints:
                </span>
                <button
                  onClick={handleAddColumn}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium transition flex items-center space-x-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Column</span>
                </button>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Column Name</th>
                      <th className="py-2.5 px-3">Data Type</th>
                      <th className="py-2.5 px-3">Length</th>
                      <th className="py-2.5 px-3 text-center">PK</th>
                      <th className="py-2.5 px-3 text-center">Nullable</th>
                      <th className="py-2.5 px-3 text-center">Auto Inc</th>
                      <th className="py-2.5 px-3">Default</th>
                      <th className="py-2.5 px-3 text-center w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {columns.map((col, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50 transition">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={col.name}
                            onChange={(e) => handleColumnChange(idx, 'name', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={col.data_type}
                            onChange={(e) => handleColumnChange(idx, 'data_type', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                          >
                            {DATA_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 w-20">
                          <input
                            type="text"
                            placeholder="255"
                            value={col.length_or_precision || ''}
                            onChange={(e) =>
                              handleColumnChange(idx, 'length_or_precision', e.target.value)
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={col.is_primary_key}
                            onChange={(e) => {
                              handleColumnChange(idx, 'is_primary_key', e.target.checked);
                              if (e.target.checked) {
                                handleColumnChange(idx, 'nullable', false);
                              }
                            }}
                            className="rounded bg-slate-900 border-slate-700 text-indigo-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={col.nullable}
                            disabled={col.is_primary_key}
                            onChange={(e) => handleColumnChange(idx, 'nullable', e.target.checked)}
                            className="rounded bg-slate-900 border-slate-700 text-indigo-600 disabled:opacity-30 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={col.auto_increment || false}
                            onChange={(e) =>
                              handleColumnChange(idx, 'auto_increment', e.target.checked)
                            }
                            className="rounded bg-slate-900 border-slate-700 text-indigo-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="NULL"
                            value={col.default_value || ''}
                            onChange={(e) =>
                              handleColumnChange(idx, 'default_value', e.target.value)
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveColumn(idx)}
                            disabled={columns.length <= 1}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 disabled:opacity-20 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'indexes' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  Configure custom table indexes:
                </span>
                <button
                  onClick={handleAddIndex}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-medium transition flex items-center space-x-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Index</span>
                </button>
              </div>

              {indexes.length === 0 ? (
                <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
                  No secondary indexes defined yet. Primary key index is created automatically.
                </div>
              ) : (
                <div className="space-y-2">
                  {indexes.map((idx, i) => (
                    <div
                      key={i}
                      className="p-3 border border-slate-800 rounded-xl bg-slate-950/60 flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-3">
                          <input
                            type="text"
                            placeholder="Index name"
                            value={idx.name}
                            onChange={(e) => handleIndexChange(i, 'name', e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
                          />
                          <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={idx.is_unique}
                              onChange={(e) => handleIndexChange(i, 'is_unique', e.target.checked)}
                              className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                            />
                            <span>Unique</span>
                          </label>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] text-slate-400">Indexed Columns:</span>
                          {columns.map((c) => {
                            const isSelected = idx.columns.includes(c.name);
                            return (
                              <button
                                key={c.name}
                                type="button"
                                onClick={() => handleToggleIndexCol(i, c.name)}
                                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white font-medium'
                                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                                }`}
                              >
                                {c.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveIndex(i)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="h-64 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-indigo-200 overflow-auto whitespace-pre leading-relaxed select-text">
              {generatedSql}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 border-t border-slate-800 px-6 flex items-center justify-between bg-slate-950/80 shrink-0">
          <p className="text-[11px] text-slate-500">
            {columns.length} columns, {indexes.length} secondary indexes
          </p>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || !tableName.trim() || columns.length === 0}
              onClick={handleCreate}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <span>Creating...</span>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Table</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
