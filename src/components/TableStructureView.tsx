import {
  Check,
  Code2,
  Copy,
  Database,
  FileCode,
  Key,
  KeyRound,
  Plus,
  RefreshCw,
  Table2,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import type {
  ColumnMeta,
  DatabaseEngine,
  IndexMeta,
  QueryResult,
  TableTabSubView,
} from '../types/database';
import { DataGrid } from './DataGrid';

interface TableStructureViewProps {
  tableName: string;
  engine: DatabaseEngine;
  subView: TableTabSubView;
  onChangeSubView: (view: TableTabSubView) => void;
  result: QueryResult | null;
  columns: ColumnMeta[];
  indexes: IndexMeta[];
  ddl: string;
  loading: boolean;
  onRefresh: () => void;
  onOpenAddColumn: () => void;
  onOpenAddIndex: () => void;
  onDropColumn: (colName: string) => void;
  onDropIndex: (indexName: string) => void;
  onOpenInSqlEditor: (sql: string) => void;
}

export const TableStructureView = ({
  tableName,
  engine: _engine,
  subView,
  onChangeSubView,
  result,
  columns,
  indexes,
  ddl,
  loading,
  onRefresh,
  onOpenAddColumn,
  onOpenAddIndex,
  onDropColumn,
  onDropIndex,
  onOpenInSqlEditor,
}: TableStructureViewProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyDdl = () => {
    if (!ddl) return;
    navigator.clipboard.writeText(ddl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Sub-View Tabs Header */}
      <div className="h-10 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-900/60 shrink-0">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onChangeSubView('data')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              subView === 'data'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Table2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Data</span>
            {result?.total_rows !== undefined && (
              <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 rounded">
                {result.total_rows}
              </span>
            )}
          </button>

          <button
            onClick={() => onChangeSubView('structure')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              subView === 'structure'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Columns ({columns.length})</span>
          </button>

          <button
            onClick={() => onChangeSubView('indexes')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              subView === 'indexes'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Indexes ({indexes.length})</span>
          </button>

          <button
            onClick={() => onChangeSubView('ddl')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              subView === 'ddl'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>DDL Script</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {subView === 'structure' && (
            <button
              onClick={onOpenAddColumn}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium shadow-xs transition flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add Column</span>
            </button>
          )}

          {subView === 'indexes' && (
            <button
              onClick={onOpenAddIndex}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-medium shadow-xs transition flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add Index</span>
            </button>
          )}

          {subView === 'ddl' && (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleCopyDdl}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium transition flex items-center space-x-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy DDL</span>
                  </>
                )}
              </button>
              <button
                onClick={() => onOpenInSqlEditor(ddl)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium transition flex items-center space-x-1"
              >
                <FileCode className="w-3 h-3" />
                <span>Open in SQL Editor</span>
              </button>
            </div>
          )}

          <button
            onClick={onRefresh}
            title="Refresh"
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content per Sub-View */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {subView === 'data' && (
          <DataGrid result={result} loading={loading} tableName={tableName} />
        )}

        {subView === 'structure' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">Column Name</th>
                    <th className="py-2.5 px-4">Data Type</th>
                    <th className="py-2.5 px-4 text-center">Nullable</th>
                    <th className="py-2.5 px-4 text-center">Key</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {columns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No columns found
                      </td>
                    </tr>
                  ) : (
                    columns.map((col, idx) => (
                      <tr key={col.name} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-4 text-center text-slate-500 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-200">
                          {col.name}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase bg-slate-800 text-indigo-300 border border-slate-700/60">
                            {col.data_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {col.nullable ? (
                            <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                              YES
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-400 bg-rose-950/40 border border-rose-800/40 px-1.5 py-0.5 rounded">
                              NOT NULL
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {col.is_primary_key && (
                            <span className="inline-flex items-center space-x-1 text-[10px] text-amber-300 bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.5 rounded font-medium">
                              <Key className="w-2.5 h-2.5 text-amber-400" />
                              <span>PK</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => onDropColumn(col.name)}
                            disabled={col.is_primary_key}
                            title={
                              col.is_primary_key
                                ? 'Cannot drop Primary Key directly'
                                : `Drop column ${col.name}`
                            }
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 disabled:opacity-30 disabled:hover:bg-transparent transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {subView === 'indexes' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">Index Name</th>
                    <th className="py-2.5 px-4">Columns</th>
                    <th className="py-2.5 px-4 text-center">Type</th>
                    <th className="py-2.5 px-4 text-center">Method</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {indexes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No indexes found
                      </td>
                    </tr>
                  ) : (
                    indexes.map((idx, i) => (
                      <tr key={idx.name} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-4 text-center text-slate-500 font-mono text-[11px]">
                          {i + 1}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-200">
                          {idx.name}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {idx.columns.map((col) => (
                              <span
                                key={col}
                                className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700/60"
                              >
                                {col}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {idx.is_primary ? (
                            <span className="text-[10px] text-amber-300 bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.5 rounded font-medium">
                              PRIMARY
                            </span>
                          ) : idx.is_unique ? (
                            <span className="text-[10px] text-purple-300 bg-purple-950/60 border border-purple-800/50 px-1.5 py-0.5 rounded font-medium">
                              UNIQUE
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                              INDEX
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono text-[11px] text-slate-400">
                          {idx.index_type || 'BTREE'}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => onDropIndex(idx.name)}
                            disabled={idx.is_primary}
                            title={
                              idx.is_primary
                                ? 'Cannot drop Primary Key index directly'
                                : `Drop index ${idx.name}`
                            }
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 disabled:opacity-30 disabled:hover:bg-transparent transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {subView === 'ddl' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="h-full bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-auto whitespace-pre leading-relaxed select-text">
              {ddl || '/* No DDL definition found */'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
