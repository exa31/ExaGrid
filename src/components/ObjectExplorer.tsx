import { useState } from 'react';
import {
  Table2,
  FileCode,
  Search,
  ChevronRight,
  ChevronDown,
  Layers,
  RefreshCw,
  FolderTree,
} from 'lucide-react';
import type { TableMeta } from '../types/database';

interface ObjectExplorerProps {
  activeProfileName: string | null;
  databaseName: string | null;
  tables: TableMeta[];
  loading: boolean;
  onSelectTable: (tableName: string) => void;
  onOpenNewQuery: () => void;
  onRefreshTables: () => void;
}

export const ObjectExplorer = ({
  activeProfileName,
  databaseName,
  tables,
  loading,
  onSelectTable,
  onOpenNewQuery,
  onRefreshTables,
}: ObjectExplorerProps) => {
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState(true);

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="w-60 bg-slate-950/90 border-r border-slate-800/80 flex flex-col h-full select-none shrink-0">
      <div className="h-12 border-b border-slate-800/80 px-3 flex items-center justify-between">
        <div className="flex items-center space-x-1.5 truncate">
          <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-200 truncate" title={activeProfileName || ''}>
            {activeProfileName || 'Explorer'}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onRefreshTables}
            title="Refresh Schema"
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          <button
            onClick={onOpenNewQuery}
            title="New SQL Query"
            className="p-1 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/50 rounded-md transition"
          >
            <FileCode className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-2 border-b border-slate-800/60">
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

      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        <div>
          <div
            onClick={() => setExpanded(!expanded)}
            className="flex items-center space-x-1.5 px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-900 rounded-md cursor-pointer transition"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            )}
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono truncate">{databaseName || 'default'}</span>
            <span className="text-[10px] text-slate-500 ml-auto">({tables.length})</span>
          </div>

          {expanded && (
            <div className="pl-4 mt-1 space-y-0.5">
              {loading ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                  Loading tables...
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
                      onDoubleClick={() => onSelectTable(t.name)}
                      onClick={() => onSelectTable(t.name)}
                      className="group flex items-center justify-between px-2 py-1 rounded-md text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-900 cursor-pointer transition"
                    >
                      <div className="flex items-center space-x-2 truncate">
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
                      <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-900 text-slate-500 border border-slate-800">
                        {isCollection ? 'coll' : isView ? 'view' : 'tbl'}
                      </span>
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
