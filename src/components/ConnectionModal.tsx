import { AlertCircle, CheckCircle2, Loader2,Server, X } from 'lucide-react';
import { type FormEvent,useState } from 'react';

import { tauriBridge } from '../services/tauriBridge';
import type { ConnectionConfig, DatabaseEngine, PingResult } from '../types/database';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ConnectionConfig) => Promise<void>;
  initialConfig?: ConnectionConfig | null;
}

export const ConnectionModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: ConnectionModalProps) => {
  const [engine, setEngine] = useState<DatabaseEngine>(initialConfig?.engine || 'postgres');
  const [name, setName] = useState(initialConfig?.name || '');
  const [host, setHost] = useState(initialConfig?.host || 'localhost');
  const [port, setPort] = useState<number>(initialConfig?.port || 5432);
  const [username, setUsername] = useState(initialConfig?.username || 'postgres');
  const [password, setPassword] = useState(initialConfig?.password || '');
  const [database, setDatabase] = useState(initialConfig?.database || 'postgres');
  const [filePath, setFilePath] = useState(initialConfig?.file_path || 'data.db');
  const [ssl, setSsl] = useState<boolean>(initialConfig?.ssl || false);

  const [testing, setTesting] = useState(false);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [pingError, setPingError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEngineChange = (newEngine: DatabaseEngine) => {
    setEngine(newEngine);
    setPingResult(null);
    setPingError(null);
    if (newEngine === 'postgres') {
      setPort(5432);
      setUsername('postgres');
      setDatabase('postgres');
    } else if (newEngine === 'mysql') {
      setPort(3306);
      setUsername('root');
      setDatabase('mysql');
    } else if (newEngine === 'mongo') {
      setPort(27017);
      setUsername('');
      setDatabase('admin');
    }
  };

  const currentConfig: ConnectionConfig = {
    id: initialConfig?.id,
    name: name.trim() || `${engine.toUpperCase()} - ${host || filePath}`,
    engine,
    host: engine !== 'sqlite' ? host : undefined,
    port: engine !== 'sqlite' ? port : undefined,
    username: engine !== 'sqlite' ? username : undefined,
    password: engine !== 'sqlite' ? password : undefined,
    database: engine !== 'sqlite' ? database : undefined,
    file_path: engine === 'sqlite' ? filePath : undefined,
    ssl,
  };

  const handleTest = async () => {
    setTesting(true);
    setPingResult(null);
    setPingError(null);
    try {
      const res = await tauriBridge.testConnection(currentConfig);
      setPingResult(res);
    } catch (err: any) {
      setPingError(err.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSave(currentConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-100">
              {initialConfig ? 'Edit Connection' : 'New Connection Profile'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 rounded-md p-1 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1 p-2 bg-slate-950/70 border-b border-slate-800 text-xs font-medium">
          {(
            [
              { id: 'postgres', label: 'PostgreSQL', icon: '🐘' },
              { id: 'mysql', label: 'MySQL', icon: '🐬' },
              { id: 'sqlite', label: 'SQLite', icon: '🪶' },
              { id: 'mongo', label: 'MongoDB', icon: '🍃' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleEngineChange(t.id)}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg transition cursor-pointer ${
                engine === t.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Connection Name
            </label>
            <input
              type="text"
              placeholder={`My ${engine.toUpperCase()} Database`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {engine === 'sqlite' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Database File Path (.db / .sqlite)
              </label>
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="/path/to/database.db or data.sqlite"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Host</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Database Name
                  </label>
                  <input
                    type="text"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="ssl"
                  checked={ssl}
                  onChange={(e) => setSsl(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
                />
                <label htmlFor="ssl" className="text-xs text-slate-300">
                  Enable SSL / TLS connection
                </label>
              </div>
            </>
          )}

          {testing && (
            <div className="flex items-center space-x-2 text-xs text-indigo-400 bg-indigo-950/40 border border-indigo-900/60 p-2.5 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Testing connection ping to server...</span>
            </div>
          )}
          {pingResult && (
            <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 p-2.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {pingResult.message} ({pingResult.latency_ms} ms) — {pingResult.server_version}
              </span>
            </div>
          )}
          {pingError && (
            <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 p-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pingError}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={testing}
              onClick={handleTest}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition cursor-pointer"
            >
              Test Connection
            </button>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition cursor-pointer"
              >
                Save Profile
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
