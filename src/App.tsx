import { ShieldCheck,Zap } from 'lucide-react';
import { useEffect,useState } from 'react';

import { ConnectionModal } from './components/ConnectionModal';
import { DataGrid } from './components/DataGrid';
import { ObjectExplorer } from './components/ObjectExplorer';
import { QueryConsole } from './components/QueryConsole';
import { Sidebar } from './components/Sidebar';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import { tauriBridge } from './services/tauriBridge';
import type {
  ConnectionConfig,
  StoredProfile,
  TabItem,
  TableMeta,
} from './types/database';

export default function App() {
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [connectedProfileId, setConnectedProfileId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const [tables, setTables] = useState<TableMeta[]>([]);
  const [loadingTables, setLoadingTables] = useState<boolean>(false);

  const [tabs, setTabs] = useState<TabItem[]>([
    {
      id: 'tab-1',
      title: 'SQL Console 1',
      type: 'query',
      connectionId: '',
      query: 'SELECT * FROM users LIMIT 50;',
      queryResult: null,
      loading: false,
      error: null,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ConnectionConfig | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const list = await tauriBridge.listConnections();
      setProfiles(list);
      if (list.length > 0 && !activeProfileId) {
        setActiveProfileId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  };

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null;
  const connectedProfile = profiles.find((p) => p.id === connectedProfileId) || null;

  const handleConnect = async (profileId: string) => {
    setConnectingId(profileId);
    try {
      await tauriBridge.connectDatabase(profileId);
      setConnectedProfileId(profileId);
      setActiveProfileId(profileId);
      await loadTables(profileId);
    } catch (err: any) {
      alert(`Connection failed: ${err.message || err}`);
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (profileId: string) => {
    try {
      await tauriBridge.disconnectDatabase(profileId);
      if (connectedProfileId === profileId) {
        setConnectedProfileId(null);
        setTables([]);
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const loadTables = async (profileId: string) => {
    setLoadingTables(true);
    try {
      const prof = profiles.find((p) => p.id === profileId);
      const list = await tauriBridge.listTables(profileId, prof?.database);
      setTables(list);
    } catch (err: any) {
      console.error('Failed to fetch tables:', err);
    } finally {
      setLoadingTables(false);
    }
  };

  const handleSelectTable = async (tableName: string) => {
    const existingTab = tabs.find(
      (t) => t.type === 'table' && t.table === tableName && t.connectionId === connectedProfileId
    );

    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    const newTabId = `table-tab-${Date.now()}`;
    const engine = connectedProfile?.engine || 'postgres';
    const initialQuery =
      engine === 'mongo'
        ? `{}`
        : `SELECT * FROM ${tableName} LIMIT 50;`;

    const newTab: TabItem = {
      id: newTabId,
      title: tableName,
      type: 'table',
      connectionId: connectedProfileId || '',
      table: tableName,
      query: initialQuery,
      queryResult: null,
      loading: true,
      error: null,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);

    if (connectedProfileId) {
      try {
        const res = await tauriBridge.executeQuery(
          connectedProfileId,
          initialQuery,
          connectedProfile?.database,
          tableName,
          50
        );
        setTabs((prev) =>
          prev.map((t) => (t.id === newTabId ? { ...t, queryResult: res, loading: false } : t))
        );
      } catch (err: any) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === newTabId
              ? { ...t, error: err.message || 'Failed to fetch table records', loading: false }
              : t
          )
        );
      }
    }
  };

  const handleNewQueryTab = () => {
    const tabNum = tabs.filter((t) => t.type === 'query').length + 1;
    const newTabId = `query-tab-${Date.now()}`;
    const newTab: TabItem = {
      id: newTabId,
      title: `Query ${tabNum}`,
      type: 'query',
      connectionId: connectedProfileId || '',
      query:
        connectedProfile?.engine === 'mongo'
          ? `{"status": "active"}`
          : `SELECT * FROM ${tables[0]?.name || 'users'} LIMIT 50;`,
      queryResult: null,
      loading: false,
      error: null,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
  };

  const handleCloseTab = (id: string) => {
    if (tabs.length <= 1) return;
    const nextTabs = tabs.filter((t) => t.id !== id);
    setTabs(nextTabs);
    if (activeTabId === id) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  const handleExecuteQuery = async (queryStr: string) => {
    if (!connectedProfileId) {
      alert('Please connect to a database first (click power icon on left connection profile).');
      return;
    }

    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, loading: true, error: null } : t))
    );

    try {
      const activeTab = tabs.find((t) => t.id === activeTabId);
      const res = await tauriBridge.executeQuery(
        connectedProfileId,
        queryStr,
        connectedProfile?.database,
        activeTab?.table || tables[0]?.name,
        100
      );
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId ? { ...t, queryResult: res, loading: false, error: null } : t
        )
      );
    } catch (err: any) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, error: err.message || 'Query execution error', loading: false }
            : t
        )
      );
    }
  };

  const handleSaveProfile = async (cfg: ConnectionConfig) => {
    await tauriBridge.saveConnection(cfg);
    await loadProfiles();
  };

  const handleDeleteProfile = async (id: string) => {
    await tauriBridge.deleteConnection(id);
    if (connectedProfileId === id) {
      setConnectedProfileId(null);
      setTables([]);
    }
    await loadProfiles();
  };

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      <header className="h-11 bg-slate-950 border-b border-slate-800/80 px-4 flex items-center justify-between select-none shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-linear-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-xs">
              <Zap className="w-3.5 h-3.5 text-white fill-current" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">ExaGrid</span>
            <span className="text-[10px] uppercase font-semibold text-indigo-400 bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-900/60 font-mono">
              Desktop
            </span>
          </div>

          <span className="text-slate-700">|</span>

          {connectedProfile ? (
            <div className="flex items-center space-x-2 text-xs bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-slate-200">{connectedProfile.name}</span>
              <span className="text-slate-500 font-mono text-[11px]">
                ({connectedProfile.database || 'default'})
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              <span>Not Connected</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="flex items-center space-x-1 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>AES-256 Storage</span>
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          profiles={profiles}
          activeProfileId={activeProfileId}
          connectedProfileId={connectedProfileId}
          onSelectProfile={(id) => {
            setActiveProfileId(id);
            if (connectedProfileId !== id) {
              handleConnect(id);
            }
          }}
          onConnectProfile={handleConnect}
          onDisconnectProfile={handleDisconnect}
          onOpenNewModal={() => {
            setEditingProfile(null);
            setIsModalOpen(true);
          }}
          onDeleteProfile={handleDeleteProfile}
          onRefresh={loadProfiles}
          connectingId={connectingId}
        />

        <ObjectExplorer
          activeProfileName={connectedProfile?.name || activeProfile?.name || null}
          databaseName={connectedProfile?.database || activeProfile?.database || null}
          tables={tables}
          loading={loadingTables}
          onSelectTable={handleSelectTable}
          onOpenNewQuery={handleNewQueryTab}
          onRefreshTables={() => connectedProfileId && loadTables(connectedProfileId)}
        />

        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          <WorkspaceTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={handleCloseTab}
            onNewQueryTab={handleNewQueryTab}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab?.type === 'query' && (
              <QueryConsole
                initialQuery={activeTab.query}
                onExecute={handleExecuteQuery}
                loading={activeTab.loading || false}
                result={activeTab.queryResult || null}
                error={activeTab.error || null}
                engine={connectedProfile?.engine}
              />
            )}

            <DataGrid
              result={activeTab?.queryResult || null}
              loading={activeTab?.loading || false}
              tableName={activeTab?.table}
            />
          </div>
        </main>
      </div>

      <ConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProfile}
        initialConfig={editingProfile}
      />
    </div>
  );
}
