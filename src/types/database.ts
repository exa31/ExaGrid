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

export interface TableSchemaSpec {
  table_name: string;
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
}

export type TableTabSubView = 'data' | 'structure' | 'indexes' | 'ddl';

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
  ddl?: string;
  loading?: boolean;
  error?: string | null;
}
