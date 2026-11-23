use exagrid_lib::drivers::sqlite::SqliteDriver;
use exagrid_lib::drivers::{ConnectionConfig, DatabaseEngine};
use exagrid_lib::pkg::crypto::Crypto;

#[test]
fn test_aes256_encryption_decryption() {
    let plain_password = "SuperSecretDbPassword!@#123";
    let encrypted = Crypto::encrypt(plain_password).expect("Encryption failed");
    assert_ne!(plain_password, encrypted);
    assert!(!encrypted.is_empty());

    let decrypted = Crypto::decrypt(&encrypted).expect("Decryption failed");
    assert_eq!(plain_password, decrypted);
}

#[tokio::test]
async fn test_sqlite_driver_lifecycle() {
    let temp_db = std::env::temp_dir().join(format!("test_exagrid_{}.db", uuid::Uuid::new_v4()));
    let config = ConnectionConfig {
        id: Some("test-sqlite".into()),
        name: "Test SQLite".into(),
        engine: DatabaseEngine::Sqlite,
        host: None,
        port: None,
        username: None,
        password: None,
        database: None,
        file_path: Some(temp_db.to_str().unwrap().to_string()),
        connection_string: None,
        ssl: None,
    };

    // 1. Test Ping
    let ping = SqliteDriver::ping(&config).await.expect("Ping failed");
    assert!(ping.success);
    assert!(ping.server_version.is_some());

    // 2. Connect
    let pool = SqliteDriver::connect(&config).await.expect("Connect failed");

    // 3. Create table
    SqliteDriver::execute_query(
        &pool,
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT, active BOOLEAN);"
    )
    .await
    .expect("Create table failed");

    // 4. Insert data
    SqliteDriver::execute_query(
        &pool,
        "INSERT INTO users (name, email, active) VALUES ('Alice', 'alice@example.com', 1), ('Bob', 'bob@example.com', 0);"
    )
    .await
    .expect("Insert failed");

    // 5. List tables
    let tables = SqliteDriver::list_tables(&pool).await.expect("List tables failed");
    assert!(tables.iter().any(|t| t.name == "users"));

    // 6. Inspect columns
    let cols = SqliteDriver::get_columns(&pool, "users").await.expect("Get columns failed");
    assert!(cols.iter().any(|c| c.name == "id" && c.is_primary_key));
    assert!(cols.iter().any(|c| c.name == "name" && !c.nullable));

    // 7. Execute Select Query
    let result = SqliteDriver::execute_query(&pool, "SELECT * FROM users ORDER BY id ASC")
        .await
        .expect("Select query failed");

    assert_eq!(result.rows.len(), 2);
    assert_eq!(result.columns.len(), 4);
    assert!(result.execution_time_ms < 1000);

    // Clean up temporary database file
    let _ = std::fs::remove_file(temp_db);
}
