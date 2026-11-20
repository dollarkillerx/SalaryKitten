#[cfg(target_os = "macos")]
mod mac_window;
mod updater;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};

const TRAY_ID: &str = "main";

/// 打开（或聚焦）设置窗口
fn show_settings(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("settings") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
        return;
    }
    let _ = WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("settings.html".into()))
        .title("薪水小猫 · 设置")
        .inner_size(460.0, 720.0)
        .min_inner_size(420.0, 560.0)
        .center()
        .build();
}

fn set_pet_visible(app: &AppHandle, visible: bool) {
    if let Some(w) = app.get_webview_window("pet") {
        let _ = if visible { w.show() } else { w.hide() };
        // 通知桌宠：隐藏时暂停点击穿透轮询
        let _ = w.emit("pet-visibility", visible);
    }
}

fn toggle_pet(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("pet") {
        set_pet_visible(app, !w.is_visible().unwrap_or(false));
    }
}

// 必须是 async：同步命令里创建窗口在 Windows 上会死锁（Tauri / wry#583）
#[tauri::command]
async fn open_settings(app: AppHandle) {
    show_settings(&app);
}

/// 更新托盘：macOS 菜单栏直接显示金额，Windows 显示在悬停提示里
#[tauri::command]
fn update_tray(app: AppHandle, title: String, tooltip: String) {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        #[cfg(target_os = "macos")]
        let _ = tray.set_title(if title.is_empty() { None } else { Some(title.as_str()) });
        #[cfg(not(target_os = "macos"))]
        let _ = &title;
        let _ = tray.set_tooltip(Some(tooltip.as_str()));
    }
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 只允许运行一个实例：再次启动时把已有的桌宠叫出来
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            set_pet_visible(app, true);
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(updater::Updater::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            open_settings,
            update_tray,
            quit_app,
            updater::update_status,
            updater::update_check,
            updater::update_install
        ])
        .setup(|app| {
            // macOS：不在 Dock 显示，只在菜单栏
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // macOS：桌宠可以拖到屏幕最上面（窗口上方的气泡空白伸到菜单栏后面）
            #[cfg(target_os = "macos")]
            if let Some(pet) = app.get_webview_window("pet") {
                if let Ok(ns) = pet.ns_window() {
                    mac_window::allow_above_menu_bar(ns);
                }
            }

            let toggle = MenuItem::with_id(app, "toggle", "显示 / 隐藏桌宠", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "设置…", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "退出薪水小猫", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle, &settings, &sep, &quit])?;

            TrayIconBuilder::with_id(TRAY_ID)
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("薪水小猫")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => toggle_pet(app),
                    "settings" => show_settings(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running SalaryKitten");
}
