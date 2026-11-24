import type {
  ColumnDefinition,
  ColumnMeta,
  ConnectionConfig,
  DatabaseEngine,
  ForeignKeyDefinition,
  ForeignKeyMeta,
  IndexDefinition,
  IndexMeta,
  MaintenanceOperation,
  MaintenanceResult,
  PingResult,
  ProcessInfo,
  QueryResult,
  ServerVariable,
  StoredProfile,
  TableDdl,
  TableMeta,
  TableSchemaSpec,
  TableStatsMeta,
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

  generateEditColumnSql: (
    engine: DatabaseEngine,
    table: string,
    oldName: string,
    col: ColumnDefinition
  ): string => {
    const q = engine === 'mysql' ? '`' : '"';
    let typeStr = col.data_type.toUpperCase();
    if (col.length_or_precision) {
      typeStr = `${typeStr}(${col.length_or_precision})`;
    }
    const nullStr = col.nullable ? ' NULL' : ' NOT NULL';
    const defStr = col.default_value ? ` DEFAULT ${col.default_value}` : '';

    if (engine === 'mysql') {
      return `ALTER TABLE ${q}${table}${q} CHANGE COLUMN ${q}${oldName}${q} ${q}${col.name}${q} ${typeStr}${nullStr}${defStr};`;
    }

    if (engine === 'postgres') {
      const statements: string[] = [];
      if (oldName !== col.name) {
        statements.push(`ALTER TABLE ${q}${table}${q} RENAME COLUMN ${q}${oldName}${q} TO ${q}${col.name}${q};`);
      }
      statements.push(`ALTER TABLE ${q}${table}${q} ALTER COLUMN ${q}${col.name}${q} TYPE ${typeStr};`);
      if (col.nullable) {
        statements.push(`ALTER TABLE ${q}${table}${q} ALTER COLUMN ${q}${col.name}${q} DROP NOT NULL;`);
      } else {
        statements.push(`ALTER TABLE ${q}${table}${q} ALTER COLUMN ${q}${col.name}${q} SET NOT NULL;`);
      }
      if (col.default_value) {
        statements.push(`ALTER TABLE ${q}${table}${q} ALTER COLUMN ${q}${col.name}${q} SET DEFAULT ${col.default_value};`);
      }
      return statements.join('\n');
    }

    // SQLite
    if (oldName !== col.name) {
      return `ALTER TABLE ${q}${table}${q} RENAME COLUMN ${q}${oldName}${q} TO ${q}${col.name}${q};`;
    }
    return `-- SQLite: In-place column alteration is not natively supported without recreation.`;
  },

  generateDropColumnSql: (engine: DatabaseEngine, table: string, column: string): string => {
    const q = engine === 'mysql' ? '`' : '"';
    return `ALTER TABLE ${q}${table}${q} DROP COLUMN ${q}${column}${q};`;
  },

  generateInsertRowSql: (
    engine: DatabaseEngine,
    table: string,
    values: Record<string, any>
  ): string => {
    const q = engine === 'mysql' ? '`' : '"';
    const colNames = Object.keys(values).filter((k) => values[k] !== undefined && values[k] !== '');
    if (colNames.length === 0) {
      return `INSERT INTO ${q}${table}${q} DEFAULT VALUES;`;
    }

    const colsStr = colNames.map((c) => `${q}${c}${q}`).join(', ');
    const valsStr = colNames
      .map((c) => {
        const val = values[c];
        if (val === null || val === 'NULL' || val === undefined) return 'NULL';
        if (typeof val === 'number' || typeof val === 'boolean') return String(val);
        const escaped = String(val).replace(/'/g, "''");
        return `'${escaped}'`;
      })
      .join(', ');

    return `INSERT INTO ${q}${table}${q} (${colsStr}) VALUES (${valsStr});`;
  },

  generateDeleteRowSql: (
    engine: DatabaseEngine,
    table: string,
    pkCol: string,
    pkVal: any
  ): string => {
    const q = engine === 'mysql' ? '`' : '"';
    const valStr =
      typeof pkVal === 'number'
        ? String(pkVal)
        : `'${String(pkVal).replace(/'/g, "''")}'`;
    return `DELETE FROM ${q}${table}${q} WHERE ${q}${pkCol}${q} = ${valStr};`;
  },

  generateUpdateCellSql: (
    engine: DatabaseEngine,
    table: string,
    pkCol: string,
    pkVal: any,
    targetCol: string,
    newVal: any
  ): string => {
    const q = engine === 'mysql' ? '`' : '"';
    const pkStr =
      typeof pkVal === 'number'
        ? String(pkVal)
        : `'${String(pkVal).replace(/'/g, "''")}'`;

    let valStr = 'NULL';
    if (newVal !== null && newVal !== undefined) {
      if (typeof newVal === 'number' || typeof newVal === 'boolean') {
        valStr = String(newVal);
      } else {
        valStr = `'${String(newVal).replace(/'/g, "''")}'`;
      }
    }

    return `UPDATE ${q}${table}${q} SET ${q}${targetCol}${q} = ${valStr} WHERE ${q}${pkCol}${q} = ${pkStr};`;
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

  getTableForeignKeys: async (
    connectionId: string,
    table: string,
    engine: DatabaseEngine,
    database?: string
  ): Promise<ForeignKeyMeta[]> => {
    try {
      if (engine === 'mysql') {
        const sql = `SELECT 
          CONSTRAINT_NAME as constraint_name, 
          COLUMN_NAME as column_name, 
          REFERENCED_TABLE_NAME as foreign_table, 
          REFERENCED_COLUMN_NAME as foreign_column 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_NAME = '${table}' 
          ${database ? `AND TABLE_SCHEMA = '${database}'` : 'AND TABLE_SCHEMA = DATABASE()'} 
          AND REFERENCED_TABLE_NAME IS NOT NULL;`;
        const res = await tauriBridge.executeQuery(connectionId, sql, database, table);
        return res.rows.map((r: any) => ({
          constraint_name: String(r.constraint_name || r.CONSTRAINT_NAME || ''),
          column_name: String(r.column_name || r.COLUMN_NAME || ''),
          foreign_table: String(r.foreign_table || r.REFERENCED_TABLE_NAME || ''),
          foreign_column: String(r.foreign_column || r.REFERENCED_COLUMN_NAME || ''),
          on_delete: 'RESTRICT',
          on_update: 'RESTRICT',
        }));
      }

      if (engine === 'postgres') {
        const sql = `SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table,
          ccu.column_name AS foreign_column,
          rc.delete_rule AS on_delete,
          rc.update_rule AS on_update
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        LEFT JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = '${table}';`;
        const res = await tauriBridge.executeQuery(connectionId, sql, database, table);
        return res.rows.map((r: any) => ({
          constraint_name: String(r.constraint_name || ''),
          column_name: String(r.column_name || ''),
          foreign_table: String(r.foreign_table || ''),
          foreign_column: String(r.foreign_column || ''),
          on_delete: r.on_delete || 'NO ACTION',
          on_update: r.on_update || 'NO ACTION',
        }));
      }

      if (engine === 'sqlite') {
        const sql = `PRAGMA foreign_key_list('${table}');`;
        const res = await tauriBridge.executeQuery(connectionId, sql);
        return res.rows.map((r: any, idx: number) => ({
          constraint_name: `fk_${table}_${r.from || idx}`,
          column_name: String(r.from || ''),
          foreign_table: String(r.table || ''),
          foreign_column: String(r.to || ''),
          on_delete: r.on_delete || 'NO ACTION',
          on_update: r.on_update || 'NO ACTION',
        }));
      }

      return [];
    } catch (_err) {
      return [];
    }
  },

  generateAddForeignKeySql: (engine: DatabaseEngine, table: string, fk: ForeignKeyDefinition): string => {
    const q = engine === 'mysql' ? '`' : '"';
    const delRule = fk.on_delete ? ` ON DELETE ${fk.on_delete}` : '';
    const updRule = fk.on_update ? ` ON UPDATE ${fk.on_update}` : '';
    return `ALTER TABLE ${q}${table}${q} ADD CONSTRAINT ${q}${fk.name}${q} FOREIGN KEY (${q}${fk.column}${q}) REFERENCES ${q}${fk.foreign_table}${q} (${q}${fk.foreign_column}${q})${delRule}${updRule};`;
  },

  generateDropForeignKeySql: (engine: DatabaseEngine, table: string, constraintName: string): string => {
    const q = engine === 'mysql' ? '`' : '"';
    if (engine === 'mysql') {
      return `ALTER TABLE ${q}${table}${q} DROP FOREIGN KEY ${q}${constraintName}${q};`;
    }
    return `ALTER TABLE ${q}${table}${q} DROP CONSTRAINT ${q}${constraintName}${q};`;
  },

  getServerProcessList: async (
    connectionId: string,
    engine: DatabaseEngine,
    database?: string
  ): Promise<ProcessInfo[]> => {
    if (engine === 'mysql') {
      const res = await tauriBridge.executeQuery(connectionId, 'SHOW FULL PROCESSLIST;', database);
      return res.rows.map((r: any) => ({
        id: r.Id ?? r.id ?? 0,
        user: String(r.User ?? r.user ?? ''),
        host: String(r.Host ?? r.host ?? ''),
        db: r.db ? String(r.db) : undefined,
        command: String(r.Command ?? r.command ?? ''),
        time: Number(r.Time ?? r.time ?? 0),
        state: r.State ? String(r.State) : undefined,
        info: r.Info ? String(r.Info) : undefined,
      }));
    }

    if (engine === 'postgres') {
      const sql = `SELECT pid as id, usename as user, client_addr as host, datname as db, state as command, round(extract(epoch from now() - query_start)) as time, state, query as info FROM pg_stat_activity WHERE state IS NOT NULL ORDER BY time DESC;`;
      const res = await tauriBridge.executeQuery(connectionId, sql, database);
      return res.rows.map((r: any) => ({
        id: r.id ?? 0,
        user: String(r.user ?? ''),
        host: String(r.host ?? ''),
        db: r.db ? String(r.db) : undefined,
        command: String(r.command ?? ''),
        time: Number(r.time ?? 0),
        state: r.state ? String(r.state) : undefined,
        info: r.info ? String(r.info) : undefined,
      }));
    }

    return [];
  },

  killProcess: async (connectionId: string, engine: DatabaseEngine, processId: number | string): Promise<void> => {
    const sql = engine === 'mysql' ? `KILL ${processId};` : `SELECT pg_terminate_backend(${processId});`;
    await tauriBridge.executeQuery(connectionId, sql);
  },

  explainQuery: async (connectionId: string, query: string, database?: string): Promise<QueryResult> => {
    const clean = query.trim().replace(/;+$/, '');
    const sql = `EXPLAIN ${clean};`;
    return tauriBridge.executeQuery(connectionId, sql, database);
  },

  generateSqlDump: (
    engine: DatabaseEngine,
    table: string,
    ddl: string,
    columns: ColumnMeta[],
    rows: Record<string, any>[]
  ): string => {
    const q = engine === 'mysql' ? '`' : '"';
    const timestamp = new Date().toISOString();
    let out = `-- --------------------------------------------------------\n`;
    out += `-- ExaGrid SQL Dump v0.1.7\n`;
    out += `-- Table: ${table}\n`;
    out += `-- Export Date: ${timestamp}\n`;
    out += `-- Total Records: ${rows.length}\n`;
    out += `-- --------------------------------------------------------\n\n`;

    out += `DROP TABLE IF EXISTS ${q}${table}${q};\n\n`;
    out += `${ddl.trim()};\n\n`;

    if (rows.length > 0) {
      out += `-- Dumping data for table ${q}${table}${q}\n`;
      const colNames = columns.map((c) => c.name);
      const colsHeader = colNames.map((c) => `${q}${c}${q}`).join(', ');

      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const valuesList = chunk.map((r) => {
          const vals = colNames.map((col) => {
            const val = r[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return String(val);
            if (typeof val === 'boolean') return val ? '1' : '0';
            const esc = String(val).replace(/'/g, "''");
            return `'${esc}'`;
          });
          return `(${vals.join(', ')})`;
        });

        out += `INSERT INTO ${q}${table}${q} (${colsHeader}) VALUES\n  ${valuesList.join(',\n  ')};\n\n`;
      }
    }

    return out;
  },

  getTableStats: async (
    connectionId: string,
    table: string,
    engine: DatabaseEngine,
    database?: string
  ): Promise<TableStatsMeta | null> => {
    try {
      if (engine === 'mysql') {
        const sql = `SHOW TABLE STATUS LIKE '${table}';`;
        const res = await tauriBridge.executeQuery(connectionId, sql, database, table);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          const dataLen = Number(row.Data_length ?? row.data_length ?? 0);
          const idxLen = Number(row.Index_length ?? row.index_length ?? 0);
          return {
            table_name: table,
            engine: String(row.Engine ?? row.engine ?? 'InnoDB'),
            row_count: Number(row.Rows ?? row.rows ?? 0),
            data_size_bytes: dataLen,
            index_size_bytes: idxLen,
            total_size_bytes: dataLen + idxLen,
            avg_row_length: Number(row.Avg_row_length ?? row.avg_row_length ?? 0),
            auto_increment: row.Auto_increment ?? row.auto_increment,
            collation: String(row.Collation ?? row.collation ?? 'utf8mb4_unicode_ci'),
            create_time: row.Create_time ? String(row.Create_time) : undefined,
            update_time: row.Update_time ? String(row.Update_time) : undefined,
          };
        }
      }

      if (engine === 'postgres') {
        const sql = `SELECT 
          pg_total_relation_size(quote_ident('${table}')) as total_size,
          pg_relation_size(quote_ident('${table}')) as data_size,
          pg_indexes_size(quote_ident('${table}')) as index_size,
          reltuples::bigint as row_count
        FROM pg_class
        WHERE relname = '${table}';`;
        const res = await tauriBridge.executeQuery(connectionId, sql, database, table);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          const dataLen = Number(row.data_size || 0);
          const idxLen = Number(row.index_size || 0);
          const totalLen = Number(row.total_size || 0);
          return {
            table_name: table,
            engine: 'PostgreSQL Relational',
            row_count: Number(row.row_count || 0),
            data_size_bytes: dataLen,
            index_size_bytes: idxLen,
            total_size_bytes: totalLen,
          };
        }
      }

      if (engine === 'sqlite') {
        const sql = `SELECT count(*) as row_count FROM '${table}';`;
        const res = await tauriBridge.executeQuery(connectionId, sql);
        return {
          table_name: table,
          engine: 'SQLite B-Tree',
          row_count: Number(res.rows[0]?.row_count || 0),
        };
      }

      return null;
    } catch (_err) {
      return null;
    }
  },

  getServerVariables: async (
    connectionId: string,
    engine: DatabaseEngine,
    database?: string
  ): Promise<ServerVariable[]> => {
    try {
      if (engine === 'mysql') {
        const res = await tauriBridge.executeQuery(connectionId, 'SHOW VARIABLES;', database);
        return res.rows.map((r: any) => ({
          variable_name: String(r.Variable_name ?? r.variable_name ?? ''),
          value: String(r.Value ?? r.value ?? ''),
        }));
      }

      if (engine === 'postgres') {
        const res = await tauriBridge.executeQuery(connectionId, 'SHOW ALL;', database);
        return res.rows.map((r: any) => ({
          variable_name: String(r.name ?? ''),
          value: String(r.setting ?? ''),
        }));
      }

      return [];
    } catch (_err) {
      return [];
    }
  },

  generateCloneTableSql: (
    engine: DatabaseEngine,
    sourceTable: string,
    targetTable: string,
    withData: boolean
  ): string => {
    const q = engine === 'mysql' ? '`' : '"';
    if (engine === 'mysql') {
      let sql = `CREATE TABLE ${q}${targetTable}${q} LIKE ${q}${sourceTable}${q};\n`;
      if (withData) {
        sql += `INSERT INTO ${q}${targetTable}${q} SELECT * FROM ${q}${sourceTable}${q};`;
      }
      return sql;
    }

    if (engine === 'postgres') {
      let sql = `CREATE TABLE ${q}${targetTable}${q} (LIKE ${q}${sourceTable}${q} INCLUDING ALL);\n`;
      if (withData) {
        sql += `INSERT INTO ${q}${targetTable}${q} SELECT * FROM ${q}${sourceTable}${q};`;
      }
      return sql;
    }

    // SQLite
    return `CREATE TABLE ${q}${targetTable}${q} AS SELECT * FROM ${q}${sourceTable}${q}${withData ? '' : ' WHERE 0'};`;
  },

  batchInsertRows: async (
    connectionId: string,
    engine: DatabaseEngine,
    table: string,
    columns: string[],
    rows: Record<string, any>[],
    database?: string
  ): Promise<number> => {
    const q = engine === 'mysql' ? '`' : '"';
    const colsHeader = columns.map((c) => `${q}${c}${q}`).join(', ');
    const chunkSize = 25;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const valuesList = chunk.map((r) => {
        const vals = columns.map((col) => {
          const val = r[col];
          if (val === null || val === undefined || val === '') return 'NULL';
          if (typeof val === 'number') return String(val);
          if (typeof val === 'boolean') return val ? '1' : '0';
          const esc = String(val).replace(/'/g, "''");
          return `'${esc}'`;
        });
        return `(${vals.join(', ')})`;
      });

      const sql = `INSERT INTO ${q}${table}${q} (${colsHeader}) VALUES\n  ${valuesList.join(',\n  ')};`;
      await tauriBridge.executeQuery(connectionId, sql, database, table);
      inserted += chunk.length;
    }

    return inserted;
  },

  listDatabases: async (connectionId: string, engine: DatabaseEngine): Promise<string[]> => {
    if (engine === 'sqlite') return ['main'];
    if (engine === 'postgres') {
      const res = await tauriBridge.executeQuery(
        connectionId,
        'SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;'
      );
      return res.rows.map((r) => r.datname || r.DATNAME).filter(Boolean);
    }
    // mysql
    const res = await tauriBridge.executeQuery(connectionId, 'SHOW DATABASES;');
    return res.rows
      .map((r) => r.Database || r.database || Object.values(r)[0])
      .filter(Boolean) as string[];
  },

  createDatabase: async (
    connectionId: string,
    engine: DatabaseEngine,
    name: string,
    charset = 'utf8mb4',
    collation = 'utf8mb4_unicode_ci'
  ): Promise<void> => {
    if (engine === 'mysql') {
      await tauriBridge.executeQuery(
        connectionId,
        `CREATE DATABASE \`${name}\` CHARACTER SET ${charset} COLLATE ${collation};`
      );
    } else if (engine === 'postgres') {
      await tauriBridge.executeQuery(connectionId, `CREATE DATABASE "${name}";`);
    } else {
      throw new Error('Creating separate database schemas is not supported on SQLite.');
    }
  },

  dropDatabase: async (connectionId: string, engine: DatabaseEngine, name: string): Promise<void> => {
    if (engine === 'mysql') {
      await tauriBridge.executeQuery(connectionId, `DROP DATABASE \`${name}\`;`);
    } else if (engine === 'postgres') {
      await tauriBridge.executeQuery(connectionId, `DROP DATABASE "${name}";`);
    } else {
      throw new Error('Dropping database is not supported on SQLite.');
    }
  },

  executeMaintenance: async (
    connectionId: string,
    engine: DatabaseEngine,
    table: string,
    op: MaintenanceOperation,
    database?: string
  ): Promise<MaintenanceResult[]> => {
    if (engine === 'mysql') {
      const q = `\`${table}\``;
      const res = await tauriBridge.executeQuery(connectionId, `${op} TABLE ${q};`, database, table);
      return res.rows.map((r) => ({
        table: r.Table || r.table || table,
        operation: r.Op || r.op || op,
        msg_type: r.Msg_type || r.msg_type || 'status',
        msg_text: r.Msg_text || r.msg_text || 'OK',
      }));
    }
    if (engine === 'postgres') {
      const sql = op === 'CHECK' ? `SELECT count(*) FROM "${table}";` : `VACUUM (ANALYZE) "${table}";`;
      await tauriBridge.executeQuery(connectionId, sql, database, table);
      return [
        {
          table,
          operation: op,
          msg_type: 'status',
          msg_text: `${op} executed successfully on PostgreSQL table "${table}"`,
        },
      ];
    }
    // sqlite
    const sql = op === 'ANALYZE' ? `ANALYZE "${table}";` : `PRAGMA integrity_check("${table}");`;
    const res = await tauriBridge.executeQuery(connectionId, sql, database, table);
    return [
      {
        table,
        operation: op,
        msg_type: 'status',
        msg_text: res.rows[0] ? String(Object.values(res.rows[0])[0]) : 'OK',
      },
    ];
  },

  generateDumpSql: async (
    connectionId: string,
    engine: DatabaseEngine,
    tables: string[],
    options: { includeStructure: boolean; includeData: boolean; addDropTable: boolean },
    database?: string,
    onProgress?: (progressText: string) => void
  ): Promise<string> => {
    const q = engine === 'mysql' ? '`' : '"';
    const lines: string[] = [];
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    lines.push('-- ========================================================');
    lines.push('-- ExaGrid SQL Dump');
    lines.push(`-- Database: ${database || 'default'}`);
    lines.push(`-- Engine: ${engine.toUpperCase()}`);
    lines.push(`-- Generation Time: ${timestamp}`);
    lines.push('-- ========================================================\n');

    if (engine === 'mysql') {
      lines.push('SET NAMES utf8mb4;');
      lines.push('SET FOREIGN_KEY_CHECKS = 0;\n');
    }

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      if (onProgress) {
        onProgress(`Processing table ${i + 1}/${tables.length}: ${table}...`);
      }

      lines.push('-- --------------------------------------------------------');
      lines.push(`-- Table structure & data for table ${q}${table}${q}`);
      lines.push('-- --------------------------------------------------------\n');

      if (options.addDropTable) {
        lines.push(`DROP TABLE IF EXISTS ${q}${table}${q};`);
      }

      if (options.includeStructure) {
        try {
          const ddlObj = await tauriBridge.getTableDdl(connectionId, table);
          let ddl = ddlObj.ddl.trim();
          if (!ddl.endsWith(';')) ddl += ';';
          lines.push(`${ddl}\n`);
        } catch (e: any) {
          lines.push(`-- Failed to generate DDL for ${table}: ${e.message || e}\n`);
        }
      }

      if (options.includeData) {
        try {
          const queryResult = await tauriBridge.executeQuery(
            connectionId,
            `SELECT * FROM ${q}${table}${q};`,
            database,
            table
          );
          const {rows} = queryResult;
          const columns = queryResult.columns.map((c) => c.name);

          if (rows.length > 0 && columns.length > 0) {
            lines.push(`-- Dumping data for table ${q}${table}${q} (${rows.length} rows)`);
            const colsHeader = columns.map((c) => `${q}${c}${q}`).join(', ');
            const chunkSize = 100;

            for (let r = 0; r < rows.length; r += chunkSize) {
              const chunk = rows.slice(r, r + chunkSize);
              const valuesList = chunk.map((row) => {
                const vals = columns.map((col) => {
                  const val = row[col];
                  if (val === null || val === undefined) return 'NULL';
                  if (typeof val === 'number') return String(val);
                  if (typeof val === 'boolean') return val ? '1' : '0';
                  const esc = String(val).replace(/'/g, "''");
                  return `'${esc}'`;
                });
                return `(${vals.join(', ')})`;
              });

              lines.push(`INSERT INTO ${q}${table}${q} (${colsHeader}) VALUES\n  ${valuesList.join(',\n  ')};`);
            }
            lines.push('');
          }
        } catch (e: any) {
          lines.push(`-- Failed to dump data for ${table}: ${e.message || e}\n`);
        }
      }
    }

    if (engine === 'mysql') {
      lines.push('SET FOREIGN_KEY_CHECKS = 1;');
    }
    lines.push('-- Dump completed --');

    return lines.join('\n');
  },
};
