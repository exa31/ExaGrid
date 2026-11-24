import type {
  ColumnDefinition,
  ColumnMeta,
  ConnectionConfig,
  DatabaseEngine,
  IndexDefinition,
  IndexMeta,
  PingResult,
  QueryResult,
  StoredProfile,
  TableDdl,
  TableMeta,
  TableSchemaSpec,
} from '../types/database';

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

    case 'get_table_indexes': {
      const idxs: IndexMeta[] = [
        {
          name: 'PRIMARY',
          columns: ['id'],
          is_unique: true,
          is_primary: true,
          index_type: 'BTREE',
        },
        {
          name: 'idx_users_email',
          columns: ['email'],
          is_unique: true,
          is_primary: false,
          index_type: 'BTREE',
        },
      ];
      return idxs as T;
    }

    case 'get_table_ddl': {
      const ddl = `CREATE TABLE \`${args.table || 'example'}\` (
  \`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
  \`name\` varchar(255) NOT NULL,
  \`email\` varchar(255) NOT NULL,
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_email\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      return { table: args.table || 'example', ddl } as T;
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

  getTableIndexes: (connectionId: string, table: string) =>
    callTauri<IndexMeta[]>('get_table_indexes', { connectionId, table }),

  getTableDdl: (connectionId: string, table: string) =>
    callTauri<TableDdl>('get_table_ddl', { connectionId, table }),

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

  // === DDL & SQL Generation Helpers ===
  generateCreateTableSql: (engine: DatabaseEngine, spec: TableSchemaSpec): string => {
    const q = engine === 'mysql' ? '`' : '"';
    const cols = spec.columns.map((c) => {
      let typeStr = c.data_type.toUpperCase();
      if (c.length_or_precision) {
        typeStr = `${typeStr}(${c.length_or_precision})`;
      }

      // Auto increment syntax per engine
      let aiStr = '';
      if (c.auto_increment) {
        if (engine === 'mysql') {
          aiStr = ' AUTO_INCREMENT';
        } else if (engine === 'sqlite') {
          aiStr = ' AUTOINCREMENT';
        } else if (engine === 'postgres') {
          // In Postgres, SERIAL replaces INT
          if (typeStr.startsWith('INT') || typeStr.startsWith('BIGINT')) {
            typeStr = typeStr.startsWith('BIGINT') ? 'BIGSERIAL' : 'SERIAL';
          }
        }
      }

      const nullStr = c.nullable ? '' : ' NOT NULL';
      const defStr = c.default_value ? ` DEFAULT ${c.default_value}` : '';
      const pkStr = c.is_primary_key && engine === 'sqlite' ? ' PRIMARY KEY' : '';

      return `  ${q}${c.name}${q} ${typeStr}${nullStr}${defStr}${aiStr}${pkStr}`;
    });

    const pks = spec.columns.filter((c) => c.is_primary_key);
    if (pks.length > 0 && engine !== 'sqlite') {
      const pkCols = pks.map((p) => `${q}${p.name}${q}`).join(', ');
      cols.push(`  PRIMARY KEY (${pkCols})`);
    }

    let sql = `CREATE TABLE ${q}${spec.table_name}${q} (\n${cols.join(',\n')}\n)`;
    if (engine === 'mysql') {
      sql += ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;';
    } else {
      sql += ';';
    }

    if (spec.indexes && spec.indexes.length > 0) {
      const idxSqls = spec.indexes.map((idx) => {
        const u = idx.is_unique ? 'UNIQUE ' : '';
        const idxCols = idx.columns.map((col) => `${q}${col}${q}`).join(', ');
        return `\nCREATE ${u}INDEX ${q}${idx.name}${q} ON ${q}${spec.table_name}${q} (${idxCols});`;
      });
      sql += idxSqls.join('');
    }

    return sql;
  },

  generateAddColumnSql: (engine: DatabaseEngine, table: string, col: ColumnDefinition): string => {
    const q = engine === 'mysql' ? '`' : '"';
    let typeStr = col.data_type.toUpperCase();
    if (col.length_or_precision) {
      typeStr = `${typeStr}(${col.length_or_precision})`;
    }
    const nullStr = col.nullable ? '' : ' NOT NULL';
    const defStr = col.default_value ? ` DEFAULT ${col.default_value}` : '';
    return `ALTER TABLE ${q}${table}${q} ADD COLUMN ${q}${col.name}${q} ${typeStr}${nullStr}${defStr};`;
  },

  generateDropColumnSql: (engine: DatabaseEngine, table: string, column: string): string => {
    const q = engine === 'mysql' ? '`' : '"';
    return `ALTER TABLE ${q}${table}${q} DROP COLUMN ${q}${column}${q};`;
  },

  generateAddIndexSql: (engine: DatabaseEngine, table: string, idx: IndexDefinition): string => {
    const q = engine === 'mysql' ? '`' : '"';
    const u = idx.is_unique ? 'UNIQUE ' : '';
    const idxCols = idx.columns.map((col) => `${q}${col}${q}`).join(', ');
    return `CREATE ${u}INDEX ${q}${idx.name}${q} ON ${q}${table}${q} (${idxCols});`;
  },

  generateDropIndexSql: (engine: DatabaseEngine, table: string, indexName: string): string => {
    const q = engine === 'mysql' ? '`' : '"';
    if (engine === 'mysql') {
      return `ALTER TABLE ${q}${table}${q} DROP INDEX ${q}${indexName}${q};`;
    }
    return `DROP INDEX ${q}${indexName}${q};`;
  },

  generateTruncateTableSql: (engine: DatabaseEngine, table: string): string => {
    const q = engine === 'mysql' ? '`' : '"';
    if (engine === 'sqlite') {
      return `DELETE FROM ${q}${table}${q};`;
    }
    return `TRUNCATE TABLE ${q}${table}${q};`;
  },

  generateDropTableSql: (engine: DatabaseEngine, table: string): string => {
    const q = engine === 'mysql' ? '`' : '"';
    return `DROP TABLE ${q}${table}${q};`;
  },

  generateSelectSnippet: (engine: DatabaseEngine, table: string): string => {
    const q = engine === 'mysql' ? '`' : '"';
    return `SELECT * FROM ${q}${table}${q} LIMIT 100;`;
  },

  generateInsertSnippet: (table: string, columns: ColumnMeta[]): string => {
    const cols = columns.map((c) => c.name).join(', ');
    const vals = columns.map((c) => (c.nullable ? 'NULL' : `'value'`)).join(', ');
    return `INSERT INTO ${table} (${cols}) VALUES (${vals});`;
  },

  generateUpdateSnippet: (table: string, columns: ColumnMeta[]): string => {
    const sets = columns
      .filter((c) => !c.is_primary_key)
      .map((c) => `${c.name} = 'value'`)
      .join(', ');
    const pk = columns.find((c) => c.is_primary_key)?.name || 'id';
    return `UPDATE ${table} SET ${sets} WHERE ${pk} = 1;`;
  },

  generateDeleteSnippet: (table: string, columns: ColumnMeta[]): string => {
    const pk = columns.find((c) => c.is_primary_key)?.name || 'id';
    return `DELETE FROM ${table} WHERE ${pk} = 1;`;
  },
};
