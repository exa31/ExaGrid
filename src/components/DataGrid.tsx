import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  FileJson,
  FileSpreadsheet,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import { tauriBridge } from '../services/tauriBridge';
import type { QueryResult } from '../types/database';
import { CellInspectorModal } from './CellInspectorModal';
import { ContextMenu, type ContextMenuSection } from './ContextMenu';

interface DataGridProps {
  result: QueryResult | null;
  loading: boolean;
  tableName?: string;
  onOpenInsertRow?: () => void;
  onDeleteRow?: (row: Record<string, any>) => void;
  onUpdateCell?: (row: Record<string, any>, colName: string, newValue: any) => Promise<void>;
}

function generateExportFileName(tableName: string | undefined, format: 'csv' | 'json'): string {
  return `${tableName || 'query_export'}_${Date.now()}.${format}`;
}

export const DataGrid = ({
  result,
  loading,
  tableName,
  onOpenInsertRow,
  onDeleteRow,
  onUpdateCell,
}: DataGridProps) => {
  const [filterText, setFilterText] = useState('');
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

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium">Fetching query data from database...</p>
      </div>
    );
  }

  if (!result || result.columns.length === 0) {
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

  const { columns, rows } = result;

  const filteredRows = rows.filter((r) => {
    if (!filterText.trim()) return true;
    const term = filterText.toLowerCase();
    return Object.values(r).some((val) =>
      String(val ?? '').toLowerCase().includes(term)
    );
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortCol) return 0;
    const valA = a[sortCol];
    const valB = b[sortCol];
    if (valA === valB) return 0;
    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;
    const cmp = valA > valB ? 1 : -1;
    return sortAsc ? cmp : -cmp;
  });

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
        header: 'Data Export',
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
        ],
      },
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, sections });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      <div className="h-10 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-900/40 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter in results..."
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-md pl-8 pr-2 py-1 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 w-44"
            />
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            Showing {paginatedRows.length} of {sortedRows.length} rows
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {onOpenInsertRow && (
            <button
              onClick={onOpenInsertRow}
              title="Insert New Row into table"
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition shadow-xs cursor-pointer mr-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Insert Row</span>
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
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-950 select-text">
        <table className="w-full border-collapse text-left font-mono text-xs">
          <thead className="bg-slate-900/90 sticky top-0 z-10 border-b border-slate-800 select-none">
            <tr>
              <th className="w-12 px-3 py-2 text-center text-slate-500 font-normal border-r border-slate-800/80">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.name}
                  onClick={() => handleSort(col.name)}
                  className="px-3.5 py-2 font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer border-r border-slate-800/80 transition"
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
                    <div className="flex items-center space-x-1 text-slate-500">
                      <span className="text-[10px] text-slate-500 font-normal lowercase">
                        {col.data_type}
                      </span>
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    </div>
                  </div>
                </th>
              ))}
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
                    <p className="text-xs text-slate-400">No records found in this table</p>
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
                return (
                  <tr
                    key={rowIdx}
                    className="hover:bg-slate-900/70 transition group"
                  >
                    <td className="px-3 py-1.5 text-center text-slate-600 text-[11px] border-r border-slate-800/60 select-none">
                      {actualRowIndex}
                    </td>
                    {columns.map((col) => {
                      const cellVal = row[col.name];
                      const isNull = cellVal === null || cellVal === undefined;
                      const isObj = typeof cellVal === 'object' && !isNull;
                      const isEditing =
                        editingCell?.rowIdx === rowIdx && editingCell?.colName === col.name;

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
                            } else {
                              setInspectorCell({
                                title: `${col.name} (Row #${actualRowIndex})`,
                                value: cellVal,
                              });
                            }
                          }}
                          onClick={() => {
                            if (!isEditing) {
                              setInspectorCell({
                                title: `${col.name} (Row #${actualRowIndex})`,
                                value: cellVal,
                              });
                            }
                          }}
                          className="px-3.5 py-1.5 border-r border-slate-800/60 text-slate-300 max-w-xs truncate cursor-pointer hover:bg-indigo-950/20"
                          title={
                            onUpdateCell && !col.is_primary_key
                              ? 'Double click to edit cell inline'
                              : 'Click to inspect full cell value'
                          }
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
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                  setEditingCell(null);
                                }
                              }}
                              onBlur={async () => {
                                if (editingCell) {
                                  const newVal = editingCell.value;
                                  setEditingCell(null);
                                  if (String(cellVal ?? '') !== newVal) {
                                    await onUpdateCell?.(row, col.name, newVal);
                                  }
                                }
                              }}
                              className="w-full bg-slate-900 border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:outline-hidden"
                            />
                          ) : isNull ? (
                            <span className="text-slate-600 italic text-[11px]">NULL</span>
                          ) : isObj ? (
                            <span className="text-amber-400 font-medium bg-amber-950/40 px-1.5 py-0.5 rounded text-[10px] border border-amber-900/50">
                              {Array.isArray(cellVal) ? `Array(${cellVal.length})` : 'JSON Object'}
                            </span>
                          ) : typeof cellVal === 'boolean' ? (
                            <span
                              className={`px-1 py-0.5 rounded text-[10px] font-semibold ${
                                cellVal
                                  ? 'bg-emerald-950 text-emerald-400'
                                  : 'bg-rose-950 text-rose-400'
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
