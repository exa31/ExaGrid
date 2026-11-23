use exagrid_lib::drivers::mysql::MySqlDriver;
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

#[tokio::test]
async fn seed_default_connections() {
    use exagrid_lib::config::storage::StorageManager;

    let storage = StorageManager::new();
    let home = dirs::home_dir().expect("Cannot get home dir");
    let sample_db_path = home.join(".exagrid").join("sample.db");

    // 1. MySQL (bca-db in Podman)
    let mysql_cfg = ConnectionConfig {
        id: Some("podman-mysql-bca".into()),
        name: "Podman - BCA MySQL (bca-db)".into(),
        engine: DatabaseEngine::Mysql,
        host: Some("127.0.0.1".into()),
        port: Some(3306),
        username: Some("root".into()),
        password: Some("root".into()),
        database: Some("bca_mutation".into()),
        file_path: None,
        connection_string: None,
        ssl: Some(false),
    };
    storage.save_profile(mysql_cfg).expect("Save MySQL profile failed");

    // 2. PostgreSQL (Local postgres)
    let pg_cfg = ConnectionConfig {
        id: Some("local-pg-exagrid".into()),
        name: "PostgreSQL - exagrid_demo".into(),
        engine: DatabaseEngine::Postgres,
        host: Some("127.0.0.1".into()),
        port: Some(5432),
        username: Some("postgres".into()),
        password: Some("postgres123".into()),
        database: Some("exagrid_demo".into()),
        file_path: None,
        connection_string: None,
        ssl: Some(false),
    };
    storage.save_profile(pg_cfg).expect("Save PostgreSQL profile failed");

    // 3. SQLite (Sample inventory)
    let sqlite_cfg = ConnectionConfig {
        id: Some("local-sqlite-sample".into()),
        name: "SQLite - Sample Inventory".into(),
        engine: DatabaseEngine::Sqlite,
        host: None,
        port: None,
        username: None,
        password: None,
        database: None,
        file_path: Some(sample_db_path.to_str().unwrap().to_string()),
        connection_string: None,
        ssl: None,
    };
    storage.save_profile(sqlite_cfg).expect("Save SQLite profile failed");

    // 4. MongoDB (Podman mongo)
    let mongo_cfg = ConnectionConfig {
        id: Some("podman-mongo-analytics".into()),
        name: "Podman - MongoDB (Analytics)".into(),
        engine: DatabaseEngine::Mongo,
        host: None,
        port: None,
        username: None,
        password: None,
        database: Some("analytics".into()),
        file_path: None,
        connection_string: Some("mongodb://127.0.0.1:27017".into()),
        ssl: None,
    };
    storage.save_profile(mongo_cfg).expect("Save MongoDB profile failed");

    let list = storage.list_profiles().expect("List profiles failed");
    println!("Seeded profiles successfully! Total profiles: {}", list.len());
    for p in &list {
        println!("- {} [{:?}] ID: {}", p.name, p.engine, p.id);
    }
}

#[tokio::test]
async fn test_mysql_podman_lifecycle() {
    let config = ConnectionConfig {
        id: Some("test-mysql".into()),
        name: "Podman MySQL".into(),
        engine: DatabaseEngine::Mysql,
        host: Some("127.0.0.1".into()),
        port: Some(3306),
        username: Some("root".into()),
        password: Some("root".into()),
        database: Some("bca_mutation".into()),
        file_path: None,
        connection_string: None,
        ssl: None,
    };

    println!("Testing MySQL ping...");
    let ping = MySqlDriver::ping(&config).await;
    println!("Ping result: {:?}", ping);
    assert!(ping.is_ok());

    let pool = MySqlDriver::connect(&config).await.expect("Connect to MySQL failed");
    let tables = MySqlDriver::list_tables(&pool, Some("bca_mutation")).await.expect("List tables failed");
    println!("Tables count: {}", tables.len());
    for t in &tables {
        println!("Table: {}", t.name);
    }
    assert!(!tables.is_empty());

    println!("Executing SELECT * FROM bca_accounts...");
    let cols = MySqlDriver::get_columns(&pool, "bca_accounts").await.expect("Get columns failed");
    println!("Columns inspected: {}", cols.len());
    for c in &cols {
        println!("Col: {} ({}), PK: {}, Nullable: {}", c.name, c.data_type, c.is_primary_key, c.nullable);
    }
    assert!(!cols.is_empty());
    assert!(cols.iter().any(|c| c.name == "id" && c.is_primary_key));

    let query_res = MySqlDriver::execute_query(&pool, "SELECT * FROM bca_accounts").await.expect("Query failed");
    println!("Columns: {:?}", query_res.columns.iter().map(|c| &c.name).collect::<Vec<_>>());
    println!("Rows: {:?}", query_res.rows);
}
