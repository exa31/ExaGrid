import {
  ChevronDown,
  ChevronRight,
  Code2,
  Columns3,
  FileCode,
  FolderTree,
  Key,
  KeyRound,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  Table2,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import { tauriBridge } from '../services/tauriBridge';
import type {
  ColumnMeta,
  DatabaseEngine,
  IndexMeta,
  TableMeta,
  TableTabSubView,
} from '../types/database';
import { ContextMenu, type ContextMenuSection } from './ContextMenu';

interface ObjectExplorerProps {
  activeProfileName: string | null;
  databaseName: string | null;
  engine?: DatabaseEngine;
  tables: TableMeta[];
  loading: boolean;
  connectedProfileId?: string | null;
  onSelectTable: (tableName: string, view?: TableTabSubView) => void;
  onOpenNewQuery: () => void;
  onRefreshTables: () => void;
  onOpenCreateTable: () => void;
  onOpenAddColumnForTable?: (tableName: string) => void;
  onOpenAddIndexForTable?: (tableName: string) => void;
  onOpenInsertRowForTable?: (tableName: string) => void;
  onOpenEditColumnForTable?: (tableName: string, col: ColumnMeta) => void;
  onDropColumnForTable?: (tableName: string, colName: string) => void;
  onDropIndexForTable?: (tableName: string, indexName: string) => void;
  onTruncateTable: (tableName: string) => void;
  onDropTable: (tableName: string) => void;
  onGenerateSql: (sql: string) => void;
}

export const ObjectExplorer = ({
  activeProfileName,
  databaseName,
  engine = 'postgres',
  tables,
  loading,
  connectedProfileId,
  onSelectTable,
  onOpenNewQuery,
  onRefreshTables,
  onOpenCreateTable,
  onOpenAddColumnForTable,
  onOpenAddIndexForTable,
  onOpenInsertRowForTable,
  onOpenEditColumnForTable,
  onDropColumnForTable,
  onDropIndexForTable,
  onTruncateTable,
  onDropTable,
  onGenerateSql,
}: ObjectExplorerProps) => {
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [tableDetails, setTableDetails] = useState<
    Record<string, { columns: ColumnMeta[]; indexes: IndexMeta[]; loading: boolean }>
  >({});

  // Unified floating context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    sections: ContextMenuSection[];
  } | null>(null);

  const handleToggleTableExpand = async (tableName: string) => {
    const isNowExpanded = !expandedTables[tableName];
    setExpandedTables((prev) => ({ ...prev, [tableName]: isNowExpanded }));

    if (isNowExpanded && !tableDetails[tableName] && connectedProfileId) {
      setTableDetails((prev) => ({
        ...prev,
        [tableName]: { columns: [], indexes: [], loading: true },
      }));
      try {
        const [cols, idxs] = await Promise.all([
          tauriBridge.getTableColumns(connectedProfileId, tableName),
          tauriBridge.getTableIndexes(connectedProfileId, tableName),
        ]);
        setTableDetails((prev) => ({
          ...prev,
          [tableName]: { columns: cols, indexes: idxs, loading: false },
        }));
      } catch (_err) {
        setTableDetails((prev) => ({
          ...prev,
          [tableName]: { columns: [], indexes: [], loading: false },
        }));
      }
    }
  };

  const openTableContextMenu = (x: number, y: number, tableName: string) => {
    const sections: ContextMenuSection[] = [
      {
        header: `Table: ${tableName}`,
        items: [
          {
            label: 'View Data',
            icon: <Table2 className="w-3.5 h-3.5 text-sky-400" />,
            onClick: () => onSelectTable(tableName, 'data'),
          },
          {
            label: 'View Structure & Columns',
            icon: <Layers className="w-3.5 h-3.5 text-indigo-400" />,
            onClick: () => onSelectTable(tableName, 'structure'),
          },
          {
            label: 'View DDL Script',
            icon: <Code2 className="w-3.5 h-3.5 text-emerald-400" />,
            onClick: () => onSelectTable(tableName, 'ddl'),
          },
        ],
      },
      {
        header: 'Operations',
        items: [
          ...(onOpenAddColumnForTable
            ? [
                {
                  label: 'Add Column...',
                  icon: <Plus className="w-3.5 h-3.5 text-indigo-400" />,
                  onClick: () => onOpenAddColumnForTable(tableName),
                },
              ]
            : []),
          ...(onOpenAddIndexForTable
            ? [
                {
                  label: 'Add Index...',
                  icon: <KeyRound className="w-3.5 h-3.5 text-amber-400" />,
                  onClick: () => onOpenAddIndexForTable(tableName),
                },
              ]
            : []),
          ...(onOpenInsertRowForTable
            ? [
                {
                  label: 'Insert Row...',
                  icon: <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />,
                  onClick: () => onOpenInsertRowForTable(tableName),
                },
              ]
            : []),
        ],
      },
      {
        header: 'Generate SQL',
        items: [
          {
            label: `SELECT * FROM ${tableName}`,
            icon: <FileCode className="w-3.5 h-3.5 text-slate-400" />,
            onClick: () => onGenerateSql(tauriBridge.generateSelectSnippet(engine, tableName)),
          },
          {
            label: 'INSERT Statement',
            icon: <FileCode className="w-3.5 h-3.5 text-slate-400" />,
            onClick: () => onGenerateSql(`INSERT INTO ${tableName} VALUES (...);`),
          },
        ],
      },
      {
        items: [
          {
            label: 'Truncate Table',
            icon: <RefreshCw className="w-3.5 h-3.5 text-amber-400" />,
            danger: true,
            onClick: () => onTruncateTable(tableName),
          },
          {
            label: 'Drop Table',
            icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
            danger: true,
            onClick: () => onDropTable(tableName),
          },
        ],
      },
    ];

    setContextMenu({ x, y, sections });
  };

  const openDatabaseContextMenu = (x: number, y: number) => {
    const sections: ContextMenuSection[] = [
      {
        header: `Database: ${databaseName || 'default'}`,
        items: [
          {
            label: 'Create New Table...',
            icon: <Plus className="w-3.5 h-3.5 text-emerald-400" />,
            onClick: onOpenCreateTable,
          },
          {
            label: 'New SQL Console',
            icon: <FileCode className="w-3.5 h-3.5 text-indigo-400" />,
            onClick: onOpenNewQuery,
          },
          {
            label: 'Refresh Tables & Schema',
            icon: <RefreshCw className="w-3.5 h-3.5 text-slate-400" />,
            onClick: onRefreshTables,
          },
        ],
      },
    ];

    setContextMenu({ x, y, sections });
  };

  const openColumnContextMenu = (
    x: number,
    y: number,
    tableName: string,
    col: ColumnMeta
  ) => {
    const sections: ContextMenuSection[] = [
      {
        header: `Column: ${col.name} (${col.data_type})`,
        items: [
          ...(onOpenEditColumnForTable
            ? [
                {
                  label: 'Edit Column...',
                  icon: <Pencil className="w-3.5 h-3.5 text-indigo-400" />,
                  onClick: () => onOpenEditColumnForTable(tableName, col),
                },
              ]
            : []),
          ...(onOpenAddColumnForTable
            ? [
                {
                  label: 'Add Another Column...',
                  icon: <Plus className="w-3.5 h-3.5 text-slate-400" />,
                  onClick: () => onOpenAddColumnForTable(tableName),
                },
              ]
            : []),
          {
            label: 'View in Structure View',
            icon: <Layers className="w-3.5 h-3.5 text-sky-400" />,
            onClick: () => onSelectTable(tableName, 'structure'),
          },
          ...(onDropColumnForTable && !col.is_primary_key
            ? [
                {
                  label: 'Drop Column',
                  icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
                  danger: true,
                  onClick: () => onDropColumnForTable(tableName, col.name),
                },
              ]
            : []),
        ],
      },
    ];

    setContextMenu({ x, y, sections });
  };

  const openIndexContextMenu = (
    x: number,
    y: number,
    tableName: string,
    indexName: string
  ) => {
    const sections: ContextMenuSection[] = [
      {
        header: `Index: ${indexName}`,
        items: [
          ...(onOpenAddIndexForTable
            ? [
                {
                  label: 'Add New Index...',
                  icon: <Plus className="w-3.5 h-3.5 text-amber-400" />,
                  onClick: () => onOpenAddIndexForTable(tableName),
                },
              ]
            : []),
          {
            label: 'View Indexes Tab',
            icon: <KeyRound className="w-3.5 h-3.5 text-amber-400" />,
            onClick: () => onSelectTable(tableName, 'indexes'),
          },
          ...(onDropIndexForTable
            ? [
                {
                  label: 'Drop Index',
                  icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
                  danger: true,
                  onClick: () => onDropIndexForTable(tableName, indexName),
                },
              ]
            : []),
        ],
      },
    ];

    setContextMenu({ x, y, sections });
  };

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="w-72 border-r border-slate-800 bg-slate-950 flex flex-col h-full select-none shrink-0">
      {/* Header */}
      <div className="h-10 border-b border-slate-800 px-3 flex items-center justify-between shrink-0 bg-slate-900/40">
        <div className="flex items-center space-x-1.5 truncate">
          <FolderTree className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-300 truncate">
            {activeProfileName || 'Explorer'}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onOpenCreateTable}
            title="Create New Table"
            className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60 rounded-md transition"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRefreshTables}
            title="Refresh Schema"
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          <button
            onClick={onOpenNewQuery}
            title="New SQL Console"
            className="p-1 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/50 rounded-md transition"
          >
            <FileCode className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-slate-800/60 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
          <input
            type="text"
            placeholder="Search tables..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-md pl-8 pr-2 py-1 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Explorer Tree */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        <div>
          <div
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openDatabaseContextMenu(e.clientX, e.clientY);
            }}
            className="flex items-center justify-between px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-900 rounded-md cursor-pointer transition group"
          >
            <div
              onClick={() => setExpanded(!expanded)}
              className="flex items-center space-x-1.5 flex-1 truncate"
            >
              {expanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              )}
              <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-mono truncate">{databaseName || 'default'}</span>
              <span className="text-[10px] text-slate-500">({tables.length})</span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenCreateTable();
              }}
              title="Add Table to database"
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {expanded && (
            <div className="pl-2 mt-1 space-y-0.5">
              {loading ? (
                <div className="py-4 text-center text-xs text-slate-500 space-y-2">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <span>Loading tables...</span>
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  {filter ? 'No matching tables' : 'No tables found'}
                </div>
              ) : (
                filteredTables.map((t) => {
                  const isView = t.table_type === 'VIEW';
                  const isCollection = t.table_type === 'COLLECTION';
                  const isTableExpanded = expandedTables[t.name] || false;
                  const details = tableDetails[t.name];

                  return (
                    <div key={t.name} className="flex flex-col">
                      <div
                        onDoubleClick={() => onSelectTable(t.name, 'data')}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openTableContextMenu(e.clientX, e.clientY, t.name);
                        }}
                        className="group flex items-center justify-between px-2 py-1 rounded-md text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-900 cursor-pointer transition relative"
                      >
                        <div className="flex items-center space-x-1.5 truncate flex-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTableExpand(t.name);
                            }}
                            className="p-0.5 text-slate-500 hover:text-slate-300 transition"
                          >
                            {isTableExpanded ? (
                              <ChevronDown className="w-3 h-3 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-slate-500" />
                            )}
                          </button>
                          <div
                            onClick={() => onSelectTable(t.name, 'data')}
                            className="flex items-center space-x-1.5 truncate flex-1"
                          >
                            <Table2
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isCollection
                                  ? 'text-emerald-400'
                                  : isView
                                  ? 'text-purple-400'
                                  : 'text-sky-400'
                              }`}
                            />
                            <span className="font-mono truncate text-slate-300 group-hover:text-white">
                              {t.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-900 text-slate-500 border border-slate-800">
                            {isCollection ? 'coll' : isView ? 'view' : 'tbl'}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              openTableContextMenu(rect.right, rect.bottom, t.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Table Node: Columns & Indexes */}
                      {isTableExpanded && (
                        <div className="pl-6 py-1 space-y-1.5 text-slate-400 text-[11px] border-l border-slate-800/80 ml-3">
                          {details?.loading ? (
                            <div className="py-1 text-slate-500 text-[10px] italic">
                              Loading structure...
                            </div>
                          ) : (
                            <>
                              {/* Columns Node */}
                              <div>
                                <div
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onOpenAddColumnForTable?.(t.name);
                                  }}
                                  className="flex items-center justify-between text-slate-400 hover:text-slate-200 group/sub py-0.5"
                                >
                                  <div
                                    onClick={() => onSelectTable(t.name, 'structure')}
                                    className="flex items-center space-x-1.5 cursor-pointer font-medium"
                                  >
                                    <Columns3 className="w-3 h-3 text-indigo-400" />
                                    <span>
                                      Columns ({details ? details.columns.length : 0})
                                    </span>
                                  </div>
                                  {onOpenAddColumnForTable && (
                                    <button
                                      onClick={() => onOpenAddColumnForTable(t.name)}
                                      title="Add Column to table"
                                      className="opacity-0 group-hover/sub:opacity-100 p-0.5 rounded text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 transition"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>

                                <div className="pl-3 space-y-0.5 pt-0.5">
                                  {details?.columns.map((col) => (
                                    <div
                                      key={col.name}
                                      onClick={() => onSelectTable(t.name, 'structure')}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        openColumnContextMenu(e.clientX, e.clientY, t.name, col);
                                      }}
                                      className="group/col flex items-center justify-between py-0.5 text-slate-400 hover:text-slate-200 cursor-pointer font-mono"
                                    >
                                      <div className="flex items-center space-x-1.5 truncate">
                                        {col.is_primary_key ? (
                                          <Key className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                        ) : (
                                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                                        )}
                                        <span
                                          className={`truncate ${
                                            col.is_primary_key
                                              ? 'text-amber-300 font-semibold'
                                              : ''
                                          }`}
                                        >
                                          {col.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-1 shrink-0">
                                        <span className="text-[10px] text-slate-500 lowercase">
                                          {col.data_type}
                                        </span>
                                        {onOpenEditColumnForTable && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onOpenEditColumnForTable(t.name, col);
                                            }}
                                            title={`Edit column ${col.name}`}
                                            className="opacity-0 group-hover/col:opacity-100 p-0.5 text-slate-500 hover:text-indigo-400 transition rounded"
                                          >
                                            <Pencil className="w-2.5 h-2.5" />
                                          </button>
                                        )}
                                        {onDropColumnForTable && !col.is_primary_key && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onDropColumnForTable(t.name, col.name);
                                            }}
                                            title={`Drop column ${col.name}`}
                                            className="opacity-0 group-hover/col:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition rounded"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Indexes Node */}
                              <div className="pt-0.5">
                                <div
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onOpenAddIndexForTable?.(t.name);
                                  }}
                                  className="flex items-center justify-between text-slate-400 hover:text-slate-200 group/sub py-0.5"
                                >
                                  <div
                                    onClick={() => onSelectTable(t.name, 'indexes')}
                                    className="flex items-center space-x-1.5 cursor-pointer font-medium"
                                  >
                                    <KeyRound className="w-3 h-3 text-amber-400" />
                                    <span>
                                      Indexes ({details ? details.indexes.length : 0})
                                    </span>
                                  </div>
                                  {onOpenAddIndexForTable && (
                                    <button
                                      onClick={() => onOpenAddIndexForTable(t.name)}
                                      title="Add Index to table"
                                      className="opacity-0 group-hover/sub:opacity-100 p-0.5 rounded text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>

                                <div className="pl-3 space-y-0.5 pt-0.5">
                                  {details?.indexes.map((idx) => (
                                    <div
                                      key={idx.name}
                                      onClick={() => onSelectTable(t.name, 'indexes')}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        openIndexContextMenu(e.clientX, e.clientY, t.name, idx.name);
                                      }}
                                      className="group/idx flex items-center justify-between py-0.5 text-slate-400 hover:text-slate-200 cursor-pointer font-mono"
                                    >
                                      <span className="truncate">{idx.name}</span>
                                      <div className="flex items-center space-x-1 shrink-0">
                                        <span className="text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-500">
                                          {idx.is_primary
                                            ? 'PK'
                                            : idx.is_unique
                                            ? 'UNIQ'
                                            : 'IDX'}
                                        </span>
                                        {onDropIndexForTable && !idx.is_primary && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onDropIndexForTable(t.name, idx.name);
                                            }}
                                            title={`Drop index ${idx.name}`}
                                            className="opacity-0 group-hover/idx:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition rounded"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Render Portal/Fixed Context Menu */}
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
