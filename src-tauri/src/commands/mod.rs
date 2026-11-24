use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

use crate::config::storage::{StorageManager, StoredProfile};
use crate::drivers::mongodb::MongoDriver;
use crate::drivers::mysql::MySqlDriver;
use crate::drivers::postgres::PostgresDriver;
use crate::drivers::sqlite::SqliteDriver;
use crate::drivers::{
    ColumnMeta, ConnectionConfig, DatabaseEngine, IndexMeta, PingResult, QueryResult, TableDdl,
    TableMeta,
};

pub enum ActiveConnection {
    Postgres(sqlx::PgPool),
    Mysql(sqlx::MySqlPool),
    Sqlite(sqlx::SqlitePool),
    Mongo(mongodb::Client),
}

pub struct AppState {
    pub storage: Arc<StorageManager>,
    pub active_pools: RwLock<HashMap<String, ActiveConnection>>,
}

#[tauri::command]
pub async fn test_connection(config: ConnectionConfig) -> Result<PingResult, String> {
    match config.engine {
        DatabaseEngine::Postgres => PostgresDriver::ping(&config).await.map_err(|e| e.to_string()),
        DatabaseEngine::Mysql => MySqlDriver::ping(&config).await.map_err(|e| e.to_string()),
        DatabaseEngine::Sqlite => SqliteDriver::ping(&config).await.map_err(|e| e.to_string()),
        DatabaseEngine::Mongo => MongoDriver::ping(&config).await.map_err(|e| e.to_string()),
    }
}

#[tauri::command]
pub async fn save_connection(
    state: State<'_, AppState>,
    config: ConnectionConfig,
) -> Result<StoredProfile, String> {
    state.storage.save_profile(config).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_connections(state: State<'_, AppState>) -> Result<Vec<StoredProfile>, String> {
    state.storage.list_profiles().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_connection(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.storage.delete_profile(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn connect_database(
    state: State<'_, AppState>,
    id: String,
) -> Result<PingResult, String> {
    let config = state
        .storage
        .get_decrypted_config(&id)
        .map_err(|e| e.to_string())?;

    let (active_conn, ping_res) = match config.engine {
        DatabaseEngine::Postgres => {
            let pool = PostgresDriver::connect(&config).await.map_err(|e| e.to_string())?;
            let ping = PostgresDriver::ping(&config).await.map_err(|e| e.to_string())?;
            (ActiveConnection::Postgres(pool), ping)
        }
        DatabaseEngine::Mysql => {
            let pool = MySqlDriver::connect(&config).await.map_err(|e| e.to_string())?;
            let ping = MySqlDriver::ping(&config).await.map_err(|e| e.to_string())?;
            (ActiveConnection::Mysql(pool), ping)
        }
        DatabaseEngine::Sqlite => {
            let pool = SqliteDriver::connect(&config).await.map_err(|e| e.to_string())?;
            let ping = SqliteDriver::ping(&config).await.map_err(|e| e.to_string())?;
            (ActiveConnection::Sqlite(pool), ping)
        }
        DatabaseEngine::Mongo => {
            let client = MongoDriver::connect(&config).await.map_err(|e| e.to_string())?;
            let ping = MongoDriver::ping(&config).await.map_err(|e| e.to_string())?;
            (ActiveConnection::Mongo(client), ping)
        }
    };

    let mut pools = state.active_pools.write().await;
    pools.insert(id, active_conn);

    Ok(ping_res)
}

#[tauri::command]
pub async fn disconnect_database(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let mut pools = state.active_pools.write().await;
    pools.remove(&id);
    Ok(())
}

#[tauri::command]
pub async fn list_tables(
    state: State<'_, AppState>,
    connection_id: String,
    database: Option<String>,
) -> Result<Vec<TableMeta>, String> {
    let pools = state.active_pools.read().await;
    let conn = pools
        .get(&connection_id)
        .ok_or_else(|| "Database not connected. Please connect first.".to_string())?;

    match conn {
        ActiveConnection::Postgres(pool) => PostgresDriver::list_tables(pool).await.map_err(|e| e.to_string()),
        ActiveConnection::Mysql(pool) => {
            MySqlDriver::list_tables(pool, database.as_deref()).await.map_err(|e| e.to_string())
        }
        ActiveConnection::Sqlite(pool) => SqliteDriver::list_tables(pool).await.map_err(|e| e.to_string()),
        ActiveConnection::Mongo(client) => {
            let db_name = database.as_deref().unwrap_or("test");
            MongoDriver::list_collections(client, db_name).await.map_err(|e| e.to_string())
        }
    }
}

#[tauri::command]
pub async fn get_table_columns(
    state: State<'_, AppState>,
    connection_id: String,
    table: String,
) -> Result<Vec<ColumnMeta>, String> {
    let pools = state.active_pools.read().await;
    let conn = pools
        .get(&connection_id)
        .ok_or_else(|| "Database not connected. Please connect first.".to_string())?;

    match conn {
        ActiveConnection::Postgres(pool) => {
            PostgresDriver::get_columns(pool, &table).await.map_err(|e| e.to_string())
        }
        ActiveConnection::Mysql(pool) => {
            MySqlDriver::get_columns(pool, &table).await.map_err(|e| e.to_string())
        }
        ActiveConnection::Sqlite(pool) => {
            SqliteDriver::get_columns(pool, &table).await.map_err(|e| e.to_string())
        }
        ActiveConnection::Mongo(_) => {
            // MongoDB collections are schemaless; columns are dynamically gathered on query
            Ok(vec![
                ColumnMeta {
                    name: "_id".into(),
                    data_type: "ObjectId".into(),
                    nullable: false,
                    is_primary_key: true,
                },
                ColumnMeta {
                    name: "document".into(),
                    data_type: "BSON/JSON".into(),
                    nullable: true,
                    is_primary_key: false,
                },
            ])
        }
    }
}

#[tauri::command]
pub async fn get_table_indexes(
    state: State<'_, AppState>,
    connection_id: String,
    table: String,
) -> Result<Vec<IndexMeta>, String> {
    let pools = state.active_pools.read().await;
    let conn = pools
        .get(&connection_id)
        .ok_or_else(|| "Database not connected. Please connect first.".to_string())?;

    match conn {
        ActiveConnection::Postgres(pool) => {
            PostgresDriver::get_indexes(pool, &table).await.map_err(|e| e.to_string())
        }
        ActiveConnection::Mysql(pool) => {
            MySqlDriver::get_indexes(pool, &table).await.map_err(|e| e.to_string())
        }
        ActiveConnection::Sqlite(pool) => {
            SqliteDriver::get_indexes(pool, &table).await.map_err(|e| e.to_string())
        }
        ActiveConnection::Mongo(_) => {
            Ok(vec![
                IndexMeta {
                    name: "_id_".into(),
                    columns: vec!["_id".into()],
                    is_unique: true,
                    is_primary: true,
                    index_type: Some("BTREE".into()),
                }
            ])
        }
    }
}

#[tauri::command]
pub async fn get_table_ddl(
    state: State<'_, AppState>,
    connection_id: String,
    table: String,
) -> Result<TableDdl, String> {
    let pools = state.active_pools.read().await;
    let conn = pools
        .get(&connection_id)
        .ok_or_else(|| "Database not connected. Please connect first.".to_string())?;

    let ddl = match conn {
        ActiveConnection::Postgres(pool) => {
            PostgresDriver::get_ddl(pool, &table).await.map_err(|e| e.to_string())?
        }
        ActiveConnection::Mysql(pool) => {
            MySqlDriver::get_ddl(pool, &table).await.map_err(|e| e.to_string())?
        }
        ActiveConnection::Sqlite(pool) => {
            SqliteDriver::get_ddl(pool, &table).await.map_err(|e| e.to_string())?
        }
        ActiveConnection::Mongo(_) => {
            format!("// MongoDB Collection: {}\n// Schemaless NoSQL collection", table)
        }
    };

    Ok(TableDdl { table, ddl })
}

#[tauri::command]
pub async fn execute_query(
    state: State<'_, AppState>,
    connection_id: String,
    query: String,
    database: Option<String>,
    collection: Option<String>,
    limit: Option<i64>,
) -> Result<QueryResult, String> {
    let pools = state.active_pools.read().await;
    let conn = pools
        .get(&connection_id)
        .ok_or_else(|| "Database not connected. Please connect first.".to_string())?;

    match conn {
        ActiveConnection::Postgres(pool) => {
            PostgresDriver::execute_query(pool, &query).await.map_err(|e| e.to_string())
        }
        ActiveConnection::Mysql(pool) => {
            MySqlDriver::execute_query(pool, &query).await.map_err(|e| e.to_string())
        }
        ActiveConnection::Sqlite(pool) => {
            SqliteDriver::execute_query(pool, &query).await.map_err(|e| e.to_string())
        }
        ActiveConnection::Mongo(client) => {
            let db_name = database.as_deref().unwrap_or("test");
            let coll_name = collection.as_deref().unwrap_or("items");
            let row_limit = limit.unwrap_or(100);
            MongoDriver::execute_query(client, db_name, coll_name, &query, row_limit)
                .await
                .map_err(|e| e.to_string())
        }
    }
}

#[tauri::command]
pub async fn export_data(
    rows: Vec<serde_json::Value>,
    format: String,
    file_path: String,
) -> Result<String, String> {
    if rows.is_empty() {
        return Err("No rows to export".into());
    }

    if format.to_lowercase() == "json" {
        let json_str = serde_json::to_string_pretty(&rows).map_err(|e| e.to_string())?;
        std::fs::write(&file_path, json_str).map_err(|e| e.to_string())?;
        return Ok(format!("Successfully exported {} rows to JSON", rows.len()));
    }

    // Default: CSV export
    let mut writer = csv::Writer::from_path(&file_path).map_err(|e| e.to_string())?;
    
    // Extract headers from first row
    let headers: Vec<String> = if let Some(first) = rows.first() {
        if let Some(obj) = first.as_object() {
            obj.keys().cloned().collect()
        } else {
            vec!["value".to_string()]
        }
    } else {
        vec![]
    };

    writer.write_record(&headers).map_err(|e| e.to_string())?;

    for row in rows {
        let mut record = Vec::new();
        if let Some(obj) = row.as_object() {
            for h in &headers {
                let cell = obj.get(h).unwrap_or(&serde_json::Value::Null);
                let cell_str = match cell {
                    serde_json::Value::Null => "".to_string(),
                    serde_json::Value::String(s) => s.clone(),
                    _ => cell.to_string(),
                };
                record.push(cell_str);
            }
        }
        writer.write_record(&record).map_err(|e| e.to_string())?;
    }

    writer.flush().map_err(|e| e.to_string())?;
    Ok(format!("Successfully exported to CSV: {}", file_path))
}
