use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use crate::drivers::{ConnectionConfig, DatabaseEngine};
use crate::pkg::crypto::Crypto;
use crate::pkg::errors::AppError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoredProfile {
    pub id: String,
    pub name: String,
    pub engine: DatabaseEngine,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub username: Option<String>,
    pub encrypted_password: Option<String>,
    pub database: Option<String>,
    pub file_path: Option<String>,
    pub connection_string: Option<String>,
    pub ssl: Option<bool>,
    pub created_at: String,
}

pub struct StorageManager {
    file_path: PathBuf,
}

impl StorageManager {
    pub fn new() -> Self {
        let base_dir = dirs::data_dir()
            .or_else(|| dirs::home_dir())
            .unwrap_or_else(|| PathBuf::from("."))
            .join(".exagrid");
        
        let _ = fs::create_dir_all(&base_dir);
        let file_path = base_dir.join("connections.json");
        Self { file_path }
    }

    pub fn list_profiles(&self) -> Result<Vec<StoredProfile>, AppError> {
        if !self.file_path.exists() {
            return Ok(Vec::new());
        }
        let data = fs::read_to_string(&self.file_path)?;
        let profiles: Vec<StoredProfile> = serde_json::from_str(&data).unwrap_or_default();
        Ok(profiles)
    }

    pub fn save_profile(&self, config: ConnectionConfig) -> Result<StoredProfile, AppError> {
        let mut profiles = self.list_profiles()?;
        let id = config.id.clone().unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        
        let encrypted_password = if let Some(pass) = &config.password {
            if !pass.is_empty() {
                Some(Crypto::encrypt(pass)?)
            } else {
                None
            }
        } else {
            None
        };

        let profile = StoredProfile {
            id: id.clone(),
            name: config.name,
            engine: config.engine,
            host: config.host,
            port: config.port,
            username: config.username,
            encrypted_password,
            database: config.database,
            file_path: config.file_path,
            connection_string: config.connection_string,
            ssl: config.ssl,
            created_at: chrono::Utc::now().to_rfc3339(),
        };

        if let Some(pos) = profiles.iter().position(|p| p.id == id) {
            profiles[pos] = profile.clone();
        } else {
            profiles.push(profile.clone());
        }

        let json = serde_json::to_string_pretty(&profiles)?;
        fs::write(&self.file_path, json)?;
        Ok(profile)
    }

    pub fn delete_profile(&self, id: &str) -> Result<(), AppError> {
        let mut profiles = self.list_profiles()?;
        profiles.retain(|p| p.id != id);
        let json = serde_json::to_string_pretty(&profiles)?;
        fs::write(&self.file_path, json)?;
        Ok(())
    }

    pub fn get_decrypted_config(&self, id: &str) -> Result<ConnectionConfig, AppError> {
        let profiles = self.list_profiles()?;
        let profile = profiles.into_iter().find(|p| p.id == id)
            .ok_or_else(|| AppError::NotFound(format!("Connection profile '{}' not found", id)))?;

        let password = if let Some(enc) = profile.encrypted_password {
            Some(Crypto::decrypt(&enc)?)
        } else {
            None
        };

        Ok(ConnectionConfig {
            id: Some(profile.id),
            name: profile.name,
            engine: profile.engine,
            host: profile.host,
            port: profile.port,
            username: profile.username,
            password,
            database: profile.database,
            file_path: profile.file_path,
            connection_string: profile.connection_string,
            ssl: profile.ssl,
        })
    }
}
