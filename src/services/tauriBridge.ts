import type {
  ColumnMeta,
  ConnectionConfig,
  PingResult,
  QueryResult,
  StoredProfile,
  TableMeta} from '../types/database';

export const isTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function callTauri<T>(cmd: string, args: Record<string, any> = {}): Promise<T> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(cmd, args);
    } catch (err: any) {
      console.error(`[Tauri IPC Error - ${cmd}]:`, err);
      throw new Error(typeof err === 'string' ? err : err?.message || JSON.stringify(err));
    }
  }

  return mockTauriHandler<T>(cmd, args);
}

let mockProfiles: StoredProfile[] = [
  {
    id: 'demo-sqlite-1',
    name: 'Local Demo SQLite (E-Commerce)',
    engine: 'sqlite',
    file_path: 'demo_ecommerce.db',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-pg-1',
    name: 'Production PostgreSQL (Analytics)',
    engine: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    database: 'analytics_db',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-mongo-1',
    name: 'MongoDB Atlas (User Activity)',
    engine: 'mongo',
    host: 'localhost',
    port: 27017,
    database: 'logs',
    created_at: new Date().toISOString(),
  }
];

const mockTables: Record<string, TableMeta[]> = {
  'demo-sqlite-1': [
    { name: 'users', table_type: 'TABLE', row_count: 120 },
    { name: 'orders', table_type: 'TABLE', row_count: 450 },
    { name: 'products', table_type: 'TABLE', row_count: 85 },
    { name: 'v_top_selling', table_type: 'VIEW', row_count: 10 },
  ],
  'demo-pg-1': [
    { name: 'page_views', schema: 'public', table_type: 'BASE TABLE', row_count: 15420 },
    { name: 'events', schema: 'public', table_type: 'BASE TABLE', row_count: 8900 },
    { name: 'sessions', schema: 'public', table_type: 'BASE TABLE', row_count: 3400 },
  ],
  'demo-mongo-1': [
    { name: 'audit_logs', table_type: 'COLLECTION', row_count: 520 },
    { name: 'system_metrics', table_type: 'COLLECTION', row_count: 1200 },
  ]
};

const mockColumns: Record<string, ColumnMeta[]> = {
  users: [
    { name: 'id', data_type: 'INTEGER', nullable: false, is_primary_key: true },
    { name: 'name', data_type: 'VARCHAR(100)', nullable: false, is_primary_key: false },
    { name: 'email', data_type: 'VARCHAR(150)', nullable: false, is_primary_key: false },
    { name: 'role', data_type: 'VARCHAR(50)', nullable: true, is_primary_key: false },
    { name: 'metadata', data_type: 'JSON', nullable: true, is_primary_key: false },
    { name: 'created_at', data_type: 'DATETIME', nullable: false, is_primary_key: false },
  ],
  orders: [
    { name: 'id', data_type: 'INTEGER', nullable: false, is_primary_key: true },
    { name: 'user_id', data_type: 'INTEGER', nullable: false, is_primary_key: false },
    { name: 'total_amount', data_type: 'DECIMAL(10,2)', nullable: false, is_primary_key: false },
    { name: 'status', data_type: 'VARCHAR(20)', nullable: false, is_primary_key: false },
    { name: 'created_at', data_type: 'DATETIME', nullable: false, is_primary_key: false },
  ]
};

async function mockTauriHandler<T>(cmd: string, args: Record<string, any>): Promise<T> {
  await new Promise((r) => setTimeout(r, 60));

  switch (cmd) {
    case 'test_connection':
      return {
        success: true,
        message: `Successfully connected to ${args.config?.engine?.toUpperCase()} server`,
        latency_ms: Math.floor(Math.random() * 20) + 4,
        server_version: `${args.config?.engine?.toUpperCase()} v16.2-native`,
      } as T;

    case 'list_connections':
      return [...mockProfiles] as T;

    case 'save_connection': {
      const cfg = args.config as ConnectionConfig;
      const newProf: StoredProfile = {
        id: cfg.id || `prof-${  Date.now()}`,
        name: cfg.name,
        engine: cfg.engine,
        host: cfg.host,
        port: cfg.port,
        username: cfg.username,
        database: cfg.database,
        file_path: cfg.file_path,
        created_at: new Date().toISOString(),
      };
      const idx = mockProfiles.findIndex((p) => p.id === newProf.id);
      if (idx >= 0) mockProfiles[idx] = newProf;
      else mockProfiles.push(newProf);
      return newProf as T;
    }

    case 'delete_connection':
      mockProfiles = mockProfiles.filter((p) => p.id !== args.id);
      return undefined as T;

    case 'connect_database':
      return {
        success: true,
        message: 'Connected to database',
        latency_ms: 12,
        server_version: 'ExaGrid Engine v0.1.0',
      } as T;

    case 'disconnect_database':
      return undefined as T;

    case 'list_tables':
      return (mockTables[args.connectionId] || [
        { name: 'users', table_type: 'TABLE', row_count: 50 },
        { name: 'settings', table_type: 'TABLE', row_count: 12 },
      ]) as T;

    case 'get_table_columns':
      return (mockColumns[args.table] || [
        { name: 'id', data_type: 'INTEGER', nullable: false, is_primary_key: true },
        { name: 'name', data_type: 'TEXT', nullable: false, is_primary_key: false },
        { name: 'value', data_type: 'TEXT', nullable: true, is_primary_key: false },
      ]) as T;

    case 'execute_query': {
      const cols: ColumnMeta[] = [
        { name: 'id', data_type: 'INTEGER', nullable: false, is_primary_key: true },
        { name: 'name', data_type: 'TEXT', nullable: false, is_primary_key: false },
        { name: 'email', data_type: 'TEXT', nullable: false, is_primary_key: false },
        { name: 'role', data_type: 'TEXT', nullable: false, is_primary_key: false },
        { name: 'preferences', data_type: 'JSON', nullable: true, is_primary_key: false },
        { name: 'active', data_type: 'BOOLEAN', nullable: false, is_primary_key: false },
      ];

      const sampleRows = Array.from({ length: 45 }).map((_, i) => ({
        id: i + 1,
        name: `${['Alex River', 'Sarah Connor', 'Bruce Wayne', 'Diana Prince', 'Arthur Dent'][i % 5]  } #${i + 1}`,
        email: `user${i + 1}@example.com`,
        role: ['admin', 'developer', 'analyst', 'manager'][i % 4],
        preferences: { theme: i % 2 === 0 ? 'dark' : 'light', notifications: true, lang: 'id-ID' },
        active: i % 3 !== 0,
      }));

      return {
        columns: cols,
        rows: sampleRows,
        execution_time_ms: 14,
        affected_rows: 0,
        total_rows: sampleRows.length,
      } as T;
    }

    case 'export_data': {
      const blob = new Blob([JSON.stringify(args.rows, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exagrid_export_${Date.now()}.${args.format}`;
      a.click();
      return 'Export triggered' as T;
    }

    default:
      throw new Error(`Unknown mock command: ${cmd}`);
  }
}

export const tauriBridge = {
  testConnection: (config: ConnectionConfig) =>
    callTauri<PingResult>('test_connection', { config }),

  saveConnection: (config: ConnectionConfig) =>
    callTauri<StoredProfile>('save_connection', { config }),

  listConnections: () =>
    callTauri<StoredProfile[]>('list_connections'),

  deleteConnection: (id: string) =>
    callTauri<void>('delete_connection', { id }),

  connectDatabase: (id: string) =>
    callTauri<PingResult>('connect_database', { id }),

  disconnectDatabase: (id: string) =>
    callTauri<void>('disconnect_database', { id }),

  listTables: (connectionId: string, database?: string) =>
    callTauri<TableMeta[]>('list_tables', { connectionId, database }),

  getTableColumns: (connectionId: string, table: string) =>
    callTauri<ColumnMeta[]>('get_table_columns', { connectionId, table }),

  executeQuery: (
    connectionId: string,
    query: string,
    database?: string,
    collection?: string,
    limit?: number
  ) =>
    callTauri<QueryResult>('execute_query', {
      connectionId,
      query,
      database,
      collection,
      limit,
    }),

  exportData: (rows: Record<string, any>[], format: 'csv' | 'json', filePath: string) =>
    callTauri<string>('export_data', { rows, format, filePath }),
};
