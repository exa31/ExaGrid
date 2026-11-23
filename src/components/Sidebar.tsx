import { Database, Plus, Power, PowerOff, RefreshCw,Trash2 } from 'lucide-react';

import type { DatabaseEngine, StoredProfile } from '../types/database';

interface SidebarProps {
  profiles: StoredProfile[];
  activeProfileId: string | null;
  connectedProfileId: string | null;
  onSelectProfile: (id: string) => void;
  onConnectProfile: (id: string) => void;
  onDisconnectProfile: (id: string) => void;
  onOpenNewModal: () => void;
  onDeleteProfile: (id: string) => void;
  onRefresh: () => void;
  connectingId: string | null;
}

export const getEngineBadge = (engine: DatabaseEngine) => {
  switch (engine) {
    case 'postgres':
      return { icon: '🐘', label: 'PG', color: 'bg-blue-900/40 text-blue-400 border-blue-800/60' };
    case 'mysql':
      return { icon: '🐬', label: 'MY', color: 'bg-amber-900/40 text-amber-400 border-amber-800/60' };
    case 'sqlite':
      return { icon: '🪶', label: 'LITE', color: 'bg-purple-900/40 text-purple-400 border-purple-800/60' };
    case 'mongo':
      return { icon: '🍃', label: 'MDB', color: 'bg-emerald-900/40 text-emerald-400 border-emerald-800/60' };
  }
};

export const Sidebar = ({
  profiles,
  activeProfileId,
  connectedProfileId,
  onSelectProfile,
  onConnectProfile,
  onDisconnectProfile,
  onOpenNewModal,
  onDeleteProfile,
  onRefresh,
  connectingId,
}: SidebarProps) => (
    <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col h-full select-none shrink-0">
      <div className="h-12 border-b border-slate-800/80 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Connections
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onRefresh}
            title="Refresh Connections"
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenNewModal}
            title="New Connection"
            className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {profiles.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            <p>No connections saved.</p>
            <button
              onClick={onOpenNewModal}
              className="mt-2 text-indigo-400 hover:underline font-medium"
            >
              + Create your first profile
            </button>
          </div>
        ) : (
          profiles.map((p) => {
            const badge = getEngineBadge(p.engine);
            const isSelected = activeProfileId === p.id;
            const isConnected = connectedProfileId === p.id;
            const isConnecting = connectingId === p.id;

            return (
              <div
                key={p.id}
                onClick={() => onSelectProfile(p.id)}
                className={`group relative flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-xs border ${
                  isSelected
                    ? 'bg-slate-800/90 border-slate-700 text-slate-100 shadow-xs'
                    : 'bg-slate-900/40 border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate mr-2">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-xs border ${badge.color}`}
                    title={p.engine}
                  >
                    <span>{badge.icon}</span>
                  </div>
                  <div className="truncate">
                    <div className="font-medium truncate text-slate-200">{p.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      {p.engine === 'sqlite'
                        ? p.file_path || 'sqlite.db'
                        : `${p.host || 'localhost'}:${p.port || ''} / ${p.database || ''}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  {isConnected ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDisconnectProfile(p.id);
                      }}
                      title="Disconnect"
                      className="p-1 text-emerald-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition"
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      disabled={isConnecting}
                      onClick={(e) => {
                        e.stopPropagation();
                        onConnectProfile(p.id);
                      }}
                      title="Connect"
                      className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded-md transition disabled:opacity-40"
                    >
                      {isConnecting ? (
                        <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <PowerOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete connection "${p.name}"?`)) {
                        onDeleteProfile(p.id);
                      }
                    }}
                    title="Delete connection"
                    className="p-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-md transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500">
        <span>ExaGrid Desktop</span>
        <span className="font-mono text-[10px] text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-900/60">
          v0.1.0-alpha
        </span>
      </div>
    </aside>
  );
