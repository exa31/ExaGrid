import { AlertCircle, CheckCircle2, Clock, History, Play, RotateCcw, Sparkles } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';

import type { QueryResult } from '../types/database';

interface QueryConsoleProps {
  initialQuery?: string;
  onExecute: (query: string) => Promise<void>;
  loading: boolean;
  result: QueryResult | null;
  error: string | null;
  engine?: string;
}

export const QueryConsole = ({
  initialQuery = 'SELECT * FROM users LIMIT 50;',
  onExecute,
  loading,
  result,
  error,
  engine = 'postgres',
}: QueryConsoleProps) => {
  const [query, setQuery] = useState(initialQuery);
  const [prevInitial, setPrevInitial] = useState(initialQuery);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  if (initialQuery !== prevInitial) {
    setPrevInitial(initialQuery);
    setQuery(initialQuery);
  }

  const handleRun = async () => {
    if (!query.trim() || loading) return;
    if (!history.includes(query.trim())) {
      setHistory((prev) => [query.trim(), ...prev.slice(0, 19)]);
    }
    await onExecute(query);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  };

  const formatSimple = () => {
    const formatted = query
      .replace(/\bSELECT\b/gi, '\nSELECT')
      .replace(/\bFROM\b/gi, '\nFROM')
      .replace(/\bWHERE\b/gi, '\nWHERE')
      .replace(/\bJOIN\b/gi, '\nJOIN')
      .replace(/\bORDER BY\b/gi, '\nORDER BY')
      .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
      .replace(/\bLIMIT\b/gi, '\nLIMIT')
      .trim();
    setQuery(formatted);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-b border-slate-800/80">
      <div className="h-10 bg-slate-900/60 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRun}
            disabled={loading || !query.trim()}
            title="Execute Query (Cmd/Ctrl + Enter)"
            className="flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none rounded-md transition shadow-xs cursor-pointer"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Execute</span>
            <kbd className="hidden sm:inline-block text-[10px] bg-emerald-700/60 px-1 rounded text-emerald-100 font-mono">
              ⌘↵
            </kbd>
          </button>

          <button
            onClick={formatSimple}
            title="Format SQL"
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-md transition cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Format</span>
          </button>

          <button
            onClick={() => setQuery('')}
            title="Clear Console"
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {history.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center space-x-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>History ({history.length})</span>
              </button>

              {showHistory && (
                <div className="absolute left-0 mt-1 w-80 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto p-1.5 space-y-1">
                  {history.map((h, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setQuery(h);
                        setShowHistory(false);
                      }}
                      className="px-2.5 py-1.5 rounded text-xs font-mono text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer truncate"
                      title={h}
                    >
                      {h}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 text-xs">
          {result && (
            <div className="flex items-center space-x-1.5 text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/60 font-mono text-[11px]">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{result.execution_time_ms} ms</span>
              <span className="text-slate-600">•</span>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>
                {result.total_rows} rows {result.affected_rows > 0 ? `(${result.affected_rows} affected)` : ''}
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-1 text-rose-400 bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-900/60 text-[11px]">
              <AlertCircle className="w-3 h-3" />
              <span className="truncate max-w-[200px]" title={error}>
                {error}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="relative flex-1 min-h-[140px] max-h-[220px] bg-slate-950">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            engine === 'mongo'
              ? 'Enter MongoDB Filter JSON, e.g.: {"status": "active"}'
              : 'SELECT * FROM users WHERE active = true;'
          }
          spellCheck={false}
          className="w-full h-full bg-slate-950/80 text-slate-100 p-3.5 font-mono text-xs resize-none focus:outline-hidden leading-relaxed select-text"
        />
      </div>
    </div>
  );
};
