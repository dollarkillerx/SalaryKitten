//! macOS：让桌宠窗口可以把顶部伸到菜单栏后面。
//!
//! 桌宠窗口上方留着显示气泡的透明空白，而 AppKit 的 `constrainFrameRect:toScreen:`
//! 不许窗口顶部高过菜单栏，结果角色本身到不了屏幕最上面。这里替换窗口类的这个方法：
//! 桌宠窗口原样返回位置（前端自己保证角色不出屏幕），其他窗口仍走原来的实现。

use objc2::ffi;
use objc2::runtime::{AnyClass, AnyObject, Imp, Sel};
use objc2::sel;
use std::ffi::c_void;
use std::sync::atomic::{AtomicPtr, AtomicUsize, Ordering};

#[repr(C)]
#[derive(Clone, Copy)]
struct Point { x: f64, y: f64 }
#[repr(C)]
#[derive(Clone, Copy)]
struct Size { w: f64, h: f64 }
#[repr(C)]
#[derive(Clone, Copy)]
struct Rect { origin: Point, size: Size }

type ConstrainFn = unsafe extern "C-unwind" fn(*mut AnyObject, Sel, Rect, *mut AnyObject) -> Rect;

static PET: AtomicPtr<AnyObject> = AtomicPtr::new(std::ptr::null_mut());
static ORIGINAL: AtomicUsize = AtomicUsize::new(0);

unsafe extern "C-unwind" fn constrain(this: *mut AnyObject, cmd: Sel, frame: Rect, screen: *mut AnyObject) -> Rect {
    if this == PET.load(Ordering::Relaxed) {
        return frame;
    }
    let original: ConstrainFn = std::mem::transmute(ORIGINAL.load(Ordering::Relaxed));
    original(this, cmd, frame, screen)
}

/// `ns_window` 来自 `WebviewWindow::ns_window()`；只需调用一次
pub fn allow_above_menu_bar(ns_window: *mut c_void) {
    if ns_window.is_null() || ORIGINAL.load(Ordering::Relaxed) != 0 {
        return;
    }
    unsafe {
        let obj = ns_window as *mut AnyObject;
        let cls: &AnyClass = (*obj).class();
        let sel = sel!(constrainFrameRect:toScreen:);
        let Some(method) = cls.instance_method(sel) else { return };
        let types = ffi::method_getTypeEncoding(method);
        ORIGINAL.store(method.implementation() as usize, Ordering::Relaxed);
        PET.store(obj, Ordering::Relaxed);
        let imp: Imp = std::mem::transmute(constrain as ConstrainFn);
        // 加在窗口自己的类上（覆盖 NSWindow 的实现）；如果这个类本来就实现了，就替换它
        ffi::class_replaceMethod(cls as *const AnyClass as *mut AnyClass, sel, imp, types);
    }
}
