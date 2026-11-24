import {
  AlertCircle,
  Check,
  Copy,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { tauriBridge } from '../services/tauriBridge';
import type { DatabaseEngine, ServerVariable } from '../types/database';

interface ServerVariablesModalProps {
  isOpen: boolean;
  connectionId: string | null;
  engine: DatabaseEngine;
  database?: string;
  onClose: () => void;
}

const ServerVariablesContent = ({
  connectionId,
  engine,
  database,
  onClose,
}: {
  connectionId: string;
  engine: DatabaseEngine;
  database?: string;
  onClose: () => void;
}) => {
  const [variables, setVariables] = useState<ServerVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchVariables = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await tauriBridge.getServerVariables(connectionId, engine, database);
      setVariables(list);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch server variables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    tauriBridge
      .getServerVariables(connectionId, engine, database)
      .then((list) => {
        if (!ignore) {
          setVariables(list);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(err.message || 'Failed to load variables');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [connectionId, engine, database]);

  const handleCopy = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return variables;
    const term = searchTerm.toLowerCase();
    return variables.filter(
      (v) =>
        v.variable_name.toLowerCase().includes(term) ||
        v.value.toLowerCase().includes(term)
    );
  }, [variables, searchTerm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl h-[80vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold text-slate-100">
                  Server Variables & Configuration
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {variables.length} parameters
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Engine: {engine.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchVariables}
              disabled={loading}
              title="Refresh Parameters"
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
          <div className="relative w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search variables (e.g. max_connections, timeout, ssl)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            Showing {filtered.length} of {variables.length} variables
          </span>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-5 my-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center space-x-2 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Grid Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="bg-slate-950/80 sticky top-0 border-b border-slate-800 text-[11px] text-slate-400 select-none">
              <tr>
                <th className="py-2 px-4 w-12 text-center">#</th>
                <th className="py-2 px-4 w-72">Variable Name</th>
                <th className="py-2 px-4">Value</th>
                <th className="py-2 px-4 w-16 text-right">Copy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 font-sans">
                    {loading ? 'Fetching server variables...' : 'No variables found matching query.'}
                  </td>
                </tr>
              ) : (
                filtered.map((v, i) => (
                  <tr key={v.variable_name} className="hover:bg-slate-800/40 transition group">
                    <td className="py-2 px-4 text-center text-slate-600 text-[11px] select-none">
                      {i + 1}
                    </td>
                    <td className="py-2 px-4 font-semibold text-slate-200 truncate max-w-72">
                      {v.variable_name}
                    </td>
                    <td className="py-2 px-4 text-indigo-300 truncate max-w-lg select-text" title={v.value}>
                      {v.value || <span className="text-slate-600 italic">empty</span>}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <button
                        onClick={() => handleCopy(v.variable_name, v.value)}
                        title="Copy Value"
                        className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                      >
                        {copiedKey === v.variable_name ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>{variables.length} system parameters loaded</span>
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

export const ServerVariablesModal = ({
  isOpen,
  connectionId,
  engine,
  database,
  onClose,
}: ServerVariablesModalProps) => {
  if (!isOpen || !connectionId) return null;

  return (
    <ServerVariablesContent
      connectionId={connectionId}
      engine={engine}
      database={database}
      onClose={onClose}
    />
  );
};
