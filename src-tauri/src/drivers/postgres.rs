use std::time::Instant;
use sqlx::{postgres::PgPoolOptions, Column, PgPool, Row, TypeInfo};
use crate::drivers::{ColumnMeta, ConnectionConfig, PingResult, QueryResult, TableMeta};
use crate::pkg::errors::AppError;

pub struct PostgresDriver;

impl PostgresDriver {
    pub async fn connect(config: &ConnectionConfig) -> Result<PgPool, AppError> {
        let conn_str = if let Some(uri) = &config.connection_string {
            uri.clone()
        } else {
            let host = config.host.as_deref().unwrap_or("localhost");
            let port = config.port.unwrap_or(5432);
            let user = config.username.as_deref().unwrap_or("postgres");
            let pass = config.password.as_deref().unwrap_or("");
            let db = config.database.as_deref().unwrap_or("postgres");
            let ssl_mode = if config.ssl.unwrap_or(false) { "require" } else { "disable" };
            format!("postgres://{}:{}@{}:{}/{}?sslmode={}", user, pass, host, port, db, ssl_mode)
        };

        PgPoolOptions::new()
            .max_connections(5)
            .connect(&conn_str)
            .await
            .map_err(|e| AppError::Connection(format!("Failed to connect to PostgreSQL: {}", e)))
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
            message: "Connected successfully to PostgreSQL".into(),
            latency_ms: latency,
            server_version: Some(version_row.0),
        })
    }

    pub async fn list_tables(pool: &PgPool) -> Result<Vec<TableMeta>, AppError> {
        let rows = sqlx::query(
            "SELECT table_schema, table_name, table_type 
             FROM information_schema.tables 
             WHERE table_schema NOT IN ('pg_catalog', 'information_schema') 
             ORDER BY table_schema, table_name"
        )
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        let mut tables = Vec::new();
        for row in rows {
            let schema: String = row.try_get("table_schema").unwrap_or_default();
            let name: String = row.try_get("table_name").unwrap_or_default();
            let t_type: String = row.try_get("table_type").unwrap_or_else(|_| "BASE TABLE".into());
            tables.push(TableMeta {
                name,
                schema: Some(schema),
                table_type: t_type,
                row_count: None,
            });
        }
        Ok(tables)
    }

    pub async fn get_columns(pool: &PgPool, table: &str) -> Result<Vec<ColumnMeta>, AppError> {
        let rows = sqlx::query(
            "SELECT column_name, data_type, is_nullable 
             FROM information_schema.columns 
             WHERE table_name = $1 
             ORDER BY ordinal_position"
        )
        .bind(table)
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

        let mut columns = Vec::new();
        for row in rows {
            let name: String = row.try_get("column_name").unwrap_or_default();
            let data_type: String = row.try_get("data_type").unwrap_or_else(|_| "text".into());
            let is_nullable: String = row.try_get("is_nullable").unwrap_or_else(|_| "YES".into());
            columns.push(ColumnMeta {
                name,
                data_type,
                nullable: is_nullable.to_uppercase() == "YES",
                is_primary_key: false,
            });
        }
        Ok(columns)
    }

    pub async fn execute_query(pool: &PgPool, sql: &str) -> Result<QueryResult, AppError> {
        let start = Instant::now();
        let trimmed = sql.trim();
        let is_select = trimmed.to_uppercase().starts_with("SELECT")
            || trimmed.to_uppercase().starts_with("SHOW")
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
                    } else if let Ok(dt) = row.try_get::<chrono::NaiveDateTime, _>(col_name) {
                        serde_json::Value::String(dt.format("%Y-%m-%d %H:%M:%S").to_string())
                    } else if let Ok(dt) = row.try_get::<chrono::DateTime<chrono::Utc>, _>(col_name) {
                        serde_json::Value::String(dt.to_rfc3339())
                    } else if let Ok(d) = row.try_get::<chrono::NaiveDate, _>(col_name) {
                        serde_json::Value::String(d.format("%Y-%m-%d").to_string())
                    } else if let Ok(t) = row.try_get::<chrono::NaiveTime, _>(col_name) {
                        serde_json::Value::String(t.format("%H:%M:%S").to_string())
                    } else if let Ok(u) = row.try_get::<uuid::Uuid, _>(col_name) {
                        serde_json::Value::String(u.to_string())
                    } else if let Ok(v) = row.try_get::<serde_json::Value, _>(col_name) {
                        v
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
