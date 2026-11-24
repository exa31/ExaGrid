import {
  FileCode,
  KeyRound,
  Plus,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { AddColumnModal } from './components/AddColumnModal';
import { AddIndexModal } from './components/AddIndexModal';
import { ConnectionModal } from './components/ConnectionModal';
import { DataGrid } from './components/DataGrid';
import { EditColumnModal } from './components/EditColumnModal';
import { InsertRowModal } from './components/InsertRowModal';
import { ObjectExplorer } from './components/ObjectExplorer';
import { QueryConsole } from './components/QueryConsole';
import { Sidebar } from './components/Sidebar';
import { TableDesignerModal } from './components/TableDesignerModal';
import { TableStructureView } from './components/TableStructureView';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import { tauriBridge } from './services/tauriBridge';
import type {
  ColumnDefinition,
  ColumnMeta,
  ConnectionConfig,
  IndexDefinition,
  StoredProfile,
  TabItem,
  TableMeta,
  TableTabSubView,
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

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ConnectionConfig | null>(null);
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [isEditColumnOpen, setIsEditColumnOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ColumnMeta | null>(null);
  const [isAddIndexOpen, setIsAddIndexOpen] = useState(false);
  const [isInsertRowOpen, setIsInsertRowOpen] = useState(false);
  const [targetTableForModal, setTargetTableForModal] = useState<string>('');

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
  const engine = connectedProfile?.engine || 'postgres';

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

  const handleSelectTable = async (tableName: string, view: TableTabSubView = 'data') => {
    const existingTab = tabs.find(
      (t) => t.type === 'table' && t.table === tableName && t.connectionId === connectedProfileId
    );

    if (existingTab) {
      setActiveTabId(existingTab.id);
      setTabs((prev) =>
        prev.map((t) => (t.id === existingTab.id ? { ...t, subView: view } : t))
      );
      return;
    }

    const newTabId = `table-tab-${Date.now()}`;
    const initialQuery =
      engine === 'mongo'
        ? `{}`
        : tauriBridge.generateSelectSnippet(engine, tableName);

    const newTab: TabItem = {
      id: newTabId,
      title: tableName,
      type: 'table',
      connectionId: connectedProfileId || '',
      table: tableName,
      subView: view,
      query: initialQuery,
      queryResult: null,
      columns: [],
      indexes: [],
      ddl: '',
      loading: true,
      error: null,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);

    if (connectedProfileId) {
      try {
        const [queryRes, colsRes, idxRes, ddlRes] = await Promise.allSettled([
          tauriBridge.executeQuery(
            connectedProfileId,
            initialQuery,
            connectedProfile?.database,
            tableName,
            50
          ),
          tauriBridge.getTableColumns(connectedProfileId, tableName),
          tauriBridge.getTableIndexes(connectedProfileId, tableName),
          tauriBridge.getTableDdl(connectedProfileId, tableName),
        ]);

        setTabs((prev) =>
          prev.map((t) =>
            t.id === newTabId
              ? {
                  ...t,
                  queryResult: queryRes.status === 'fulfilled' ? queryRes.value : null,
                  columns: colsRes.status === 'fulfilled' ? colsRes.value : [],
                  indexes: idxRes.status === 'fulfilled' ? idxRes.value : [],
                  ddl: ddlRes.status === 'fulfilled' ? ddlRes.value.ddl : '',
                  loading: false,
                }
              : t
          )
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

  const handleChangeSubView = (view: TableTabSubView) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, subView: view } : t))
    );
  };

  const handleRefreshActiveTable = async () => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab || tab.type !== 'table' || !tab.table || !connectedProfileId) return;

    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, loading: true } : t))
    );

    try {
      const [queryRes, colsRes, idxRes, ddlRes] = await Promise.allSettled([
        tauriBridge.executeQuery(
          connectedProfileId,
          tab.query || `SELECT * FROM ${tab.table} LIMIT 50;`,
          connectedProfile?.database,
          tab.table,
          50
        ),
        tauriBridge.getTableColumns(connectedProfileId, tab.table),
        tauriBridge.getTableIndexes(connectedProfileId, tab.table),
        tauriBridge.getTableDdl(connectedProfileId, tab.table),
      ]);

      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                queryResult: queryRes.status === 'fulfilled' ? queryRes.value : null,
                columns: colsRes.status === 'fulfilled' ? colsRes.value : [],
                indexes: idxRes.status === 'fulfilled' ? idxRes.value : [],
                ddl: ddlRes.status === 'fulfilled' ? ddlRes.value.ddl : '',
                loading: false,
              }
            : t
        )
      );
    } finally {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, loading: false } : t))
      );
    }
  };

  const handleNewQueryTab = (initialQuery?: string) => {
    const tabNum = tabs.filter((t) => t.type === 'query').length + 1;
    const newTabId = `query-tab-${Date.now()}`;
    const defaultQuery =
      engine === 'mongo'
        ? `{"status": "active"}`
        : `SELECT * FROM ${tables[0]?.name || 'users'} LIMIT 50;`;

    const newTab: TabItem = {
      id: newTabId,
      title: `Query ${tabNum}`,
      type: 'query',
      connectionId: connectedProfileId || '',
      query: initialQuery || defaultQuery,
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

  // Alter Table Handlers
  const handleAddColumnToTable = async (col: ColumnDefinition) => {
    if (!connectedProfileId || !targetTableForModal) return;
    const sql = tauriBridge.generateAddColumnSql(engine, targetTableForModal, col);
    await tauriBridge.executeQuery(
      connectedProfileId,
      sql,
      connectedProfile?.database,
      targetTableForModal
    );
    await handleRefreshActiveTable();
    await loadTables(connectedProfileId);
  };

  const handleAddIndexToTable = async (idx: IndexDefinition) => {
    if (!connectedProfileId || !targetTableForModal) return;
    const sql = tauriBridge.generateAddIndexSql(engine, targetTableForModal, idx);
    await tauriBridge.executeQuery(
      connectedProfileId,
      sql,
      connectedProfile?.database,
      targetTableForModal
    );
    await handleRefreshActiveTable();
  };

  const handleOpenEditColumn = (col: ColumnMeta) => {
    setEditingColumn(col);
    setTargetTableForModal(activeTab?.table || '');
    setIsEditColumnOpen(true);
  };

  const handleEditColumn = async (oldColName: string, updatedCol: ColumnDefinition) => {
    const table = targetTableForModal || activeTab?.table;
    if (!table || !connectedProfileId) return;

    const sql = tauriBridge.generateEditColumnSql(engine, table, oldColName, updatedCol);
    await tauriBridge.executeQuery(
      connectedProfileId,
      sql,
      connectedProfile?.database,
      table
    );
    await handleRefreshActiveTable();
    await loadTables(connectedProfileId);
  };

  const handleInsertRow = async (values: Record<string, any>) => {
    const table = targetTableForModal || activeTab?.table;
    if (!table || !connectedProfileId) return;

    const sql = tauriBridge.generateInsertRowSql(engine, table, values);
    await tauriBridge.executeQuery(
      connectedProfileId,
      sql,
      connectedProfile?.database,
      table
    );
    await handleRefreshActiveTable();
  };

  const handleDeleteRow = async (row: Record<string, any>) => {
    const table = activeTab?.table;
    if (!table || !connectedProfileId) return;

    const pkCol =
      activeTab?.columns?.find((c) => c.is_primary_key)?.name ||
      Object.keys(row)[0];
    const pkVal = row[pkCol];

    if (pkVal === undefined || pkVal === null) {
      alert(`Cannot delete row: no valid identifier found for column "${pkCol}"`);
      return;
    }

    if (!confirm(`Are you sure you want to delete this row where ${pkCol} = ${pkVal}?`)) {
      return;
    }

    try {
      const sql = tauriBridge.generateDeleteRowSql(engine, table, pkCol, pkVal);
      await tauriBridge.executeQuery(
        connectedProfileId,
        sql,
        connectedProfile?.database,
        table
      );
      await handleRefreshActiveTable();
    } catch (err: any) {
      alert(`Failed to delete row: ${err.message || err}`);
    }
  };

  const handleUpdateCell = async (
    row: Record<string, any>,
    colName: string,
    newValue: any
  ) => {
    const table = activeTab?.table;
    if (!table || !connectedProfileId) return;

    const pkCol =
      activeTab?.columns?.find((c) => c.is_primary_key)?.name ||
      Object.keys(row)[0];
    const pkVal = row[pkCol];

    if (pkVal === undefined || pkVal === null) {
      alert(`Cannot update cell: no primary key found on column "${pkCol}"`);
      return;
    }

    try {
      const sql = tauriBridge.generateUpdateCellSql(
        engine,
        table,
        pkCol,
        pkVal,
        colName,
        newValue
      );
      await tauriBridge.executeQuery(
        connectedProfileId,
        sql,
        connectedProfile?.database,
        table
      );
      await handleRefreshActiveTable();
    } catch (err: any) {
      alert(`Cell update failed: ${err.message || err}`);
    }
  };

  const handleDropColumnForTable = async (tableName: string, colName: string) => {
    if (!connectedProfileId) return;
    if (
      !confirm(
        `Are you sure you want to drop column "${colName}" from table "${tableName}"?\nThis cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const sql = tauriBridge.generateDropColumnSql(engine, tableName, colName);
      await tauriBridge.executeQuery(
        connectedProfileId,
        sql,
        connectedProfile?.database,
        tableName
      );
      if (activeTab?.table === tableName) {
        await handleRefreshActiveTable();
      }
      await loadTables(connectedProfileId);
    } catch (err: any) {
      alert(`Failed to drop column: ${err.message || err}`);
    }
  };

  const handleDropIndexForTable = async (tableName: string, indexName: string) => {
    if (!connectedProfileId) return;
    if (!confirm(`Are you sure you want to drop index "${indexName}" from table "${tableName}"?`)) {
      return;
    }

    try {
      const sql = tauriBridge.generateDropIndexSql(engine, tableName, indexName);
      await tauriBridge.executeQuery(
        connectedProfileId,
        sql,
        connectedProfile?.database,
        tableName
      );
      if (activeTab?.table === tableName) {
        await handleRefreshActiveTable();
      }
    } catch (err: any) {
      alert(`Failed to drop index: ${err.message || err}`);
    }
  };

  const handleDropColumn = async (colName: string) => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab?.table || !connectedProfileId) return;

    if (
      !confirm(
        `Are you sure you want to drop column "${colName}" from table "${tab.table}"?\nThis cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const sql = tauriBridge.generateDropColumnSql(engine, tab.table, colName);
      await tauriBridge.executeQuery(
        connectedProfileId,
        sql,
        connectedProfile?.database,
        tab.table
      );
      await handleRefreshActiveTable();
      await loadTables(connectedProfileId);
    } catch (err: any) {
      alert(`Failed to drop column: ${err.message || err}`);
    }
  };

  const handleDropIndex = async (indexName: string) => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab?.table || !connectedProfileId) return;

    if (
      !confirm(
        `Are you sure you want to drop index "${indexName}" from table "${tab.table}"?`
      )
    ) {
      return;
    }

    try {
      const sql = tauriBridge.generateDropIndexSql(engine, tab.table, indexName);
      await tauriBridge.executeQuery(
        connectedProfileId,
        sql,
        connectedProfile?.database,
        tab.table
      );
      await handleRefreshActiveTable();
    } catch (err: any) {
      alert(`Failed to drop index: ${err.message || err}`);
    }
  };

  const handleTruncateTable = async (tableName: string) => {
    if (!connectedProfileId) return;
    if (
      !confirm(
        `WARNING: Are you sure you want to TRUNCATE table "${tableName}"?\nAll rows will be permanently deleted.`
      )
    ) {
      return;
    }

    try {
      const sql = tauriBridge.generateTruncateTableSql(engine, tableName);
      await tauriBridge.executeQuery(connectedProfileId, sql, connectedProfile?.database, tableName);
      await loadTables(connectedProfileId);
      if (activeTab?.table === tableName) {
        await handleRefreshActiveTable();
      }
    } catch (err: any) {
      alert(`Failed to truncate table: ${err.message || err}`);
    }
  };

  const handleDropTable = async (tableName: string) => {
    if (!connectedProfileId) return;
    if (
      !confirm(
        `DANGER: Are you sure you want to DROP table "${tableName}"?\nAll schema structure and data will be permanently destroyed.`
      )
    ) {
      return;
    }

    try {
      const sql = tauriBridge.generateDropTableSql(engine, tableName);
      await tauriBridge.executeQuery(connectedProfileId, sql, connectedProfile?.database, tableName);
      // Close tabs related to dropped table
      const remainingTabs = tabs.filter((t) => !(t.type === 'table' && t.table === tableName));
      if (remainingTabs.length > 0) {
        setTabs(remainingTabs);
        setActiveTabId(remainingTabs[0].id);
      } else {
        handleNewQueryTab();
      }
      await loadTables(connectedProfileId);
    } catch (err: any) {
      alert(`Failed to drop table: ${err.message || err}`);
    }
  };

  const handleCreateTableFromDesigner = async (newTableName: string) => {
    if (!connectedProfileId) return;
    await loadTables(connectedProfileId);
    await handleSelectTable(newTableName, 'structure');
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
      {/* Top Application Bar */}
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

          {/* Quick Action Menus like DBeaver */}
          {connectedProfile && (
            <div className="flex items-center space-x-1 pl-2">
              <button
                onClick={() => setIsDesignerOpen(true)}
                title="Create New Table"
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-md text-xs font-medium border border-slate-800 flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>New Table</span>
              </button>

              <button
                onClick={() => handleNewQueryTab()}
                title="Open New SQL Console"
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-md text-xs font-medium border border-slate-800 flex items-center space-x-1.5 transition cursor-pointer"
              >
                <FileCode className="w-3 h-3 text-indigo-400" />
                <span>SQL Console</span>
              </button>

              <button
                onClick={() => loadTables(connectedProfile.id)}
                title="Refresh All Tables"
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md border border-slate-800 transition cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loadingTables ? 'animate-spin text-indigo-400' : ''}`} />
              </button>

              {/* Direct active table action buttons in top toolbar */}
              {activeTab?.type === 'table' && activeTab?.table && (
                <div className="flex items-center space-x-1 pl-2 ml-1 border-l border-slate-800">
                  <span className="px-2 py-0.5 bg-slate-900 text-slate-400 font-mono text-[11px] rounded border border-slate-800 truncate max-w-32">
                    {activeTab.table}
                  </span>

                  <button
                    onClick={() => {
                      setTargetTableForModal(activeTab.table || '');
                      setIsAddColumnOpen(true);
                    }}
                    title={`Add Column to ${activeTab.table}`}
                    className="px-2 py-1 bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 hover:text-white rounded-md text-xs font-medium border border-indigo-800/60 flex items-center space-x-1 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-indigo-400" />
                    <span>Add Column</span>
                  </button>

                  <button
                    onClick={() => {
                      setTargetTableForModal(activeTab.table || '');
                      setIsAddIndexOpen(true);
                    }}
                    title={`Add Index to ${activeTab.table}`}
                    className="px-2 py-1 bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 hover:text-white rounded-md text-xs font-medium border border-amber-800/60 flex items-center space-x-1 transition cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    <span>Add Index</span>
                  </button>

                  <button
                    onClick={() => {
                      setTargetTableForModal(activeTab.table || '');
                      setIsInsertRowOpen(true);
                    }}
                    title={`Insert Row into ${activeTab.table}`}
                    className="px-2 py-1 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 hover:text-white rounded-md text-xs font-medium border border-emerald-800/60 flex items-center space-x-1 transition cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Insert Row</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span className="flex items-center space-x-1 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>AES-256 Encrypted</span>
          </span>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Connection Profiles */}
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

        {/* Object Explorer: Database & Tables Hierarchy */}
        <ObjectExplorer
          activeProfileName={connectedProfile?.name || activeProfile?.name || null}
          databaseName={connectedProfile?.database || activeProfile?.database || null}
          engine={engine}
          tables={tables}
          loading={loadingTables}
          connectedProfileId={connectedProfileId}
          onSelectTable={handleSelectTable}
          onOpenNewQuery={() => handleNewQueryTab()}
          onRefreshTables={() => connectedProfileId && loadTables(connectedProfileId)}
          onOpenCreateTable={() => setIsDesignerOpen(true)}
          onOpenAddColumnForTable={(tbl) => {
            setTargetTableForModal(tbl);
            setIsAddColumnOpen(true);
          }}
          onOpenAddIndexForTable={(tbl) => {
            setTargetTableForModal(tbl);
            setIsAddIndexOpen(true);
          }}
          onOpenInsertRowForTable={(tbl) => {
            setTargetTableForModal(tbl);
            setIsInsertRowOpen(true);
          }}
          onOpenEditColumnForTable={(tbl, col) => {
            setTargetTableForModal(tbl);
            setEditingColumn(col);
            setIsEditColumnOpen(true);
          }}
          onDropColumnForTable={handleDropColumnForTable}
          onDropIndexForTable={handleDropIndexForTable}
          onTruncateTable={handleTruncateTable}
          onDropTable={handleDropTable}
          onGenerateSql={(sql) => handleNewQueryTab(sql)}
        />

        {/* Central Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          <WorkspaceTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={handleCloseTab}
            onNewQueryTab={() => handleNewQueryTab()}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab?.type === 'query' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <QueryConsole
                  initialQuery={activeTab.query}
                  onExecute={handleExecuteQuery}
                  loading={activeTab.loading || false}
                  result={activeTab.queryResult || null}
                  error={activeTab.error || null}
                  engine={engine}
                />
                <DataGrid
                  result={activeTab?.queryResult || null}
                  loading={activeTab?.loading || false}
                  tableName={activeTab?.table}
                />
              </div>
            ) : (
              <TableStructureView
                tableName={activeTab?.table || ''}
                engine={engine}
                subView={activeTab?.subView || 'data'}
                onChangeSubView={handleChangeSubView}
                result={activeTab?.queryResult || null}
                columns={activeTab?.columns || []}
                indexes={activeTab?.indexes || []}
                ddl={activeTab?.ddl || ''}
                loading={activeTab?.loading || false}
                onRefresh={handleRefreshActiveTable}
                onOpenAddColumn={() => {
                  setTargetTableForModal(activeTab?.table || '');
                  setIsAddColumnOpen(true);
                }}
                onOpenEditColumn={handleOpenEditColumn}
                onOpenAddIndex={() => {
                  setTargetTableForModal(activeTab?.table || '');
                  setIsAddIndexOpen(true);
                }}
                onOpenInsertRow={() => {
                  setTargetTableForModal(activeTab?.table || '');
                  setIsInsertRowOpen(true);
                }}
                onDeleteRow={handleDeleteRow}
                onUpdateCell={handleUpdateCell}
                onDropColumn={handleDropColumn}
                onDropIndex={handleDropIndex}
                onOpenInSqlEditor={(sql) => handleNewQueryTab(sql)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <ConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProfile}
        initialConfig={editingProfile}
      />

      <TableDesignerModal
        isOpen={isDesignerOpen}
        engine={engine}
        databaseName={connectedProfile?.database}
        onClose={() => setIsDesignerOpen(false)}
        onCreateSuccess={handleCreateTableFromDesigner}
      />

      <AddColumnModal
        isOpen={isAddColumnOpen}
        tableName={targetTableForModal}
        engine={engine}
        onClose={() => setIsAddColumnOpen(false)}
        onAdd={handleAddColumnToTable}
      />

      <EditColumnModal
        isOpen={isEditColumnOpen}
        tableName={targetTableForModal}
        engine={engine}
        column={editingColumn}
        onClose={() => {
          setIsEditColumnOpen(false);
          setEditingColumn(null);
        }}
        onSave={handleEditColumn}
      />

      <AddIndexModal
        isOpen={isAddIndexOpen}
        tableName={targetTableForModal}
        columns={activeTab?.columns || []}
        onClose={() => setIsAddIndexOpen(false)}
        onAdd={handleAddIndexToTable}
      />

      <InsertRowModal
        isOpen={isInsertRowOpen}
        tableName={targetTableForModal}
        columns={activeTab?.columns || []}
        engine={engine}
        onClose={() => setIsInsertRowOpen(false)}
        onInsert={handleInsertRow}
      />
    </div>
  );
}
