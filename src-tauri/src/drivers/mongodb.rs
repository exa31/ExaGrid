use std::time::Instant;
use mongodb::{bson::doc, options::ClientOptions, Client};
use futures_util::stream::StreamExt;
use crate::drivers::{ColumnMeta, ConnectionConfig, PingResult, QueryResult, TableMeta};
use crate::pkg::errors::AppError;

pub struct MongoDriver;

impl MongoDriver {
    pub async fn connect(config: &ConnectionConfig) -> Result<Client, AppError> {
        let uri = if let Some(u) = &config.connection_string {
            u.clone()
        } else {
            let host = config.host.as_deref().unwrap_or("localhost");
            let port = config.port.unwrap_or(27017);
            if let (Some(u), Some(p)) = (&config.username, &config.password) {
                if !u.is_empty() && !p.is_empty() {
                    let auth_db = config.database.as_deref().unwrap_or("admin");
                    format!("mongodb://{}:{}@{}:{}/?authSource={}", u, p, host, port, auth_db)
                } else {
                    format!("mongodb://{}:{}", host, port)
                }
            } else {
                format!("mongodb://{}:{}", host, port)
            }
        };

        let mut client_options = ClientOptions::parse(&uri)
            .await
            .map_err(|e| AppError::Connection(format!("Invalid MongoDB URI: {}", e)))?;
        client_options.app_name = Some("ExaGrid".to_string());
        Client::with_options(client_options)
            .map_err(|e| AppError::Connection(format!("Failed to initialize MongoDB client: {}", e)))
    }

    pub async fn ping(config: &ConnectionConfig) -> Result<PingResult, AppError> {
        let start = Instant::now();
        let client = Self::connect(config).await?;
        let db_name = config.database.as_deref().unwrap_or("admin");
        let ping_cmd = doc! { "ping": 1 };
        client
            .database(db_name)
            .run_command(ping_cmd)
            .await
            .map_err(|e| AppError::Database(format!("MongoDB ping failed: {}", e)))?;
        let latency = start.elapsed().as_millis() as u64;

        Ok(PingResult {
            success: true,
            message: "Connected successfully to MongoDB".into(),
            latency_ms: latency,
            server_version: Some("MongoDB Server".into()),
        })
    }

    pub async fn list_collections(client: &Client, db_name: &str) -> Result<Vec<TableMeta>, AppError> {
        let db = client.database(db_name);
        let collections = db
            .list_collection_names()
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut list = Vec::new();
        for col_name in collections {
            list.push(TableMeta {
                name: col_name,
                schema: Some(db_name.to_string()),
                table_type: "COLLECTION".into(),
                row_count: None,
            });
        }
        Ok(list)
    }

    pub async fn list_databases(client: &Client) -> Result<Vec<String>, AppError> {
        let dbs = client
            .list_database_names()
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;
        Ok(dbs)
    }

    pub async fn execute_query(
        client: &Client,
        db_name: &str,
        collection_name: &str,
        filter_json: &str,
        limit: i64,
    ) -> Result<QueryResult, AppError> {
        let start = Instant::now();
        let db = client.database(db_name);
        let collection = db.collection::<mongodb::bson::Document>(collection_name);

        let filter_doc = if filter_json.trim().is_empty() || filter_json.trim() == "{}" {
            doc! {}
        } else {
            let json_val: serde_json::Value = serde_json::from_str(filter_json)
                .map_err(|e| AppError::BadRequest(format!("Invalid filter JSON: {}", e)))?;
            mongodb::bson::to_document(&json_val)
                .map_err(|e| AppError::BadRequest(format!("Failed to parse BSON filter: {}", e)))?
        };

        let find_options = mongodb::options::FindOptions::builder()
            .limit(limit)
            .build();

        let mut cursor = collection
            .find(filter_doc)
            .with_options(find_options)
            .await
            .map_err(|e| AppError::Query(e.to_string()))?;

        let mut rows = Vec::new();
        let mut keys_set = std::collections::BTreeSet::new();

        while let Some(result) = cursor.next().await {
            let doc = result.map_err(|e| AppError::Query(e.to_string()))?;
            for key in doc.keys() {
                keys_set.insert(key.clone());
            }
            let json_val = serde_json::to_value(&doc).unwrap_or(serde_json::Value::Null);
            rows.push(json_val);
        }

        let columns: Vec<ColumnMeta> = keys_set
            .into_iter()
            .map(|key| ColumnMeta {
                is_primary_key: key == "_id",
                data_type: if key == "_id" { "ObjectId".into() } else { "BSON".into() },
                name: key,
                nullable: true,
            })
            .collect();

        let latency = start.elapsed().as_millis() as u64;
        let total = rows.len();

        Ok(QueryResult {
            columns,
            rows,
            execution_time_ms: latency,
            affected_rows: 0,
            total_rows: total,
        })
    }
}
