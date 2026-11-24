import {
  ArrowRight,
  Database,
  ExternalLink,
  Filter,
  Key,
  Link as LinkIcon,
  Maximize2,
  Table2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import type { ColumnMeta, ForeignKeyMeta, TableMeta } from '../types/database';

interface ERDiagramViewProps {
  currentTable: string;
  tables: TableMeta[];
  columns: ColumnMeta[];
  foreignKeys: ForeignKeyMeta[];
  onSelectTable?: (tableName: string) => void;
}

export const ERDiagramView = ({
  currentTable,
  tables,
  columns,
  foreignKeys,
  onSelectTable,
}: ERDiagramViewProps) => {
  const [zoom, setZoom] = useState<number>(100);
  const [filterQuery, setFilterQuery] = useState('');

  // Tables to show: current table + foreign tables + a few other tables in database
  const relatedTableNames = useMemo(() => {
    const set = new Set<string>();
    set.add(currentTable);
    foreignKeys.forEach((fk) => {
      if (fk.foreign_table) set.add(fk.foreign_table);
    });
    return set;
  }, [currentTable, foreignKeys]);

  const displayedTables = useMemo(() => {
    let list = tables.filter((t) => {
      if (filterQuery.trim()) {
        return t.name.toLowerCase().includes(filterQuery.toLowerCase());
      }
      return true;
    });

    // prioritize related tables first
    list = [...list].sort((a, b) => {
      const aRel = relatedTableNames.has(a.name) ? 1 : 0;
      const bRel = relatedTableNames.has(b.name) ? 1 : 0;
      return bRel - aRel;
    });

    return list.slice(0, 8); // Display up to 8 table cards for clean canvas
  }, [tables, filterQuery, relatedTableNames]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Canvas Toolbar */}
      <div className="h-10 bg-slate-900/60 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-medium">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Entity-Relationship Schema Diagram</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Quick Table Filter */}
          <div className="relative">
            <Filter className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter tables..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="h-7 w-40 bg-slate-950 border border-slate-800 rounded-md pl-7 pr-2 text-[11px] font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setZoom((z) => Math.max(70, z - 10))}
            title="Zoom Out"
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 px-1 w-10 text-center">
            {zoom}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(130, z + 10))}
            title="Zoom In"
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(100)}
            title="Reset Zoom"
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Relationships Legend Bar */}
      {foreignKeys.length > 0 && (
        <div className="bg-slate-900/40 border-b border-slate-800/60 px-4 py-1.5 flex items-center space-x-3 overflow-x-auto text-[11px] shrink-0 font-mono">
          <span className="text-slate-400 font-sans font-medium flex items-center space-x-1">
            <LinkIcon className="w-3 h-3 text-indigo-400" />
            <span>Active Relations ({foreignKeys.length}):</span>
          </span>
          {foreignKeys.map((fk) => (
            <div
              key={fk.constraint_name}
              className="flex items-center space-x-1 bg-indigo-950/60 text-indigo-300 border border-indigo-900/60 px-2 py-0.5 rounded-full"
            >
              <span className="font-semibold text-slate-200">{currentTable}.{fk.column_name}</span>
              <ArrowRight className="w-3 h-3 text-indigo-400" />
              <span className="text-amber-300 font-semibold">{fk.foreign_table}.{fk.foreign_column}</span>
              <span className="text-[10px] text-slate-400">({fk.constraint_name})</span>
            </div>
          ))}
        </div>
      )}

      {/* Visual Diagram Workspace */}
      <div className="flex-1 overflow-auto p-8 relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
        <div
          className="flex flex-wrap gap-8 items-start justify-center transition-transform origin-top duration-150"
          style={{ transform: `scale(${zoom / 100})` }}
        >
          {displayedTables.map((tbl) => {
            const isCurrent = tbl.name === currentTable;
            const isRelated = relatedTableNames.has(tbl.name);

            return (
              <div
                key={tbl.name}
                className={`w-72 bg-slate-900 rounded-xl border shadow-xl flex flex-col overflow-hidden transition-all ${
                  isCurrent
                    ? 'border-indigo-500/80 ring-2 ring-indigo-500/20 shadow-indigo-500/10'
                    : isRelated
                    ? 'border-amber-500/60 ring-1 ring-amber-500/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Table Header */}
                <div
                  className={`px-4 py-3 flex items-center justify-between border-b ${
                    isCurrent
                      ? 'bg-indigo-950/40 border-indigo-500/30'
                      : isRelated
                      ? 'bg-amber-950/30 border-amber-500/20'
                      : 'bg-slate-800/40 border-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Table2
                      className={`w-4 h-4 shrink-0 ${
                        isCurrent ? 'text-indigo-400' : isRelated ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="text-xs font-semibold text-slate-100 truncate font-mono">
                      {tbl.name}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    {isCurrent && (
                      <span className="text-[10px] bg-indigo-500 text-white font-semibold px-1.5 py-0.2 rounded font-sans">
                        Active
                      </span>
                    )}
                    {onSelectTable && !isCurrent && (
                      <button
                        onClick={() => onSelectTable(tbl.name)}
                        title={`Open ${tbl.name}`}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Table Columns List */}
                <div className="p-2 space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
                  {isCurrent ? (
                    columns.map((c) => {
                      const isFk = foreignKeys.some((f) => f.column_name === c.name);
                      return (
                        <div
                          key={c.name}
                          className={`flex items-center justify-between px-2 py-1.5 rounded transition ${
                            c.is_primary_key
                              ? 'bg-amber-500/10 text-amber-200 border border-amber-500/20'
                              : isFk
                              ? 'bg-indigo-500/10 text-indigo-200 border border-indigo-500/20'
                              : 'text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5 truncate">
                            {c.is_primary_key ? (
                              <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : isFk ? (
                              <LinkIcon className="w-3 h-3 text-indigo-400 shrink-0" />
                            ) : (
                              <span className="w-3 h-3 inline-block" />
                            )}
                            <span className="font-medium truncate">{c.name}</span>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <span className="text-[10px] text-slate-400 bg-slate-950 px-1 py-0.2 rounded border border-slate-800">
                              {c.data_type}
                            </span>
                            {!c.nullable && (
                              <span className="text-[9px] text-rose-400 font-sans font-semibold">
                                *
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-4 text-center text-slate-500 space-y-2">
                      <p className="text-[11px] font-sans">Table schema ready</p>
                      {onSelectTable && (
                        <button
                          onClick={() => onSelectTable(tbl.name)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-sans transition cursor-pointer"
                        >
                          Inspect Columns
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between font-sans">
                  <span>{tbl.table_type || 'TABLE'}</span>
                  <span>{isCurrent ? `${columns.length} columns` : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
