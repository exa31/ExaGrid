import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  Eye,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  Filter,
  Pencil,
  PlusCircle,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { tauriBridge } from '../services/tauriBridge';
import type { DatabaseEngine, QueryResult } from '../types/database';
import { CellInspectorModal } from './CellInspectorModal';
import { ContextMenu, type ContextMenuSection } from './ContextMenu';

interface DataGridProps {
  result: QueryResult | null;
  loading: boolean;
  tableName?: string;
  engine?: DatabaseEngine;
  ddl?: string;
  onOpenInsertRow?: () => void;
  onOpenImportData?: () => void;
  onDeleteRow?: (row: Record<string, any>) => void;
  onUpdateCell?: (row: Record<string, any>, colName: string, newValue: any) => Promise<void>;
  onApplySqlFilter?: (whereClause: string) => void;
}

function generateExportFileName(tableName: string | undefined, format: 'csv' | 'json' | 'sql'): string {
  return `${tableName || 'query_export'}_${Date.now()}.${format}`;
}

export const DataGrid = ({
  result,
  loading,
  tableName,
  engine = 'mysql',
  ddl = '',
  onOpenInsertRow,
  onOpenImportData,
  onDeleteRow,
  onUpdateCell,
  onApplySqlFilter,
}: DataGridProps) => {
  const [filterText, setFilterText] = useState('');
  const [sqlWhere, setSqlWhere] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [editingCell, setEditingCell] = useState<{
    rowIdx: number;
    colName: string;
    value: string;
  } | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sections: ContextMenuSection[];
  } | null>(null);

  const [inspectorCell, setInspectorCell] = useState<{ title: string; value: any } | null>(null);

  const columns = result?.columns || [];
  const rows = result?.rows || [];

  // Evaluate WHERE filter client-side if simple expression, otherwise filter by text
  const filteredRows = useMemo(() => rows.filter((r) => {
      // 1. Text filter
      if (filterText.trim()) {
        const term = filterText.toLowerCase();
        const matchesText = Object.values(r).some((val) =>
          String(val ?? '').toLowerCase().includes(term)
        );
        if (!matchesText) return false;
      }

      // 2. SQL WHERE filter (simple expressions like col = 'val', col != 'val', col > num)
      if (sqlWhere.trim()) {
        const clause = sqlWhere.trim();
        // col = 'val' or col = val
        const eqMatch = clause.match(/^([a-zA-Z0-9_]+)\s*=\s*['"]?([^'"]+)['"]?$/);
        if (eqMatch) {
          const [, col, val] = eqMatch;
          return String(r[col] ?? '').toLowerCase() === val.toLowerCase();
        }

        // col != 'val'
        const neqMatch = clause.match(/^([a-zA-Z0-9_]+)\s*(!=|<>)\s*['"]?([^'"]+)['"]?$/);
        if (neqMatch) {
          const [, col, , val] = neqMatch;
          return String(r[col] ?? '').toLowerCase() !== val.toLowerCase();
        }

        // col > num
        const gtMatch = clause.match(/^([a-zA-Z0-9_]+)\s*>\s*([0-9.]+)$/);
        if (gtMatch) {
          const [, col, numStr] = gtMatch;
          return Number(r[col]) > Number(numStr);
        }

        // col < num
        const ltMatch = clause.match(/^([a-zA-Z0-9_]+)\s*<\s*([0-9.]+)$/);
        if (ltMatch) {
          const [, col, numStr] = ltMatch;
          return Number(r[col]) < Number(numStr);
        }

        // Fallback: search term
        return Object.values(r).some((val) =>
          String(val ?? '').toLowerCase().includes(clause.toLowerCase())
        );
      }

      return true;
    }), [rows, filterText, sqlWhere]);

  const sortedRows = useMemo(() => [...filteredRows].sort((a, b) => {
      if (!sortCol) return 0;
      const valA = a[sortCol];
      const valB = b[sortCol];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      const cmp = valA > valB ? 1 : -1;
      return sortAsc ? cmp : -cmp;
    }), [filteredRows, sortCol, sortAsc]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium">Fetching query data from database...</p>
      </div>
    );
  }

  if (!result || columns.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 space-y-3">
        <p className="text-sm font-medium text-slate-400">No data or table selected</p>
        <p className="text-xs text-slate-600">
          Execute a query above or click a table in the explorer to view records.
        </p>
        {onOpenInsertRow && (
          <button
            onClick={onOpenInsertRow}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Insert Record</span>
          </button>
        )}
      </div>
    );
  }

  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (colName: string) => {
    if (sortCol === colName) {
      if (sortAsc) setSortAsc(false);
      else {
        setSortCol(null);
        setSortAsc(true);
      }
    } else {
      setSortCol(colName);
      setSortAsc(true);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const fileName = generateExportFileName(tableName, format);
      await tauriBridge.exportData(sortedRows, format, fileName);
    } catch (err: any) {
      alert(`Export failed: ${err.message || err}`);
    }
  };

  const handleExportSqlDump = () => {
    if (!tableName) return;
    const dumpContent = tauriBridge.generateSqlDump(
      engine,
      tableName,
      ddl || `CREATE TABLE \`${tableName}\` (/* schema unavailable */);`,
      columns,
      sortedRows
    );
    const blob = new Blob([dumpContent], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateExportFileName(tableName, 'sql');
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleQuickFilter = (colName: string, cellVal: any, isEquals: boolean) => {
    const valStr = cellVal === null || cellVal === undefined ? 'NULL' : String(cellVal);
    const clause = isEquals ? `${colName} = '${valStr}'` : `${colName} != '${valStr}'`;
    setSqlWhere(clause);
    setPage(1);
  };

  const openCellContextMenu = (
    e: React.MouseEvent,
    row: Record<string, any>,
    rowIdx: number,
    colName: string,
    cellVal: any
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const sections: ContextMenuSection[] = [
      {
        header: `Cell: ${colName}`,
        items: [
          {
            label: 'Copy Cell Value',
            icon: <Copy className="w-3.5 h-3.5 text-sky-400" />,
            onClick: () => {
              navigator.clipboard.writeText(
                cellVal === null || cellVal === undefined ? '' : String(cellVal)
              );
            },
          },
          {
            label: `Filter by "${String(cellVal).slice(0, 15)}"`,
            icon: <Filter className="w-3.5 h-3.5 text-indigo-400" />,
            onClick: () => handleQuickFilter(colName, cellVal, true),
          },
          {
            label: `Filter excluding this`,
            icon: <Filter className="w-3.5 h-3.5 text-rose-400" />,
            onClick: () => handleQuickFilter(colName, cellVal, false),
          },
          ...(onUpdateCell && !columns.find((c) => c.name === colName)?.is_primary_key
            ? [
                {
                  label: 'Edit Cell Inline',
                  icon: <Pencil className="w-3.5 h-3.5 text-indigo-400" />,
                  onClick: () => {
                    setEditingCell({
                      rowIdx,
                      colName,
                      value:
                        cellVal === null || cellVal === undefined ? '' : String(cellVal),
                    });
                  },
                },
              ]
            : []),
          {
            label: 'Inspect Full Value',
            icon: <Eye className="w-3.5 h-3.5 text-amber-400" />,
            onClick: () => {
              setInspectorCell({
                title: `${colName} (Row #${(page - 1) * pageSize + rowIdx + 1})`,
                value: cellVal,
              });
            },
          },
        ],
      },
      {
        header: 'Row Actions',
        items: [
          {
            label: 'Copy Row as JSON',
            icon: <FileJson className="w-3.5 h-3.5 text-emerald-400" />,
            onClick: () => {
              navigator.clipboard.writeText(JSON.stringify(row, null, 2));
            },
          },
          {
            label: 'Copy Row as SQL INSERT',
            icon: <FileCode2 className="w-3.5 h-3.5 text-purple-400" />,
            onClick: () => {
              const sql = tauriBridge.generateInsertRowSql(engine, tableName || 'table', row);
              navigator.clipboard.writeText(sql);
            },
          },
          ...(onOpenInsertRow
            ? [
                {
                  label: 'Insert New Row...',
                  icon: <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />,
                  onClick: onOpenInsertRow,
                },
              ]
            : []),
          ...(onDeleteRow
            ? [
                {
                  label: 'Delete This Row',
                  icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
                  danger: true,
                  onClick: () => onDeleteRow(row),
                },
              ]
            : []),
        ],
      },
      {
        header: 'Export Options',
        items: [
          {
            label: 'Export to CSV',
            icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />,
            onClick: () => handleExport('csv'),
          },
          {
            label: 'Export to JSON',
            icon: <FileJson className="w-3.5 h-3.5 text-amber-400" />,
            onClick: () => handleExport('json'),
          },
          ...(tableName
            ? [
                {
                  label: 'Export as SQL Dump (.sql)',
                  icon: <Database className="w-3.5 h-3.5 text-indigo-400" />,
                  onClick: handleExportSqlDump,
                },
              ]
            : []),
          ...(onOpenImportData
            ? [
                {
                  label: 'Import Data (CSV/JSON)...',
                  icon: <Upload className="w-3.5 h-3.5 text-sky-400" />,
                  onClick: onOpenImportData,
                },
              ]
            : []),
        ],
      },
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      sections,
    });
  };

  const handleCellCommit = async (row: Record<string, any>, colName: string) => {
    if (!editingCell || !onUpdateCell) return;
    try {
      await onUpdateCell(row, colName, editingCell.value);
    } catch (err: any) {
      alert(`Update failed: ${err.message || err}`);
    } finally {
      setEditingCell(null);
    }
  };

  const pkCol = columns.find((c) => c.is_primary_key)?.name;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      {/* Interactive Toolbar & SQL Filter Bar */}
      <div className="h-10 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-900/60 shrink-0 select-none">
        <div className="flex items-center space-x-2">
          {/* SQL WHERE Filter Bar */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-md px-2 py-0.5 space-x-1.5 focus-within:border-indigo-500 transition">
            <span className="text-[11px] font-mono font-semibold text-indigo-400">WHERE</span>
            <input
              type="text"
              placeholder="e.g. status = 'active'"
              value={sqlWhere}
              onChange={(e) => {
                setSqlWhere(e.target.value);
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && onApplySqlFilter && sqlWhere.trim()) {
                  onApplySqlFilter(sqlWhere.trim());
                }
              }}
              className="bg-transparent text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-hidden w-44"
            />
            {sqlWhere && (
              <button
                onClick={() => {
                  setSqlWhere('');
                  setPage(1);
                }}
                title="Clear Filter"
                className="text-slate-500 hover:text-slate-300"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search in view..."
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500 w-36 transition"
            />
          </div>

          <span className="text-xs text-slate-500 font-mono">
            {sortedRows.length} of {rows.length} rows
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenInsertRow && (
            <button
              onClick={onOpenInsertRow}
              title="Insert Record"
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium flex items-center space-x-1 transition shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Insert</span>
            </button>
          )}

          {onOpenImportData && (
            <button
              onClick={onOpenImportData}
              title="Import Data from CSV or JSON"
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-md transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Import</span>
            </button>
          )}

          <button
            onClick={() => handleExport('csv')}
            title="Export to CSV"
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-md transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => handleExport('json')}
            title="Export to JSON"
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-md transition cursor-pointer"
          >
            <FileJson className="w-3.5 h-3.5 text-amber-400" />
            <span>JSON</span>
          </button>
          {tableName && (
            <button
              onClick={handleExportSqlDump}
              title="Export Table as SQL Dump Script"
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/60 rounded-md transition cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>SQL Dump</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-950 select-text">
        <table className="w-full border-collapse text-left font-mono text-xs">
          <thead className="bg-slate-900/90 sticky top-0 z-10 border-b border-slate-800 select-none">
            <tr>
              <th className="w-12 px-3 py-2 text-center text-slate-500 font-normal border-r border-slate-800/80">
                #
              </th>
              {columns.map((col) => {
                const isSorted = sortCol === col.name;
                return (
                  <th
                    key={col.name}
                    onClick={() => handleSort(col.name)}
                    className={`px-3.5 py-2 font-medium cursor-pointer border-r border-slate-800/80 transition ${
                      isSorted
                        ? 'bg-indigo-950/40 text-indigo-200'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-1.5">
                        <span className={col.is_primary_key ? 'text-amber-400 font-bold' : ''}>
                          {col.name}
                        </span>
                        {col.is_primary_key && (
                          <span className="text-[9px] bg-amber-950 text-amber-400 px-1 py-0.2 rounded border border-amber-900/60 font-sans">
                            PK
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] text-slate-500 font-normal lowercase">
                          {col.data_type}
                        </span>
                        {isSorted ? (
                          sortAsc ? (
                            <ArrowUp className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
              {onDeleteRow && (
                <th className="w-12 px-2 py-2 text-center text-slate-500 font-normal border-r border-slate-800/80">
                  Act
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onDeleteRow ? 2 : 1)}
                  className="py-12 text-center text-slate-500"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <p className="text-xs text-slate-400">No records found matching filters</p>
                    {onOpenInsertRow && (
                      <button
                        onClick={onOpenInsertRow}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Insert New Row</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIdx) => {
                const actualRowIndex = (page - 1) * pageSize + rowIdx + 1;
                const rowKey = pkCol && row[pkCol] !== undefined ? String(row[pkCol]) : String(actualRowIndex);

                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-slate-900/70 transition group"
                  >
                    <td className="px-3 py-1.5 text-center text-slate-600 border-r border-slate-800/60 select-none text-[11px]">
                      {actualRowIndex}
                    </td>

                    {columns.map((col) => {
                      const cellVal = row[col.name];
                      const isEditing =
                        editingCell &&
                        editingCell.rowIdx === rowIdx &&
                        editingCell.colName === col.name;

                      return (
                        <td
                          key={col.name}
                          onContextMenu={(e) =>
                            openCellContextMenu(e, row, rowIdx, col.name, cellVal)
                          }
                          onDoubleClick={() => {
                            if (onUpdateCell && !col.is_primary_key) {
                              setEditingCell({
                                rowIdx,
                                colName: col.name,
                                value:
                                  cellVal === null || cellVal === undefined
                                    ? ''
                                    : String(cellVal),
                              });
                            }
                          }}
                          className={`px-3.5 py-1.5 border-r border-slate-800/60 truncate max-w-xs transition ${
                            col.is_primary_key ? 'text-amber-300 font-semibold' : 'text-slate-300'
                          }`}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              autoFocus
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell((prev) =>
                                  prev ? { ...prev, value: e.target.value } : null
                                )
                              }
                              onBlur={() => handleCellCommit(row, col.name)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellCommit(row, col.name);
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                              className="w-full bg-slate-950 border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-hidden"
                            />
                          ) : cellVal === null || cellVal === undefined ? (
                            <span className="text-slate-600 italic select-none">NULL</span>
                          ) : typeof cellVal === 'object' ? (
                            <span
                              className="text-indigo-400 truncate block hover:underline cursor-pointer"
                              onClick={() =>
                                setInspectorCell({
                                  title: `${col.name} (JSON)`,
                                  value: cellVal,
                                })
                              }
                            >
                              {JSON.stringify(cellVal)}
                            </span>
                          ) : typeof cellVal === 'boolean' ? (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-sans font-semibold ${
                                cellVal
                                  ? 'bg-emerald-950 text-emerald-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {cellVal ? 'TRUE' : 'FALSE'}
                            </span>
                          ) : (
                            <span>{String(cellVal)}</span>
                          )}
                        </td>
                      );
                    })}
                    {onDeleteRow && (
                      <td className="px-2 py-1 text-center border-r border-slate-800/60">
                        <button
                          onClick={() => onDeleteRow(row)}
                          title="Delete this row"
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="h-10 border-t border-slate-800/80 px-4 flex items-center justify-between bg-slate-900/60 text-xs text-slate-400 shrink-0 select-none">
        <div className="flex items-center space-x-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-hidden"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center space-x-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-300 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-300 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {inspectorCell && (
        <CellInspectorModal
          isOpen
          onClose={() => setInspectorCell(null)}
          title={inspectorCell.title}
          value={inspectorCell.value}
        />
      )}

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
