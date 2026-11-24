import {
  AlertCircle,
  HardDrive,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

import { tauriBridge } from '../services/tauriBridge';
import type { DatabaseEngine, MaintenanceOperation, MaintenanceResult } from '../types/database';

interface TableMaintenanceModalProps {
  isOpen: boolean;
  tableName: string;
  engine: DatabaseEngine;
  connectionId: string | null;
  database?: string;
  onClose: () => void;
}

const OPERATIONS: {
  id: MaintenanceOperation;
  title: string;
  description: string;
  icon: any;
  color: string;
}[] = [
  {
    id: 'ANALYZE',
    title: 'Analyze Table',
    description: 'Analyzes and updates key distribution & statistics for the query planner.',
    icon: Search,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    id: 'OPTIMIZE',
    title: 'Optimize Table',
    description: 'Defragments data pages and reclaims unused disk space (rebuilds table).',
    icon: Zap,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'CHECK',
    title: 'Check Table',
    description: 'Verifies table structure and indices for errors or physical corruption.',
    icon: ShieldCheck,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'REPAIR',
    title: 'Repair Table',
    description: 'Attempts to repair a corrupted table or corrupted indices.',
    icon: Wrench,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  },
];

export const TableMaintenanceModal = ({
  isOpen,
  tableName,
  engine,
  connectionId,
  database,
  onClose,
}: TableMaintenanceModalProps) => {
  const [selectedOp, setSelectedOp] = useState<MaintenanceOperation>('ANALYZE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MaintenanceResult[] | null>(null);

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (!connectionId) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await tauriBridge.executeMaintenance(
        connectionId,
        engine,
        tableName,
        selectedOp,
        database
      );
      setResults(res);
    } catch (err: any) {
      setError(err.message || `Failed to execute ${selectedOp} TABLE`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Table Maintenance Tools</h3>
              <p className="text-[11px] text-slate-400">
                Maintain and optimize table: <span className="font-mono text-indigo-300">{tableName}</span>
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
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Operation Selector */}
          <div className="grid grid-cols-2 gap-2.5">
            {OPERATIONS.map((op) => {
              const Icon = op.icon;
              const isSelected = selectedOp === op.id;
              return (
                <div
                  key={op.id}
                  onClick={() => setSelectedOp(op.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex flex-col space-y-1.5 ${
                    isSelected
                      ? 'border-indigo-500/80 bg-indigo-950/20 shadow-xs'
                      : 'border-slate-800/80 bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`p-1 rounded-md border ${op.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200">{op.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                    {op.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* SQL Command Preview */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-indigo-400 select-text">
            {selectedOp} TABLE `{tableName}`;
          </div>

          {/* Results Grid if executed */}
          {results && (
            <div className="space-y-2 animate-in fade-in duration-150">
              <span className="text-xs font-medium text-slate-300">Execution Result:</span>
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] text-slate-400 font-semibold">
                      <th className="py-2 px-3">Table</th>
                      <th className="py-2 px-3">Op</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {results.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-900/40">
                        <td className="py-2 px-3 text-slate-300">{r.table}</td>
                        <td className="py-2 px-3 text-indigo-400">{r.operation}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                              r.msg_type.toLowerCase() === 'status' || r.msg_text.toLowerCase() === 'ok'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/60'
                                : 'bg-amber-950/60 text-amber-400 border border-amber-900/60'
                            }`}
                          >
                            {r.msg_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-200">{r.msg_text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end space-x-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={loading}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Executing...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Run {selectedOp}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
