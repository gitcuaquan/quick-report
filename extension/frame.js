// Khởi động overlay trong iframe: lấy dữ liệu từ background, chờ người dùng xong, trả kết quả rồi đóng iframe.
(async () => {
  const id = new URLSearchParams(location.search).get('id')
  const opts = await chrome.runtime.sendMessage({ type: 'nap-get', id })
  window.focus()
  const result = opts ? await window.__napOpen(opts) : null
  await chrome.runtime.sendMessage({ type: 'nap-done', id, result }).catch(() => {})
  parent.postMessage({ napClose: id }, '*')
})()
