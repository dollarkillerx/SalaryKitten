//! 自动更新（参考 MySSH：启动后后台检查一次，下载好了才提示；设置里可手动检查、显示进度、重启更新）。
//! 状态放在 Rust 里，变化时广播 `update-state` 事件给所有窗口。
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_updater::{Update, UpdaterExt};

#[derive(Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Phase {
    Idle,
    Checking,
    UpToDate,
    Downloading,
    Ready,
    Failed,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateState {
    phase: Phase,
    current: String,
    version: Option<String>,
    progress: u8,
    error: Option<String>,
    notes: Option<String>,
}

#[derive(Default)]
pub struct Updater {
    state: Mutex<Option<UpdateState>>,
    pending: Mutex<Option<(Update, Vec<u8>)>>,
}

fn current(app: &AppHandle) -> UpdateState {
    let u = app.state::<Updater>();
    let mut s = u.state.lock().unwrap();
    s.get_or_insert_with(|| UpdateState {
        phase: Phase::Idle,
        current: app.package_info().version.to_string(),
        version: None,
        progress: 0,
        error: None,
        notes: None,
    })
    .clone()
}

fn set(app: &AppHandle, f: impl FnOnce(&mut UpdateState)) {
    let mut st = current(app);
    f(&mut st);
    *app.state::<Updater>().state.lock().unwrap() = Some(st.clone());
    let _ = app.emit("update-state", st);
}

#[tauri::command]
pub fn update_status(app: AppHandle) -> UpdateState {
    current(&app)
}

/// 检查并下载更新。background=true 时失败不报错（离线、限流等），只回到 Idle。
#[tauri::command]
pub async fn update_check(app: AppHandle, background: bool) -> Result<(), String> {
    // 判断与标记在同一把锁里完成，避免两次检查同时开始
    {
        let st = current(&app);
        let u = app.state::<Updater>();
        let mut guard = u.state.lock().unwrap();
        let s = guard.get_or_insert(st);
        if matches!(s.phase, Phase::Checking | Phase::Downloading | Phase::Ready) {
            return Ok(());
        }
        s.phase = Phase::Checking;
        s.error = None;
        let _ = app.emit("update-state", s.clone());
    }
    let result = run(&app).await;
    if let Err(e) = &result {
        eprintln!("[updater] check failed (background={background}): {e}");
    }
    if let Err(e) = result {
        set(&app, |s| {
            if background {
                s.phase = Phase::Idle;
            } else {
                s.phase = Phase::Failed;
                s.error = Some(e.clone());
            }
        });
    }
    Ok(())
}

async fn run(app: &AppHandle) -> Result<(), String> {
    // 超时覆盖整个下载（约 11 MB），给慢网络留足时间；不设的话网络卡住时会永远挂起
    let updater = app
        .updater_builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| e.to_string())?;
    eprintln!("[updater] checking for updates (current {})", app.package_info().version);
    let Some(update) = updater.check().await.map_err(|e| e.to_string())? else {
        eprintln!("[updater] up to date");
        set(app, |s| s.phase = Phase::UpToDate);
        return Ok(());
    };
    let version = update.version.clone();
    let notes = update.body.clone();
    eprintln!("[updater] found {version}, downloading");
    set(app, |s| {
        s.phase = Phase::Downloading;
        s.version = Some(version.clone());
        s.notes = notes.clone();
        s.progress = 0;
    });

    let mut got: u64 = 0;
    let mut last_pct: u8 = 0;
    let handle = app.clone();
    let bytes = update
        .download(
            move |chunk, total| {
                got += chunk as u64;
                if let Some(total) = total.filter(|t| *t > 0) {
                    let pct = ((got * 100) / total).min(100) as u8;
                    if pct != last_pct {
                        last_pct = pct;
                        set(&handle, |s| s.progress = pct);
                    }
                }
            },
            || {},
        )
        .await
        .map_err(|e| e.to_string())?;

    eprintln!("[updater] downloaded {} bytes", bytes.len());
    *app.state::<Updater>().pending.lock().unwrap() = Some((update, bytes));
    set(app, |s| {
        s.phase = Phase::Ready;
        s.progress = 100;
    });
    Ok(())
}

/// 安装已下载的更新并重启（Windows 上安装器会先关闭本程序）。
#[tauri::command]
pub async fn update_install(app: AppHandle, updater: State<'_, Updater>) -> Result<(), String> {
    let pending = updater.pending.lock().unwrap().take();
    let Some((update, bytes)) = pending else {
        return Err("没有已下载的更新".into());
    };
    if let Err(e) = update.install(bytes) {
        set(&app, |s| {
            s.phase = Phase::Failed;
            s.error = Some(e.to_string());
        });
        return Err(e.to_string());
    }
    app.restart();
}
