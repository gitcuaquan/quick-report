// Dùng chung cho options.js và background.js
const ERRORS = {
  unauthorized: 'Sai khoá bí mật.',
  no_sheet: 'Không tìm thấy tab trong Sheet. Mở cài đặt chọn lại tab.',
  no_header: 'Không tìm thấy dòng tiêu đề trong tab.',
  no_link: 'Thiếu link màn hình (lenful.com hoặc localhost).'
}

// Repo GitHub chứa extension (public) — dùng để kiểm tra bản mới
const REPO = 'gitcuaquan/quick-report'
const REMOTE_MANIFEST = `https://raw.githubusercontent.com/${REPO}/main/extension/manifest.json`

// a > b theo kiểu 2.6.10 > 2.6.9
function isNewer (a, b) {
  const pa = String(a || '').split('.').map(Number)
  const pb = String(b || '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0)
  }
  return false
}

// Key cố định, không cho người dùng đổi
const IMGBB_KEY = 'c3d9288f860aa0514ebdaa2f643a46d5'

async function getSettings () {
  // sheetId = ID tab (gid), sheet = tên tab lúc chọn (chỉ để hiển thị / dự phòng)
  const s = await chrome.storage.sync.get(['scriptUrl', 'secret', 'sheet', 'sheetId'])
  return { ...s, imgbbKey: IMGBB_KEY }
}

// img = { kind: 'blob', data: Blob } | { kind: 'data', data: 'data:image/...;base64,...' } | { kind: 'url', data: 'https://...' }
// Trả về link ảnh trên imgbb. Ảnh lưu VĨNH VIỄN: không gửi tham số "expiration"
// (imgbb chỉ tự xoá khi có expiration, hoặc tài khoản bật "Auto delete").
// Nếu imgbb vẫn trả về thời hạn xoá → lastImgbbExpiration > 0 để background cảnh báo.
let lastImgbbExpiration = 0
async function uploadToImgbb (img, key) {
  lastImgbbExpiration = 0
  const form = new FormData()
  form.append('key', key)
  if (img.kind === 'blob') form.append('image', img.data, 'screenshot.jpg')
  else if (img.kind === 'data') form.append('image', String(img.data).replace(/^data:[^,]+,/, ''))
  else form.append('image', img.data)
  let res
  try {
    res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form })
  } catch (e) {
    throw new Error('Không kết nối được imgbb. Kiểm tra mạng.')
  }
  const data = await res.json().catch(() => null)
  if (!data?.success) throw new Error(`Upload ảnh thất bại: ${data?.error?.message || `HTTP ${res.status}`}`)
  lastImgbbExpiration = Number(data.data.expiration) || 0 // giây; 0 = không bao giờ xoá
  return data.data.url
}

async function callScript (scriptUrl, payload) {
  let res
  try {
    res = await fetch(scriptUrl, {
      method: 'POST',
      // text/plain để Apps Script nhận body mà không cần CORS preflight
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
  } catch (e) {
    throw new Error('Không gọi được script. Kiểm tra URL hoặc mạng.')
  }
  const data = await res.json().catch(() => null)
  if (!data) throw new Error(`Script trả về lỗi (HTTP ${res.status}). Kiểm tra URL.`)
  if (!data.ok) {
    const msg = ERRORS[data.error] || `Lỗi: ${data.error}`
    throw new Error(data.detail ? `${msg} ${data.detail}` : msg)
  }
  return data
}
