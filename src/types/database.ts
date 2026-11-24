export type DatabaseEngine = 'postgres' | 'mysql' | 'sqlite' | 'mongo';

export interface ConnectionConfig {
  id?: string;
  name: string;
  engine: DatabaseEngine;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  file_path?: string;
  connection_string?: string;
  ssl?: boolean;
}

export interface StoredProfile {
  id: string;
  name: string;
  engine: DatabaseEngine;
  host?: string;
  port?: number;
  username?: string;
  database?: string;
  file_path?: string;
  connection_string?: string;
  ssl?: boolean;
  created_at: string;
}

export interface ColumnMeta {
  name: string;
  data_type: string;
  nullable: boolean;
  is_primary_key: boolean;
}

export interface TableMeta {
  name: string;
  schema?: string;
  table_type: string;
  row_count?: number;
}

export interface QueryResult {
  columns: ColumnMeta[];
  rows: Record<string, any>[];
  execution_time_ms: number;
  affected_rows: number;
  total_rows: number;
}

export interface PingResult {
  success: boolean;
  message: string;
  latency_ms: number;
  server_version?: string;
}

export interface IndexMeta {
  name: string;
  columns: string[];
  is_unique: boolean;
  is_primary: boolean;
  index_type?: string;
}

export interface ForeignKeyMeta {
  constraint_name: string;
  column_name: string;
  foreign_table: string;
  foreign_column: string;
  on_delete?: string;
  on_update?: string;
}

export interface TableDdl {
  table: string;
  ddl: string;
}

export interface ColumnDefinition {
  name: string;
  data_type: string;
  length_or_precision?: string;
  nullable: boolean;
  is_primary_key: boolean;
  auto_increment?: boolean;
  default_value?: string;
  comment?: string;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  is_unique: boolean;
}

export interface ForeignKeyDefinition {
  name: string;
  column: string;
  foreign_table: string;
  foreign_column: string;
  on_delete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  on_update?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface TableSchemaSpec {
  table_name: string;
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
}

export interface ProcessInfo {
  id: number | string;
  user: string;
  host: string;
  db?: string;
  command: string;
  time: number;
  state?: string;
  info?: string;
}

export interface TableStatsMeta {
  table_name: string;
  engine?: string;
  row_count?: number;
  data_size_bytes?: number;
  index_size_bytes?: number;
  total_size_bytes?: number;
  avg_row_length?: number;
  auto_increment?: number | string;
  collation?: string;
  create_time?: string;
  update_time?: string;
}

export interface ServerVariable {
  variable_name: string;
  value: string;
}

export type TableTabSubView =
  | 'data'
  | 'structure'
  | 'indexes'
  | 'foreign_keys'
  | 'er_diagram'
  | 'statistics'
  | 'ddl';

export type TabType = 'query' | 'table';

export interface TabItem {
  id: string;
  title: string;
  type: TabType;
  connectionId: string;
  database?: string;
  table?: string;
  subView?: TableTabSubView;
  query?: string;
  queryResult?: QueryResult | null;
  columns?: ColumnMeta[];
  indexes?: IndexMeta[];
  foreignKeys?: ForeignKeyMeta[];
  stats?: TableStatsMeta | null;
  ddl?: string;
  loading?: boolean;
  error?: string | null;
}
