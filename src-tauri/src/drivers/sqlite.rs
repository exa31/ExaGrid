use std::time::Instant;
use sqlx::{sqlite::SqlitePoolOptions, Column, Row, SqlitePool, TypeInfo};
use crate::drivers::{ColumnMeta, ConnectionConfig, IndexMeta, PingResult, QueryResult, TableMeta};
use crate::pkg::errors::AppError;

pub struct SqliteDriver;

impl SqliteDriver {
    pub async fn connect(config: &ConnectionConfig) -> Result<SqlitePool, AppError> {
        let path = config.file_path.as_deref().unwrap_or("exagrid.db");
        let conn_str = format!("sqlite:{}?mode=rwc", path);
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(&conn_str)
            .await
            .map_err(|e| AppError::Connection(format!("Failed to connect to SQLite {}: {}", path, e)))?;
        Ok(pool)
    }

    pub async fn ping(config: &ConnectionConfig) -> Result<PingResult, AppError> {
        let start = Instant::now();
        let pool = Self::connect(config).await?;
        let version_row: (String,) = sqlx::query_as("SELECT sqlite_version()")
            .fetch_one(&pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;
        let latency = start.elapsed().as_millis() as u64;
        Ok(PingResult {
            success: true,
            message: "Connected successfully to SQLite database".into(),
            latency_ms: latency,
            server_version: Some(format!("SQLite v{}", version_row.0)),
        })
    }

    pub async fn list_tables(pool: &SqlitePool) -> Result<Vec<TableMeta>, AppError> {
        let rows = sqlx::query(
            "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        let mut tables = Vec::new();
        for row in rows {
            let name: String = row.try_get("name").unwrap_or_default();
            let table_type: String = row.try_get("type").unwrap_or_else(|_| "table".into());
            tables.push(TableMeta {
                name,
                schema: None,
                table_type: table_type.to_uppercase(),
                row_count: None,
            });
        }
        Ok(tables)
    }

    pub async fn get_columns(pool: &SqlitePool, table: &str) -> Result<Vec<ColumnMeta>, AppError> {
        let query_str = format!("PRAGMA table_info('{}')", table.replace('\'', "''"));
        let rows = sqlx::query(&query_str)
            .fetch_all(pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut columns = Vec::new();
        for row in rows {
            let name: String = row.try_get("name").unwrap_or_default();
            let data_type: String = row.try_get("type").unwrap_or_else(|_| "TEXT".into());
            let notnull: i64 = row.try_get("notnull").unwrap_or(0);
            let pk: i64 = row.try_get("pk").unwrap_or(0);

            columns.push(ColumnMeta {
                name,
                data_type: if data_type.is_empty() { "TEXT".into() } else { data_type },
                nullable: notnull == 0,
                is_primary_key: pk > 0,
            });
        }
        Ok(columns)
    }

    pub async fn get_indexes(pool: &SqlitePool, table: &str) -> Result<Vec<IndexMeta>, AppError> {
        let sql = format!("PRAGMA index_list(\"{}\")", table.replace('"', "\"\""));
        let rows = sqlx::query(&sql)
            .fetch_all(pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut indexes = Vec::new();
        for row in rows {
            let name: String = row.try_get("name").unwrap_or_default();
            let is_unique: bool = row.try_get::<i64, _>("unique").map(|u| u == 1).unwrap_or(false);
            let origin: String = row.try_get("origin").unwrap_or_default();
            let is_primary = origin.to_uppercase() == "PK";

            let info_sql = format!("PRAGMA index_info(\"{}\")", name.replace('"', "\"\""));
            let mut cols = Vec::new();
            if let Ok(col_rows) = sqlx::query(&info_sql).fetch_all(pool).await {
                for cr in col_rows {
                    if let Ok(cname) = cr.try_get::<String, _>("name") {
                        cols.push(cname);
                    }
                }
            }

            indexes.push(IndexMeta {
                name,
                columns: cols,
                is_unique,
                is_primary,
                index_type: Some("BTREE".into()),
            });
        }
        Ok(indexes)
    }

    pub async fn get_ddl(pool: &SqlitePool, table: &str) -> Result<String, AppError> {
        let row = sqlx::query("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?")
            .bind(table)
            .fetch_one(pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        let ddl: String = row.try_get("sql").unwrap_or_default();
        Ok(ddl)
    }

    pub async fn execute_query(pool: &SqlitePool, sql: &str) -> Result<QueryResult, AppError> {
        let start = Instant::now();
        let trimmed = sql.trim();
        let is_select = trimmed.to_uppercase().starts_with("SELECT")
            || trimmed.to_uppercase().starts_with("PRAGMA")
            || trimmed.to_uppercase().starts_with("EXPLAIN");

        if is_select {
            let rows = sqlx::query(sql)
                .fetch_all(pool)
                .await
                .map_err(|e| AppError::Query(e.to_string()))?;

            let mut columns = Vec::new();
            if let Some(first) = rows.first() {
                for col in first.columns() {
                    columns.push(ColumnMeta {
                        name: col.name().to_string(),
                        data_type: col.type_info().name().to_string(),
                        nullable: true,
                        is_primary_key: false,
                    });
                }
            }

            let mut json_rows = Vec::new();
            for row in &rows {
                let mut map = serde_json::Map::new();
                for col in row.columns() {
                    let col_name = col.name();
                    let val: serde_json::Value = if let Ok(s) = row.try_get::<String, _>(col_name) {
                        if (s.starts_with('{') && s.ends_with('}')) || (s.starts_with('[') && s.ends_with(']')) {
                            serde_json::from_str(&s).unwrap_or(serde_json::Value::String(s))
                        } else {
                            serde_json::Value::String(s)
                        }
                    } else if let Ok(i) = row.try_get::<i64, _>(col_name) {
                        serde_json::Value::Number(i.into())
                    } else if let Ok(u) = row.try_get::<u64, _>(col_name) {
                        serde_json::Value::Number(u.into())
                    } else if let Ok(i) = row.try_get::<i32, _>(col_name) {
                        serde_json::Value::Number(i.into())
                    } else if let Ok(f) = row.try_get::<f64, _>(col_name) {
                        if let Some(n) = serde_json::Number::from_f64(f) {
                            serde_json::Value::Number(n)
                        } else {
                            serde_json::Value::Null
                        }
                    } else if let Ok(b) = row.try_get::<bool, _>(col_name) {
                        serde_json::Value::Bool(b)
                    } else {
                        serde_json::Value::Null
                    };
                    map.insert(col_name.to_string(), val);
                }
                json_rows.push(serde_json::Value::Object(map));
            }

            let latency = start.elapsed().as_millis() as u64;
            let total = json_rows.len();
            Ok(QueryResult {
                columns,
                rows: json_rows,
                execution_time_ms: latency,
                affected_rows: 0,
                total_rows: total,
            })
        } else {
            let res = sqlx::query(sql)
                .execute(pool)
                .await
                .map_err(|e| AppError::Query(e.to_string()))?;
            let latency = start.elapsed().as_millis() as u64;
            Ok(QueryResult {
                columns: Vec::new(),
                rows: Vec::new(),
                execution_time_ms: latency,
                affected_rows: res.rows_affected(),
                total_rows: 0,
            })
        }
    }
}
