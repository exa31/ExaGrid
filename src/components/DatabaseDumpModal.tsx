import {
  AlertCircle,
  Check,
  CheckSquare,
  Copy,
  Download,
  FileCode,
  FileDown,
  RefreshCw,
  Square,
  Table2,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { tauriBridge } from '../services/tauriBridge';
import type { DatabaseEngine, TableMeta } from '../types/database';

interface DatabaseDumpModalProps {
  isOpen: boolean;
  databaseName?: string;
  tables: TableMeta[];
  engine: DatabaseEngine;
  connectionId: string | null;
  onClose: () => void;
  onOpenInEditor?: (sql: string) => void;
}

export const DatabaseDumpModal = ({
  isOpen,
  databaseName,
  tables,
  engine,
  connectionId,
  onClose,
  onOpenInEditor,
}: DatabaseDumpModalProps) => {
  const [selectedTables, setSelectedTables] = useState<string[]>(() =>
    tables.map((t) => t.name)
  );
  const [dumpMode, setDumpMode] = useState<'both' | 'structure' | 'data'>('both');
  const [addDropTable, setAddDropTable] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleToggleTable = (tblName: string) => {
    if (selectedTables.includes(tblName)) {
      setSelectedTables(selectedTables.filter((t) => t !== tblName));
    } else {
      setSelectedTables([...selectedTables, tblName]);
    }
  };

  const handleSelectAll = () => {
    setSelectedTables(tables.map((t) => t.name));
  };

  const handleDeselectAll = () => {
    setSelectedTables([]);
  };

  const handleGenerateDump = async () => {
    if (!connectionId || selectedTables.length === 0) return;
    setIsGenerating(true);
    setError(null);
    setProgressMsg('Initializing dump engine...');
    try {
      const sql = await tauriBridge.generateDumpSql(
        connectionId,
        engine,
        selectedTables,
        {
          includeStructure: dumpMode === 'both' || dumpMode === 'structure',
          includeData: dumpMode === 'both' || dumpMode === 'data',
          addDropTable,
        },
        databaseName,
        (msg) => setProgressMsg(msg)
      );
      setGeneratedSql(sql);
    } catch (err: any) {
      setError(err.message || 'Failed to generate database dump');
    } finally {
      setIsGenerating(false);
      setProgressMsg('');
    }
  };

  const handleDownload = () => {
    if (!generatedSql) return;
    const blob = new Blob([generatedSql], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${databaseName || 'database'}_dump_${timestamp}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!generatedSql) return;
    navigator.clipboard.writeText(generatedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <FileDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Database Dump & SQL Backup</h3>
              <p className="text-[11px] text-slate-400">
                Export database schema and records to a standard .sql script
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!generatedSql ? (
            <>
              {/* Dump Mode Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Export Content
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label
                    className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition text-xs ${
                      dumpMode === 'both'
                        ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-200 font-medium'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dumpMode"
                      checked={dumpMode === 'both'}
                      onChange={() => setDumpMode('both')}
                      className="sr-only"
                    />
                    <span>Structure & Data</span>
                  </label>

                  <label
                    className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition text-xs ${
                      dumpMode === 'structure'
                        ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-200 font-medium'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dumpMode"
                      checked={dumpMode === 'structure'}
                      onChange={() => setDumpMode('structure')}
                      className="sr-only"
                    />
                    <span>Structure Only (DDL)</span>
                  </label>

                  <label
                    className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition text-xs ${
                      dumpMode === 'data'
                        ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-200 font-medium'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dumpMode"
                      checked={dumpMode === 'data'}
                      onChange={() => setDumpMode('data')}
                      className="sr-only"
                    />
                    <span>Data Only (INSERTs)</span>
                  </label>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center space-x-4 pt-1">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={addDropTable}
                    onChange={(e) => setAddDropTable(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-0 focus:ring-offset-0 bg-slate-950"
                  />
                  <span>Include DROP TABLE IF EXISTS statements</span>
                </label>
              </div>

              {/* Table Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-300">
                    Select Tables ({selectedTables.length} / {tables.length} selected)
                  </label>
                  <div className="flex items-center space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-emerald-400 hover:underline cursor-pointer flex items-center space-x-1"
                    >
                      <CheckSquare className="w-3 h-3" />
                      <span>Select All</span>
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-slate-400 hover:underline cursor-pointer flex items-center space-x-1"
                    >
                      <Square className="w-3 h-3" />
                      <span>Deselect All</span>
                    </button>
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto border border-slate-800 rounded-lg bg-slate-950/60 divide-y divide-slate-800/60">
                  {tables.map((t) => {
                    const isChecked = selectedTables.includes(t.name);
                    return (
                      <div
                        key={t.name}
                        onClick={() => handleToggleTable(t.name)}
                        className="px-3 py-2 flex items-center justify-between hover:bg-slate-900/60 cursor-pointer text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent div
                            className="rounded border-slate-700 text-emerald-600 bg-slate-900 pointer-events-none"
                          />
                          <Table2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-slate-200">{t.name}</span>
                        </div>
                        {t.row_count !== undefined && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            ~{t.row_count} rows
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Output Preview */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-400 flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>SQL Dump successfully generated! ({generatedSql.length.toLocaleString()} characters)</span>
                </span>
                <button
                  onClick={() => setGeneratedSql(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
                >
                  Configure & Regenerate
                </button>
              </div>

              <pre className="h-72 overflow-auto bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-200 select-text leading-relaxed whitespace-pre">
                {generatedSql.slice(0, 5000)}
                {generatedSql.length > 5000 && '\n\n/* ... (truncated in preview for performance) ... */'}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div>
            {isGenerating && (
              <span className="text-xs text-indigo-400 flex items-center space-x-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{progressMsg || 'Generating dump...'}</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
            >
              Close
            </button>

            {!generatedSql ? (
              <button
                type="button"
                onClick={handleGenerateDump}
                disabled={isGenerating || selectedTables.length === 0}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
              >
                {isGenerating ? (
                  <span>Generating...</span>
                ) : (
                  <>
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Generate SQL Dump</span>
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1.5"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? 'Copied' : 'Copy SQL'}</span>
                </button>

                {onOpenInEditor && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenInEditor(generatedSql);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Open in Editor</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .sql File</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
