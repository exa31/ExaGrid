use std::time::Instant;
use sqlx::{mysql::MySqlPoolOptions, Column, MySqlPool, Row, TypeInfo};
use crate::drivers::{ColumnMeta, ConnectionConfig, PingResult, QueryResult, TableMeta};
use crate::pkg::errors::AppError;

pub struct MySqlDriver;

impl MySqlDriver {
    pub async fn connect(config: &ConnectionConfig) -> Result<MySqlPool, AppError> {
        let conn_str = if let Some(uri) = &config.connection_string {
            uri.clone()
        } else {
            let host = config.host.as_deref().unwrap_or("localhost");
            let port = config.port.unwrap_or(3306);
            let user = config.username.as_deref().unwrap_or("root");
            let pass = config.password.as_deref().unwrap_or("");
            let db = config.database.as_deref().unwrap_or("");
            if db.is_empty() {
                format!("mysql://{}:{}@{}:{}", user, pass, host, port)
            } else {
                format!("mysql://{}:{}@{}:{}/{}", user, pass, host, port, db)
            }
        };

        MySqlPoolOptions::new()
            .max_connections(5)
            .connect(&conn_str)
            .await
            .map_err(|e| AppError::Connection(format!("Failed to connect to MySQL: {}", e)))
    }

    pub async fn ping(config: &ConnectionConfig) -> Result<PingResult, AppError> {
        let start = Instant::now();
        let pool = Self::connect(config).await?;
        let version_row: (String,) = sqlx::query_as("SELECT version()")
            .fetch_one(&pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;
        let latency = start.elapsed().as_millis() as u64;
        Ok(PingResult {
            success: true,
            message: "Connected successfully to MySQL".into(),
            latency_ms: latency,
            server_version: Some(format!("MySQL {}", version_row.0)),
        })
    }

    pub async fn list_tables(pool: &MySqlPool, current_db: Option<&str>) -> Result<Vec<TableMeta>, AppError> {
        let sql = if let Some(db) = current_db {
            format!(
                "SELECT table_name, table_type, table_rows 
                 FROM information_schema.tables 
                 WHERE table_schema = '{}' 
                 ORDER BY table_name",
                db.replace('\'', "''")
            )
        } else {
            "SELECT table_name, table_type, table_rows 
             FROM information_schema.tables 
             WHERE table_schema = DATABASE() 
             ORDER BY table_name"
                .to_string()
        };

        let rows = sqlx::query(&sql)
            .fetch_all(pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut tables = Vec::new();
        for row in rows {
            let name: String = row.try_get("table_name").unwrap_or_default();
            let t_type: String = row.try_get("table_type").unwrap_or_else(|_| "BASE TABLE".into());
            let count: Option<i64> = row.try_get("table_rows").ok();
            tables.push(TableMeta {
                name,
                schema: current_db.map(|s| s.to_string()),
                table_type: t_type,
                row_count: count.map(|c| c as u64),
            });
        }
        Ok(tables)
    }

    pub async fn get_columns(pool: &MySqlPool, table: &str) -> Result<Vec<ColumnMeta>, AppError> {
        let rows = sqlx::query(
            "SELECT column_name, data_type, is_nullable, column_key 
             FROM information_schema.columns 
             WHERE table_name = ? AND table_schema = DATABASE() 
             ORDER BY ordinal_position"
        )
        .bind(table)
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        let mut columns = Vec::new();
        for row in rows {
            let name: String = row.try_get("column_name").unwrap_or_default();
            let data_type: String = row.try_get("data_type").unwrap_or_else(|_| "varchar".into());
            let is_nullable: String = row.try_get("is_nullable").unwrap_or_else(|_| "YES".into());
            let key: String = row.try_get("column_key").unwrap_or_default();

            columns.push(ColumnMeta {
                name,
                data_type,
                nullable: is_nullable.to_uppercase() == "YES",
                is_primary_key: key.to_uppercase() == "PRI",
            });
        }
        Ok(columns)
    }

    pub async fn execute_query(pool: &MySqlPool, sql: &str) -> Result<QueryResult, AppError> {
        let start = Instant::now();
        let trimmed = sql.trim();
        let is_select = trimmed.to_uppercase().starts_with("SELECT")
            || trimmed.to_uppercase().starts_with("SHOW")
            || trimmed.to_uppercase().starts_with("DESCRIBE")
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
                        serde_json::Value::String(s)
                    } else if let Ok(i) = row.try_get::<i64, _>(col_name) {
                        serde_json::Value::Number(i.into())
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
