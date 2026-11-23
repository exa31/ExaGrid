use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::RngCore;
use crate::pkg::errors::AppError;

const DEFAULT_KEY_SALT: &[u8; 32] = b"exagrid-master-key-salt-32bytes!";

pub struct Crypto;

impl Crypto {
    pub fn encrypt(data: &str) -> Result<String, AppError> {
        let cipher = Aes256Gcm::new_from_slice(DEFAULT_KEY_SALT)
            .map_err(|e| AppError::Crypto(e.to_string()))?;
        let mut nonce_bytes = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, data.as_bytes())
            .map_err(|e| AppError::Crypto(e.to_string()))?;

        let mut combined = nonce_bytes.to_vec();
        combined.extend_from_slice(&ciphertext);
        Ok(hex::encode(combined))
    }

    pub fn decrypt(hex_data: &str) -> Result<String, AppError> {
        if hex_data.is_empty() {
            return Ok(String::new());
        }
        let bytes = hex::decode(hex_data)
            .map_err(|e| AppError::Crypto(format!("Invalid hex string: {}", e)))?;
        if bytes.len() < 12 {
            return Err(AppError::Crypto("Ciphertext too short".into()));
        }
        let (nonce_bytes, ciphertext) = bytes.split_at(12);
        let cipher = Aes256Gcm::new_from_slice(DEFAULT_KEY_SALT)
            .map_err(|e| AppError::Crypto(e.to_string()))?;
        let nonce = Nonce::from_slice(nonce_bytes);

        let decrypted = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| AppError::Crypto(format!("Decryption failed: {}", e)))?;

        String::from_utf8(decrypted)
            .map_err(|e| AppError::Crypto(format!("Invalid UTF-8 plaintext: {}", e)))
    }
}
