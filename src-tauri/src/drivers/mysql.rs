use std::time::Instant;
use sqlx::{mysql::MySqlPoolOptions, Column, MySqlPool, Row, TypeInfo};
use crate::drivers::{ColumnMeta, ConnectionConfig, IndexMeta, PingResult, QueryResult, TableMeta};
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
                "SELECT CAST(TABLE_NAME AS CHAR) AS table_name, CAST(TABLE_TYPE AS CHAR) AS table_type, TABLE_ROWS AS table_rows 
                 FROM information_schema.tables 
                 WHERE table_schema = '{}' 
                 ORDER BY table_name",
                db.replace('\'', "''")
            )
        } else {
            "SELECT CAST(TABLE_NAME AS CHAR) AS table_name, CAST(TABLE_TYPE AS CHAR) AS table_type, TABLE_ROWS AS table_rows 
             FROM information_schema.tables 
             WHERE table_schema = DATABASE() OR (DATABASE() IS NULL AND table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys'))
             ORDER BY table_name"
                .to_string()
        };

        let rows = sqlx::query(&sql)
            .fetch_all(pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut tables = Vec::new();
        for row in rows {
            let name: String = row.try_get::<String, _>("table_name")
                .or_else(|_| row.try_get::<Vec<u8>, _>("table_name").map(|b| String::from_utf8_lossy(&b).to_string()))
                .unwrap_or_default();
            let t_type: String = row.try_get::<String, _>("table_type")
                .or_else(|_| row.try_get::<Vec<u8>, _>("table_type").map(|b| String::from_utf8_lossy(&b).to_string()))
                .unwrap_or_else(|_| "BASE TABLE".into());
            let count: Option<i64> = row.try_get::<i64, _>("table_rows")
                .or_else(|_| row.try_get::<i32, _>("table_rows").map(|i| i as i64))
                .ok();
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
        let (schema, table_clean) = if let Some((s, t)) = table.split_once('.') {
            (Some(s), t)
        } else {
            (None, table)
        };

        let sql = if let Some(s) = schema {
            format!(
                "SELECT CAST(COLUMN_NAME AS CHAR) AS column_name, CAST(DATA_TYPE AS CHAR) AS data_type, CAST(IS_NULLABLE AS CHAR) AS is_nullable, CAST(COLUMN_KEY AS CHAR) AS column_key 
                 FROM information_schema.columns 
                 WHERE table_schema = '{}' AND table_name = ? 
                 ORDER BY ordinal_position",
                s.replace('\'', "''")
            )
        } else {
            "SELECT CAST(COLUMN_NAME AS CHAR) AS column_name, CAST(DATA_TYPE AS CHAR) AS data_type, CAST(IS_NULLABLE AS CHAR) AS is_nullable, CAST(COLUMN_KEY AS CHAR) AS column_key 
             FROM information_schema.columns 
             WHERE table_name = ? AND (table_schema = DATABASE() OR DATABASE() IS NULL OR table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')) 
             ORDER BY ordinal_position"
                .to_string()
        };

        let rows = sqlx::query(&sql)
            .bind(table_clean)
            .fetch_all(pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut columns = Vec::new();
        for row in rows {
            let name: String = row.try_get::<String, _>("column_name")
                .or_else(|_| row.try_get::<Vec<u8>, _>("column_name").map(|b| String::from_utf8_lossy(&b).to_string()))
                .unwrap_or_default();
            let data_type: String = row.try_get::<String, _>("data_type")
                .or_else(|_| row.try_get::<Vec<u8>, _>("data_type").map(|b| String::from_utf8_lossy(&b).to_string()))
                .unwrap_or_else(|_| "varchar".into());
            let is_nullable: String = row.try_get::<String, _>("is_nullable")
                .or_else(|_| row.try_get::<Vec<u8>, _>("is_nullable").map(|b| String::from_utf8_lossy(&b).to_string()))
                .unwrap_or_else(|_| "YES".into());
            let key: String = row.try_get::<String, _>("column_key")
                .or_else(|_| row.try_get::<Vec<u8>, _>("column_key").map(|b| String::from_utf8_lossy(&b).to_string()))
                .unwrap_or_default();

            columns.push(ColumnMeta {
                name,
                data_type,
                nullable: is_nullable.to_uppercase() == "YES",
                is_primary_key: key.to_uppercase() == "PRI",
            });
        }
        Ok(columns)
    }

    pub async fn get_indexes(pool: &MySqlPool, table: &str) -> Result<Vec<IndexMeta>, AppError> {
        let clean_table = table.split('.').last().unwrap_or(table);
        let sql = format!("SHOW INDEX FROM `{}`", clean_table.replace('`', "``"));
        let rows = sqlx::query(&sql)
            .fetch_all(pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut index_map: std::collections::BTreeMap<String, (bool, bool, Option<String>, Vec<String>)> = std::collections::BTreeMap::new();

        for row in rows {
            let key_name: String = row.try_get::<String, _>("Key_name")
                .or_else(|_| row.try_get::<String, _>("KEY_NAME"))
                .or_else(|_| row.try_get::<Vec<u8>, _>("Key_name").map(|b| String::from_utf8_lossy(&b).to_string()))
                .unwrap_or_default();
            let col_name: String = row.try_get::<String, _>("Column_name")
                .or_else(|_| row.try_get::<String, _>("COLUMN_NAME"))
                .or_else(|_| row.try_get::<Vec<u8>, _>("Column_name").map(|b| String::from_utf8_lossy(&b).to_string()))
                .unwrap_or_default();
            let non_unique: i64 = row.try_get::<i64, _>("Non_unique")
                .or_else(|_| row.try_get::<i32, _>("Non_unique").map(|i| i as i64))
                .unwrap_or(1);
            let idx_type: Option<String> = row.try_get::<String, _>("Index_type")
                .or_else(|_| row.try_get::<String, _>("INDEX_TYPE"))
                .ok();

            let is_primary = key_name.to_uppercase() == "PRIMARY";
            let is_unique = non_unique == 0;

            let entry = index_map.entry(key_name).or_insert((is_unique, is_primary, idx_type, Vec::new()));
            entry.3.push(col_name);
        }

        let mut indexes = Vec::new();
        for (name, (is_unique, is_primary, index_type, columns)) in index_map {
            indexes.push(IndexMeta {
                name,
                columns,
                is_unique,
                is_primary,
                index_type,
            });
        }
        Ok(indexes)
    }

    pub async fn get_ddl(pool: &MySqlPool, table: &str) -> Result<String, AppError> {
        let clean_table = table.split('.').last().unwrap_or(table);
        let sql = format!("SHOW CREATE TABLE `{}`", clean_table.replace('`', "``"));
        let row = sqlx::query(&sql)
            .fetch_one(pool)
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        // Column 0 is the table name, column 1 is the CREATE TABLE DDL statement
        let ddl: String = row.try_get::<String, usize>(1)
            .or_else(|_| row.try_get::<Vec<u8>, usize>(1).map(|b| String::from_utf8_lossy(&b).to_string()))
            .or_else(|_| row.try_get::<String, _>("Create Table"))
            .or_else(|_| row.try_get::<String, _>("CREATE TABLE"))
            .or_else(|_| row.try_get::<Vec<u8>, _>("Create Table").map(|b| String::from_utf8_lossy(&b).to_string()))
            .unwrap_or_default();

        Ok(ddl)
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
                    } else if let Ok(u) = row.try_get::<u32, _>(col_name) {
                        serde_json::Value::Number(u.into())
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
