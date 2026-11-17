// Chạy trên mọi trang (content script + tự chèn vào tab đang mở khi cài / cập nhật).
// Tự bắt phím tắt thay vì dựa vào chrome://extensions/shortcuts (Chrome hay không gán được):
//   Alt+Shift+X → lưu nhanh đoạn đang bôi đen
//   Alt+Shift+S → chụp vùng màn hình
// Nếu Chrome có gán phím thì trình duyệt xử lý trước, trang không nhận được → không chạy trùng.
(() => {
  // Bản cũ còn trong trang (extension vừa cập nhật) → gỡ để bản mới xử lý
  window.__napHooks?.dispose?.()

  const KEYS = { KeyX: 'nap-quick', KeyS: 'nap-capture' }

  // Extension đã reload/cập nhật mà script này là bản cũ → chrome.runtime.id mất
  const alive = () => { try { return !!chrome.runtime?.id } catch (e) { return false } }

  function onKey (e) {
    if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey || e.repeat) return
    const type = KEYS[e.code]
    if (!type) return
    // Bản cũ (extension đã reload): sendMessage ném lỗi NGAY → tự gỡ và KHÔNG chặn phím,
    // để bộ bắt phím của bản mới (đã được chèn lại) xử lý chính phím này.
    let sending
    try {
      if (!alive()) throw new Error('orphaned')
      sending = chrome.runtime.sendMessage({ type, text: getSelection().toString() })
    } catch (err) {
      dispose()
      return
    }
    e.preventDefault()
    e.stopImmediatePropagation()
    sending.catch(() => toast('Extension vừa được cập nhật. Tải lại trang (F5) rồi thử lại.', 'err'))
  }

  // Telegram tự vẽ menu chuột phải nên menu Chrome (có "Nạp vào sheet") không hiện.
  // Đang bôi đen chữ → chặn handler của trang để menu Chrome hiện. Không bôi đen → menu Telegram như cũ.
  function onContextMenu (e) {
    if (location.hostname === 'web.telegram.org' && getSelection().toString().trim()) e.stopImmediatePropagation()
  }

  function onMessage (m) {
    if (m?.type === 'nap-toast') toast(m.msg, m.kind)
  }

  function dispose () {
    removeEventListener('keydown', onKey, true)
    removeEventListener('contextmenu', onContextMenu, true)
    try { chrome.runtime.onMessage.removeListener(onMessage) } catch (e) {}
    if (window.__napHooks?.dispose === dispose) window.__napHooks = null
  }

  // Thông báo nhỏ góc màn hình (background gửi sang khi không tự chèn script được)
  function toast (msg, kind) {
    if (window !== top) return
    let el = document.getElementById('__nap_toast')
    if (!el) {
      el = document.createElement('div')
      el.id = '__nap_toast'
      document.documentElement.append(el)
    }
    const color = kind === 'err' ? '#d93025' : kind === 'ok' ? '#188038' : '#333'
    el.style.cssText = `all:initial;position:fixed;right:20px;bottom:20px;z-index:2147483647;padding:10px 14px;border-radius:8px;font:14px/1.4 system-ui,sans-serif;color:#fff;background:${color};box-shadow:0 4px 12px rgba(0,0,0,.3);max-width:360px`
    el.textContent = msg
    clearTimeout(window.__napToastTimer)
    if (kind !== 'busy') window.__napToastTimer = setTimeout(() => el.remove(), kind === 'err' ? 6000 : 2500)
  }

  addEventListener('keydown', onKey, true)
  addEventListener('contextmenu', onContextMenu, true)
  chrome.runtime.onMessage.addListener(onMessage)
  window.__napHooks = { dispose }
})()
