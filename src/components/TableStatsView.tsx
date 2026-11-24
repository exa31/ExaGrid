import {
  BarChart3,
  Calendar,
  Clock,
  Cpu,
  Database,
  FileSpreadsheet,
  HardDrive,
  Layers,
  Sparkles,
} from 'lucide-react';

import type { TableStatsMeta } from '../types/database';

interface TableStatsViewProps {
  tableName: string;
  stats: TableStatsMeta | null;
  loading: boolean;
  onRefresh: () => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const TableStatsView = ({
  tableName,
  stats,
  loading,
  onRefresh,
}: TableStatsViewProps) => {
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium">Loading table storage statistics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 space-y-3">
        <Database className="w-10 h-10 text-slate-700" />
        <p className="text-xs font-medium text-slate-400">
          Storage statistics not available for table "{tableName}".
        </p>
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium transition cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const dataSize = stats.data_size_bytes || 0;
  const indexSize = stats.index_size_bytes || 0;
  const totalSize = stats.total_size_bytes || dataSize + indexSize;
  const dataPct = totalSize > 0 ? Math.round((dataSize / totalSize) * 100) : 0;
  const indexPct = totalSize > 0 ? 100 - dataPct : 0;

  return (
    <div className="flex-1 overflow-auto p-6 bg-slate-950 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Metric Cards Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Total Size</span>
              <HardDrive className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-xl font-bold font-mono text-slate-100">
              {formatBytes(totalSize)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 font-mono">
              Data + Index storage
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Estimated Rows</span>
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xl font-bold font-mono text-slate-100">
              {stats.row_count?.toLocaleString() || 0}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 font-mono">
              Avg row: {stats.avg_row_length ? `${stats.avg_row_length} B` : '-'}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Storage Engine</span>
              <Cpu className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xl font-bold font-mono text-slate-100">
              {stats.engine || 'InnoDB'}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 font-mono truncate" title={stats.collation}>
              {stats.collation || 'Standard'}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Next Auto Inc</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-xl font-bold font-mono text-slate-100">
              {stats.auto_increment ? String(stats.auto_increment) : '-'}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 font-mono">
              Identity counter
            </span>
          </div>
        </div>

        {/* Storage Distribution Visual Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-slate-200">Storage Allocation Breakdown</span>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">{formatBytes(totalSize)}</span>
          </div>

          {/* Progress bar */}
          <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
            <div
              style={{ width: `${dataPct}%` }}
              className="bg-indigo-600 transition-all duration-300"
              title={`Data: ${formatBytes(dataSize)} (${dataPct}%)`}
            />
            <div
              style={{ width: `${indexPct}%` }}
              className="bg-amber-500 transition-all duration-300"
              title={`Index: ${formatBytes(indexSize)} (${indexPct}%)`}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono pt-1">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded bg-indigo-600" />
              <span className="text-slate-300 font-medium">Table Data:</span>
              <span className="text-slate-400">{formatBytes(dataSize)} ({dataPct}%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-slate-300 font-medium">Indexes:</span>
              <span className="text-slate-400">{formatBytes(indexSize)} ({indexPct}%)</span>
            </div>
          </div>
        </div>

        {/* Detailed Properties Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-200">Table Properties & Metadata</span>
            </div>
          </div>

          <div className="divide-y divide-slate-800/80 text-xs font-mono">
            <div className="px-5 py-2.5 flex items-center justify-between hover:bg-slate-800/20">
              <span className="text-slate-400 font-sans">Table Name</span>
              <span className="text-slate-200 font-semibold">{tableName}</span>
            </div>
            <div className="px-5 py-2.5 flex items-center justify-between hover:bg-slate-800/20">
              <span className="text-slate-400 font-sans">Storage Engine</span>
              <span className="text-indigo-400">{stats.engine || 'InnoDB'}</span>
            </div>
            <div className="px-5 py-2.5 flex items-center justify-between hover:bg-slate-800/20">
              <span className="text-slate-400 font-sans">Collation / Character Set</span>
              <span className="text-amber-300">{stats.collation || 'default'}</span>
            </div>
            <div className="px-5 py-2.5 flex items-center justify-between hover:bg-slate-800/20">
              <span className="text-slate-400 font-sans">Data Length</span>
              <span className="text-slate-200">{formatBytes(stats.data_size_bytes)} ({stats.data_size_bytes?.toLocaleString() || 0} bytes)</span>
            </div>
            <div className="px-5 py-2.5 flex items-center justify-between hover:bg-slate-800/20">
              <span className="text-slate-400 font-sans">Index Length</span>
              <span className="text-slate-200">{formatBytes(stats.index_size_bytes)} ({stats.index_size_bytes?.toLocaleString() || 0} bytes)</span>
            </div>
            {stats.create_time && (
              <div className="px-5 py-2.5 flex items-center justify-between hover:bg-slate-800/20">
                <span className="text-slate-400 font-sans flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Created Time</span>
                </span>
                <span className="text-slate-400">{stats.create_time}</span>
              </div>
            )}
            {stats.update_time && (
              <div className="px-5 py-2.5 flex items-center justify-between hover:bg-slate-800/20">
                <span className="text-slate-400 font-sans flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Updated Time</span>
                </span>
                <span className="text-slate-400">{stats.update_time}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
