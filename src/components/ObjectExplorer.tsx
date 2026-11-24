import {
  ChevronDown,
  ChevronRight,
  Code2,
  FileCode,
  FolderTree,
  Layers,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Trash2,
} from 'lucide-react';
import { useEffect,useRef, useState } from 'react';

import { tauriBridge } from '../services/tauriBridge';
import type { DatabaseEngine, TableMeta, TableTabSubView } from '../types/database';

interface ObjectExplorerProps {
  activeProfileName: string | null;
  databaseName: string | null;
  engine?: DatabaseEngine;
  tables: TableMeta[];
  loading: boolean;
  onSelectTable: (tableName: string, view?: TableTabSubView) => void;
  onOpenNewQuery: () => void;
  onRefreshTables: () => void;
  onOpenCreateTable: () => void;
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
  onSelectTable,
  onOpenNewQuery,
  onRefreshTables,
  onOpenCreateTable,
  onTruncateTable,
  onDropTable,
  onGenerateSql,
}: ObjectExplorerProps) => {
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [activeMenuTable, setActiveMenuTable] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuTable(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="w-64 bg-slate-950/90 border-r border-slate-800/80 flex flex-col h-full select-none shrink-0 relative">
      {/* Top Header */}
      <div className="h-12 border-b border-slate-800/80 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1.5 truncate">
          <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-200 truncate" title={activeProfileName || ''}>
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
          <div className="flex items-center justify-between px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-900 rounded-md cursor-pointer transition group">
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
            <div className="pl-4 mt-1 space-y-0.5">
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
                  return (
                    <div
                      key={t.name}
                      onDoubleClick={() => onSelectTable(t.name, 'data')}
                      className="group flex items-center justify-between px-2 py-1 rounded-md text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-900 cursor-pointer transition relative"
                    >
                      <div
                        onClick={() => onSelectTable(t.name, 'data')}
                        className="flex items-center space-x-2 truncate flex-1"
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

                      <div className="flex items-center space-x-1 shrink-0">
                        <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-900 text-slate-500 border border-slate-800">
                          {isCollection ? 'coll' : isView ? 'view' : 'tbl'}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuTable(activeMenuTable === t.name ? null : t.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Context Popup Menu */}
                      {activeMenuTable === t.name && (
                        <div
                          ref={menuRef}
                          className="absolute right-2 top-7 z-50 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <button
                            onClick={() => {
                              onSelectTable(t.name, 'data');
                              setActiveMenuTable(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center space-x-2"
                          >
                            <Table2 className="w-3.5 h-3.5 text-sky-400" />
                            <span>View Data</span>
                          </button>
                          <button
                            onClick={() => {
                              onSelectTable(t.name, 'structure');
                              setActiveMenuTable(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center space-x-2"
                          >
                            <Layers className="w-3.5 h-3.5 text-indigo-400" />
                            <span>View Structure & Types</span>
                          </button>
                          <button
                            onClick={() => {
                              onSelectTable(t.name, 'ddl');
                              setActiveMenuTable(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center space-x-2"
                          >
                            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>View DDL Script</span>
                          </button>

                          <div className="border-t border-slate-800 my-1" />

                          <div className="px-3 py-1 text-[10px] uppercase font-semibold text-slate-500">
                            Generate SQL
                          </div>
                          <button
                            onClick={() => {
                              onGenerateSql(tauriBridge.generateSelectSnippet(engine, t.name));
                              setActiveMenuTable(null);
                            }}
                            className="w-full text-left px-3 py-1 hover:bg-slate-800 text-slate-300 font-mono text-[11px]"
                          >
                            SELECT * FROM {t.name}
                          </button>
                          <button
                            onClick={() => {
                              onGenerateSql(`INSERT INTO ${t.name} VALUES (...);`);
                              setActiveMenuTable(null);
                            }}
                            className="w-full text-left px-3 py-1 hover:bg-slate-800 text-slate-300 font-mono text-[11px]"
                          >
                            INSERT Statement
                          </button>

                          <div className="border-t border-slate-800 my-1" />

                          <button
                            onClick={() => {
                              onTruncateTable(t.name);
                              setActiveMenuTable(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-amber-950/40 text-amber-400 flex items-center space-x-2"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Truncate Table</span>
                          </button>
                          <button
                            onClick={() => {
                              onDropTable(t.name);
                              setActiveMenuTable(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-rose-950/40 text-rose-400 flex items-center space-x-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Drop Table</span>
                          </button>
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
    </div>
  );
};
