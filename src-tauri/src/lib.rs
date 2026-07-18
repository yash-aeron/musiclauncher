/// Proxy an HTTP request through Rust's reqwest so we have full control over
/// every header. The WebView / tauri-plugin-http inject an `Origin:
/// http://tauri.localhost` header that InnerTube rejects with 403, and
/// Origin/Referer are forbidden fetch headers that JS can't override. Doing the
/// request here sidesteps both problems.
#[tauri::command]
async fn yt_fetch(
  url: String,
  method: String,
  headers: std::collections::HashMap<String, String>,
  body: Option<String>,
) -> Result<YtResponse, String> {
  let client = reqwest::Client::builder()
    .timeout(std::time::Duration::from_secs(30))
    .build()
    .map_err(|e| e.to_string())?;
  let mut req = match method.to_uppercase().as_str() {
    "POST" => client.post(&url),
    _ => client.get(&url),
  };
  for (k, v) in headers {
    req = req.header(k, v);
  }
  if let Some(b) = body {
    req = req.body(b);
  }
  let resp = req.send().await.map_err(|e| e.to_string())?;
  let status = resp.status().as_u16();
  let text = resp.text().await.map_err(|e| e.to_string())?;
  Ok(YtResponse { status, body: text })
}

#[derive(serde::Serialize)]
struct YtResponse {
  status: u16,
  body: String,
}

/// Download a URL's raw bytes through Rust. googlevideo (and similar media
/// hosts) don't send CORS headers, so a WebView `fetch().blob()` fails with
/// "failed to fetch"; going through reqwest has no CORS. Returns the bytes as a
/// binary IPC response (delivered to JS as an ArrayBuffer).
#[tauri::command]
async fn yt_download(url: String) -> Result<tauri::ipc::Response, String> {
  const UA: &str = "com.google.android.apps.youtube.vr.oculus/1.62.27 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip";
  // reqwest has NO default timeout — a stalled googlevideo connection would
  // hang the download spinner forever. `timeout` covers the WHOLE request
  // including the body, so it must be generous enough for a full song over a
  // slow mobile link; `connect_timeout` fails fast on dead hosts.
  let client = reqwest::Client::builder()
    .connect_timeout(std::time::Duration::from_secs(15))
    .timeout(std::time::Duration::from_secs(300))
    .build()
    .map_err(|e| e.to_string())?;
  let mut resp = client
    .get(&url)
    .header("user-agent", UA)
    .send()
    .await
    .map_err(|e| format!("Download request failed: {e}"))?;
  if resp.status().as_u16() == 403 {
    // googlevideo sometimes 403s a plain full-file GET but accepts the same
    // request with an explicit Range (how the real clients fetch media).
    resp = client
      .get(&url)
      .header("user-agent", UA)
      .header("range", "bytes=0-")
      .send()
      .await
      .map_err(|e| format!("Download request failed: {e}"))?;
  }
  if !resp.status().is_success() {
    return Err(format!("Download failed: YouTube answered HTTP {}", resp.status().as_u16()));
  }
  let bytes = resp
    .bytes()
    .await
    .map_err(|e| format!("Download interrupted: {e}"))?;
  Ok(tauri::ipc::Response::new(bytes.to_vec()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_http::init())
    .invoke_handler(tauri::generate_handler![yt_fetch, yt_download])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
