#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::time::Duration;

#[tauri::command]
async fn fetch_pokepaste(id: String) -> Result<String, String> {
    if id.is_empty() || id.len() > 64 || !id.bytes().all(|byte| byte.is_ascii_alphanumeric()) {
        return Err("Invalid PokePaste ID".into());
    }
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(|error| error.to_string())?;
    let response = client
        .get(format!("https://pokepast.es/{id}"))
        .send()
        .await
        .map_err(|error| error.to_string())?;
    let response = response.error_for_status().map_err(|error| error.to_string())?;
    let body = response.bytes().await.map_err(|error| error.to_string())?;
    if body.len() > 1_000_000 {
        return Err("PokePaste page too large".into());
    }
    String::from_utf8(body.to_vec()).map_err(|error| error.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![fetch_pokepaste])
        .run(tauri::generate_context!())
        .expect("failed to run speed tool");
}
