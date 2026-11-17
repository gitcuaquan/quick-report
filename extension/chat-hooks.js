// Chạy sẵn trên các trang chat (Telegram, Messenger, Zalo), ở document_start để đăng ký trước script của trang.
(() => {
  if (window.__napHooks) return
  window.__napHooks = true

  // Alt+Shift+X: lưu nhanh đoạn đang bôi đen. Tự bắt phím ở đây vì Chrome có thể không gán được
  // phím tắt của extension (trùng với extension/chương trình khác).
  // Nếu Chrome đã gán phím này thì trình duyệt xử lý trước, trang không nhận được → không gửi trùng.
  addEventListener('keydown', (e) => {
    if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey || e.code !== 'KeyX' || e.repeat) return
    e.preventDefault()
    e.stopImmediatePropagation()
    chrome.runtime.sendMessage({ type: 'nap-quick', text: getSelection().toString() }).catch(() => {
      toast('Extension vừa được cập nhật. Tải lại trang (F5) rồi thử lại.', 'err')
    })
  }, true)

  // Telegram tự vẽ menu chuột phải nên menu Chrome (có "Nạp vào sheet") không hiện.
  // Đang bôi đen chữ → chặn handler của trang để menu Chrome hiện. Không bôi đen → menu Telegram như cũ.
  if (location.hostname === 'web.telegram.org') {
    addEventListener('contextmenu', (e) => {
      if (getSelection().toString().trim()) e.stopImmediatePropagation()
    }, true)
  }

  // Thông báo nhỏ góc màn hình (background gửi sang khi không tự chèn script được)
  function toast (msg, kind) {
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

  chrome.runtime.onMessage.addListener((m) => {
    if (m?.type === 'nap-toast') toast(m.msg, m.kind)
  })
})()
