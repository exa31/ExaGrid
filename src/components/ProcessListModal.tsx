import {
  Activity,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  SquareX,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { tauriBridge } from '../services/tauriBridge';
import type { DatabaseEngine, ProcessInfo } from '../types/database';

interface ProcessListModalProps {
  isOpen: boolean;
  connectionId: string | null;
  engine: DatabaseEngine;
  database?: string;
  onClose: () => void;
}

interface ProcessListContentProps {
  connectionId: string;
  engine: DatabaseEngine;
  database?: string;
  onClose: () => void;
}

const ProcessListContent = ({
  connectionId,
  engine,
  database,
  onClose,
}: ProcessListContentProps) => {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [killingId, setKillingId] = useState<string | number | null>(null);

  const fetchProcesses = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await tauriBridge.getServerProcessList(connectionId, engine, database);
      setProcesses(list);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch server process list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    tauriBridge
      .getServerProcessList(connectionId, engine, database)
      .then((list) => {
        if (!ignore) {
          setProcesses(list);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(err.message || 'Failed to fetch server process list');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [connectionId, engine, database]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchProcesses();
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, connectionId]);

  const handleKill = async (id: string | number) => {
    if (!confirm(`Are you sure you want to terminate / kill process #${id}?`)) {
      return;
    }

    setKillingId(id);
    try {
      await tauriBridge.killProcess(connectionId, engine, id);
      await fetchProcesses();
    } catch (err: any) {
      alert(`Failed to kill process: ${err.message || err}`);
    } finally {
      setKillingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return processes;
    const term = searchTerm.toLowerCase();
    return processes.filter(
      (p) =>
        String(p.id).includes(term) ||
        p.user.toLowerCase().includes(term) ||
        (p.db && p.db.toLowerCase().includes(term)) ||
        p.command.toLowerCase().includes(term) ||
        (p.info && p.info.toLowerCase().includes(term))
    );
  }, [processes, searchTerm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-5xl h-[80vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold text-slate-100">
                  Server Activity & Processlist
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {filtered.length} active threads
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Engine: {engine.toUpperCase()} {database ? `• DB: ${database}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer select-none bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 hover:bg-slate-800 transition">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-0"
              />
              <span>Auto-refresh (3s)</span>
            </label>

            <button
              onClick={fetchProcesses}
              disabled={loading}
              title="Refresh Process List"
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar & Filter */}
        <div className="px-5 py-2.5 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between shrink-0">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by ID, User, DB, Query..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <span className="text-[11px] text-slate-500">
            Terminate hung queries or inspect long-running statements
          </span>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-5 my-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center space-x-2 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Process Table Grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="bg-slate-950/80 sticky top-0 border-b border-slate-800 text-[11px] text-slate-400 select-none">
              <tr>
                <th className="py-2 px-3 w-16">ID</th>
                <th className="py-2 px-3 w-28">User</th>
                <th className="py-2 px-3 w-36">Host</th>
                <th className="py-2 px-3 w-24">DB</th>
                <th className="py-2 px-3 w-28">Command</th>
                <th className="py-2 px-3 w-20">Time</th>
                <th className="py-2 px-3 w-28">State</th>
                <th className="py-2 px-3">Active Query / Info</th>
                <th className="py-2 px-3 w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No active processes matching filter.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isSlow = p.time >= 5 && p.time < 20;
                  const isCritical = p.time >= 20;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3 font-semibold text-slate-400">{p.id}</td>
                      <td className="py-2 px-3 text-slate-300 truncate max-w-28">{p.user}</td>
                      <td className="py-2 px-3 text-slate-400 truncate max-w-36">{p.host}</td>
                      <td className="py-2 px-3 text-indigo-400">{p.db || '-'}</td>
                      <td className="py-2 px-3 text-slate-300">{p.command}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`flex items-center space-x-1 ${
                            isCritical
                              ? 'text-rose-400 font-bold bg-rose-500/10 px-1 rounded'
                              : isSlow
                              ? 'text-amber-400 font-semibold bg-amber-500/10 px-1 rounded'
                              : 'text-slate-400'
                          }`}
                        >
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{p.time}s</span>
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 truncate max-w-28">
                        {p.state || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-200 truncate max-w-xs font-mono" title={p.info}>
                        {p.info || <span className="text-slate-600 italic">idle / sleep</span>}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleKill(p.id)}
                          disabled={killingId === p.id}
                          title="Terminate / Kill this query"
                          className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 hover:text-white text-[11px] transition flex items-center space-x-1 ml-auto cursor-pointer"
                        >
                          <SquareX className="w-3 h-3" />
                          <span>Kill</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0 font-sans">
          <span>
            {processes.length} total processes • Connected to {engine.toUpperCase()}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md border border-slate-700 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const ProcessListModal = ({
  isOpen,
  connectionId,
  engine,
  database,
  onClose,
}: ProcessListModalProps) => {
  if (!isOpen || !connectionId) return null;

  return (
    <ProcessListContent
      connectionId={connectionId}
      engine={engine}
      database={database}
      onClose={onClose}
    />
  );
};
