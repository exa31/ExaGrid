import {
  BarChart2,
  Check,
  Code2,
  Copy,
  Database,
  FileCode,
  GitFork,
  Key,
  KeyRound,
  Link,
  Pencil,
  Plus,
  PlusCircle,
  RefreshCw,
  Table2,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import type {
  ColumnMeta,
  DatabaseEngine,
  ForeignKeyMeta,
  IndexMeta,
  QueryResult,
  TableMeta,
  TableStatsMeta,
  TableTabSubView,
} from '../types/database';
import { ContextMenu, type ContextMenuSection } from './ContextMenu';
import { DataGrid } from './DataGrid';
import { ERDiagramView } from './ERDiagramView';
import { TableStatsView } from './TableStatsView';

interface TableStructureViewProps {
  tableName: string;
  engine: DatabaseEngine;
  subView: TableTabSubView;
  onChangeSubView: (view: TableTabSubView) => void;
  result: QueryResult | null;
  columns: ColumnMeta[];
  indexes: IndexMeta[];
  foreignKeys?: ForeignKeyMeta[];
  tables?: TableMeta[];
  stats?: TableStatsMeta | null;
  ddl: string;
  loading: boolean;
  onRefresh: () => void;
  onOpenAddColumn: () => void;
  onOpenEditColumn: (col: ColumnMeta) => void;
  onOpenAddIndex: () => void;
  onOpenAddForeignKey?: () => void;
  onOpenInsertRow: () => void;
  onOpenImportData?: () => void;
  onDeleteRow?: (row: Record<string, any>) => void;
  onUpdateCell?: (row: Record<string, any>, colName: string, newValue: any) => Promise<void>;
  onDropColumn: (colName: string) => void;
  onDropIndex: (indexName: string) => void;
  onDropForeignKey?: (constraintName: string) => void;
  onOpenInSqlEditor: (sql: string) => void;
  onSelectTable?: (tableName: string) => void;
}

export const TableStructureView = ({
  tableName,
  engine,
  subView,
  onChangeSubView,
  result,
  columns,
  indexes,
  foreignKeys = [],
  tables = [],
  stats,
  ddl,
  loading,
  onRefresh,
  onOpenAddColumn,
  onOpenEditColumn,
  onOpenAddIndex,
  onOpenAddForeignKey,
  onOpenInsertRow,
  onOpenImportData,
  onDeleteRow,
  onUpdateCell,
  onDropColumn,
  onDropIndex,
  onDropForeignKey,
  onOpenInSqlEditor,
  onSelectTable,
}: TableStructureViewProps) => {
  const [copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sections: ContextMenuSection[];
  } | null>(null);

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
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
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
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
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
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              subView === 'indexes'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Indexes ({indexes.length})</span>
          </button>

          <button
            onClick={() => onChangeSubView('foreign_keys')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              subView === 'foreign_keys'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Link className="w-3.5 h-3.5 text-emerald-400" />
            <span>Foreign Keys ({foreignKeys.length})</span>
          </button>

          <button
            onClick={() => onChangeSubView('er_diagram')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              subView === 'er_diagram'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 text-purple-400" />
            <span>ER Diagram</span>
          </button>

          <button
            onClick={() => onChangeSubView('statistics')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              subView === 'statistics'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Statistics</span>
          </button>

          <button
            onClick={() => onChangeSubView('ddl')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              subView === 'ddl'
                ? 'bg-slate-800 text-slate-100 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-rose-400" />
            <span>DDL Script</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {subView === 'data' && (
            <button
              onClick={onOpenInsertRow}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium shadow-xs transition flex items-center space-x-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Insert Row</span>
            </button>
          )}

          {subView === 'structure' && (
            <button
              onClick={onOpenAddColumn}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium shadow-xs transition flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add Column</span>
            </button>
          )}

          {subView === 'indexes' && (
            <button
              onClick={onOpenAddIndex}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-medium shadow-xs transition flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add Index</span>
            </button>
          )}

          {subView === 'foreign_keys' && onOpenAddForeignKey && (
            <button
              onClick={onOpenAddForeignKey}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium shadow-xs transition flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add Foreign Key</span>
            </button>
          )}

          {subView === 'ddl' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyDdl}
                className="px-2.5 py-1 rounded-md text-xs font-medium border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center space-x-1.5 cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{copied ? 'Copied' : 'Copy DDL'}</span>
              </button>

              <button
                onClick={() => onOpenInSqlEditor(ddl)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Open in SQL Editor</span>
              </button>
            </div>
          )}

          <button
            onClick={onRefresh}
            title="Refresh Table Schema"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {subView === 'data' && (
          <DataGrid
            result={result}
            loading={loading}
            tableName={tableName}
            engine={engine}
            ddl={ddl}
            onOpenInsertRow={onOpenInsertRow}
            onOpenImportData={onOpenImportData}
            onDeleteRow={onDeleteRow}
            onUpdateCell={onUpdateCell}
          />
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
                    columns.map((col, i) => (
                      <tr
                        key={col.name}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            sections: [
                              {
                                header: `Column: ${col.name}`,
                                items: [
                                  {
                                    label: 'Edit Column...',
                                    icon: <Pencil className="w-3.5 h-3.5 text-indigo-400" />,
                                    onClick: () => onOpenEditColumn(col),
                                  },
                                  {
                                    label: 'Add New Column...',
                                    icon: <Plus className="w-3.5 h-3.5 text-emerald-400" />,
                                    onClick: onOpenAddColumn,
                                  },
                                  ...(!col.is_primary_key
                                    ? [
                                        {
                                          label: 'Drop Column',
                                          icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
                                          danger: true,
                                          onClick: () => onDropColumn(col.name),
                                        },
                                      ]
                                    : []),
                                ],
                              },
                            ],
                          });
                        }}
                        className="hover:bg-slate-800/40 transition cursor-context-menu"
                      >
                        <td className="py-2.5 px-4 text-center text-slate-500 font-mono text-[11px]">
                          {i + 1}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-200">
                          {col.name}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-indigo-400">
                          {col.data_type}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono">
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
                            onClick={() => onOpenEditColumn(col)}
                            title={`Edit column ${col.name}`}
                            className="p-1 rounded text-slate-500 hover:text-indigo-400 hover:bg-indigo-950/30 transition mr-1 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDropColumn(col.name)}
                            disabled={col.is_primary_key}
                            title={
                              col.is_primary_key
                                ? 'Cannot drop Primary Key directly'
                                : `Drop column ${col.name}`
                            }
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
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
                      <tr
                        key={idx.name}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            sections: [
                              {
                                header: `Index: ${idx.name}`,
                                items: [
                                  {
                                    label: 'Add New Index...',
                                    icon: <Plus className="w-3.5 h-3.5 text-amber-400" />,
                                    onClick: onOpenAddIndex,
                                  },
                                  ...(!idx.is_primary
                                    ? [
                                        {
                                          label: 'Drop Index',
                                          icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
                                          danger: true,
                                          onClick: () => onDropIndex(idx.name),
                                        },
                                      ]
                                    : []),
                                ],
                              },
                            ],
                          });
                        }}
                        className="hover:bg-slate-800/40 transition cursor-context-menu"
                      >
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
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
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

        {subView === 'foreign_keys' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">Constraint Name</th>
                    <th className="py-2.5 px-4">Column</th>
                    <th className="py-2.5 px-4">Referenced Table</th>
                    <th className="py-2.5 px-4">Referenced Column</th>
                    <th className="py-2.5 px-4 text-center">On Delete</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {foreignKeys.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <p className="text-xs text-slate-400">No foreign key constraints defined on this table</p>
                          {onOpenAddForeignKey && (
                            <button
                              onClick={onOpenAddForeignKey}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Foreign Key</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    foreignKeys.map((fk, i) => (
                      <tr
                        key={fk.constraint_name}
                        className="hover:bg-slate-800/40 transition"
                      >
                        <td className="py-2.5 px-4 text-center text-slate-500 font-mono text-[11px]">
                          {i + 1}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-200">
                          {fk.constraint_name}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-indigo-400">
                          {fk.column_name}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-amber-300">
                          {fk.foreign_table}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-300">
                          {fk.foreign_column}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                            {fk.on_delete || 'RESTRICT'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {onDropForeignKey && (
                            <button
                              onClick={() => onDropForeignKey(fk.constraint_name)}
                              title={`Drop constraint ${fk.constraint_name}`}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {subView === 'er_diagram' && (
          <ERDiagramView
            currentTable={tableName}
            tables={tables}
            columns={columns}
            foreignKeys={foreignKeys}
            onSelectTable={onSelectTable}
          />
        )}

        {subView === 'statistics' && (
          <TableStatsView
            tableName={tableName}
            stats={stats || null}
            loading={loading}
            onRefresh={onRefresh}
          />
        )}

        {subView === 'ddl' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="h-full bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-auto whitespace-pre leading-relaxed select-text">
              {ddl || '/* No DDL definition found */'}
            </div>
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          sections={contextMenu.sections}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
