pub mod commands;
pub mod config;
pub mod drivers;
pub mod pkg;

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::commands::{
    connect_database, delete_connection, disconnect_database, execute_query, export_data,
    get_table_columns, list_connections, list_tables, save_connection, test_connection,
    AppState,
};
use crate::config::storage::StorageManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState {
        storage: Arc::new(StorageManager::new()),
        active_pools: RwLock::new(HashMap::new()),
    };

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            test_connection,
            save_connection,
            list_connections,
            delete_connection,
            connect_database,
            disconnect_database,
            list_tables,
            get_table_columns,
            execute_query,
            export_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
