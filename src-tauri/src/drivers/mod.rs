pub mod postgres;
pub mod mysql;
pub mod sqlite;
pub mod mongodb;

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DatabaseEngine {
    Postgres,
    Mysql,
    Sqlite,
    Mongo,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectionConfig {
    pub id: Option<String>,
    pub name: String,
    pub engine: DatabaseEngine,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub database: Option<String>,
    pub file_path: Option<String>,
    pub connection_string: Option<String>,
    pub ssl: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ColumnMeta {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub is_primary_key: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TableMeta {
    pub name: String,
    pub schema: Option<String>,
    pub table_type: String, // "TABLE", "VIEW", "COLLECTION"
    pub row_count: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IndexMeta {
    pub name: String,
    pub columns: Vec<String>,
    pub is_unique: bool,
    pub is_primary: bool,
    pub index_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TableDdl {
    pub table: String,
    pub ddl: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QueryResult {
    pub columns: Vec<ColumnMeta>,
    pub rows: Vec<serde_json::Value>,
    pub execution_time_ms: u64,
    pub affected_rows: u64,
    pub total_rows: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PingResult {
    pub success: bool,
    pub message: String,
    pub latency_ms: u64,
    pub server_version: Option<String>,
}
