importScripts('api.js', 'draw.js')

const MENU_ID = 'nap-vao-sheet'

// ---------- Cập nhật ----------
// 1. Mỗi 30 phút hỏi GitHub version mới nhất → có bản mới thì icon hiện "NEW".
// 2. Người dùng bấm đúp cap-nhat.bat → file mới được chép đè vào thư mục extension.
// 3. Mỗi phút so manifest.json trên đĩa với bản đang chạy → khác thì tự reload.
let busy = 0 // đang gửi thì chưa reload

async function checkDiskUpdate () {
  if (busy) return
  try {
    const res = await fetch(chrome.runtime.getURL('manifest.json'), { cache: 'no-store' })
    const disk = (await res.json()).version
    if (disk && disk !== chrome.runtime.getManifest().version) chrome.runtime.reload()
  } catch (e) {
    // File đang được ghi dở → lần sau kiểm tra lại
  }
}

async function checkRemoteUpdate () {
  try {
    const res = await fetch(`${REMOTE_MANIFEST}?t=${Date.now()}`, { cache: 'no-store' })
    const latest = (await res.json()).version
    const hasUpdate = isNewer(latest, chrome.runtime.getManifest().version)
    await chrome.storage.local.set({ latestVersion: hasUpdate ? latest : '' })
    chrome.action.setBadgeBackgroundColor({ color: '#e53935' })
    chrome.action.setBadgeText({ text: hasUpdate ? 'NEW' : '' })
    chrome.action.setTitle({
      title: hasUpdate
        ? `Có bản mới v${latest} — bấm đúp cap-nhat.bat trong thư mục extension`
        : 'Nạp vào sheet (chụp màn hình trang này)'
    })
  } catch (e) {
    // Mất mạng / GitHub lỗi → lần sau
  }
}

chrome.alarms.create('check-disk', { periodInMinutes: 1 })
chrome.alarms.create('check-remote', { periodInMinutes: 30 })
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === 'check-disk') checkDiskUpdate()
  if (a.name === 'check-remote') checkRemoteUpdate()
})
chrome.runtime.onStartup.addListener(() => { checkDiskUpdate(); checkRemoteUpdate() })
chrome.runtime.onInstalled.addListener(checkRemoteUpdate)

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_ID, title: 'Nạp vào sheet', contexts: ['selection', 'image', 'page'] })
  })
  injectHooksIntoOpenTabs()
})

// Cài mới / reload / tự cập nhật: chèn bộ bắt phím vào mọi tab đang mở → không cần F5.
// (content_scripts chỉ tự chạy ở trang mở SAU khi cài)
async function injectHooksIntoOpenTabs () {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] })
  for (const t of tabs) {
    chrome.scripting.executeScript({ target: { tabId: t.id, allFrames: true }, files: ['chat-hooks.js'] }).catch(() => {})
  }
}

// Tiêu đề tab Messenger có dạng "(3) Tên người | Messenger" — bỏ phần thừa để lấy tên hội thoại.
function conversationName (title = '') {
  return title
    .replace(/^\(\d+\)\s*/, '')
    .replace(/\s*[|·-]\s*(Messenger|Facebook)\s*$/i, '')
    .replace(/^(Messenger|Facebook)$/i, '')
    .trim()
}

// Trang chat → lấy tên hội thoại làm "Thông tin Seller"
function isChatUrl (url = '') {
  return /^https:\/\/([a-z0-9-]+\.)?(messenger\.com|facebook\.com\/messages|zalo\.me|chat\.zalo\.me|web\.telegram\.org)/i.test(url)
}

// Cột "Link màn hình" chỉ nhận link của app: lenful.com hoặc localhost (môi trường dev)
const isLenful = (s = '') => /(^|[/.@])lenful\.com\b|^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(s)

// Tab đang mở là màn hình app (lenful.com / localhost)?
function isAppTab (tab) {
  try {
    const host = new URL(tab.url).hostname
    return /(^|\.)lenful\.com$/i.test(host) || host === 'localhost' || host === '127.0.0.1'
  } catch (e) {
    return false
  }
}

// Tìm link màn hình: tab đang ở app → link tab; không thì link app trong đoạn bôi đen; không có → ''
function findLink (tab, text = '') {
  if (isAppTab(tab)) return tab.url
  const urls = text.match(/\b(?:https?:\/\/)?(?:(?:[a-z0-9-]+\.)*lenful\.com|localhost:\d+|127\.0\.0\.1:\d+)\S*/gi) || []
  return urls[0]?.replace(/[)\]}>.,;:!?'"]+$/, '') || ''
}

// Tab trong Sheet có cột "Link màn hình" không? Hỏi Apps Script, nhớ 5 phút.
async function hasLinkColumn () {
  const s = await getSettings()
  if (!s.scriptUrl || !s.secret || !s.sheet) return false
  const key = `meta:${s.sheetId ?? s.sheet}`
  const cached = (await chrome.storage.session.get(key))[key]
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.hasLinkCol
  try {
    const meta = await callScript(s.scriptUrl, { action: 'meta', secret: s.secret, sheet: s.sheet, sheetId: s.sheetId })
    const hasLinkCol = !!meta.hasScreenLink
    await chrome.storage.session.set({ [key]: { hasLinkCol, at: Date.now() } })
    return hasLinkCol
  } catch (e) {
    return false // lỗi mạng / script cũ → coi như không có cột, lúc gửi sẽ báo lỗi thật nếu có
  }
}

// { screen, link, hasLinkCol }
//  - Link màn hình: bắt buộc, tự tìm (tab app / link trong đoạn bôi đen), không có thì bắt nhập.
//  - Màn hình (tên): không bắt buộc; đang ở trang app thì lấy tiêu đề tab, không thì để trống.
async function screenInfo (tab, text) {
  const link = findLink(tab, text)
  const title = isAppTab(tab) ? (tab.title || '').trim() : ''
  const hasLinkCol = await hasLinkColumn()
  return { screen: title, link, hasLinkCol }
}

// Thiếu link màn hình → phải hiện ô nhập
const missingScreen = (i) => !i.link

// ---------- Thông báo nhỏ góc màn hình ----------

// Chạy trong trang (được inject) — không dùng biến bên ngoài
function toastInPage (msg, kind) {
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

async function toast (tabId, msg, kind = 'busy') {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, func: toastInPage, args: [msg, kind] })
  } catch (e) {
    // Chưa có quyền chèn (VD bấm phím tắt qua content script): nhờ content script hiện thông báo
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'nap-toast', msg, kind })
      return
    } catch (e2) {}
    // Trang không cho chèn script — báo qua icon extension
    chrome.action.setBadgeBackgroundColor({ color: kind === 'err' ? '#d93025' : '#188038' })
    chrome.action.setBadgeText({ text: kind === 'err' ? '!' : kind === 'ok' ? '✓' : '…' })
    if (kind !== 'busy') setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000)
  }
}

// ---------- Lấy dữ liệu từ trang ----------

async function getSelectionText (tabId) {
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: () => getSelection().toString() })
    return res?.result || ''
  } catch (e) {
    return ''
  }
}

// ---------- Overlay (iframe của extension phủ lên trang) ----------
// Overlay nằm trong iframe nên trang (Telegram, Messenger…) không cướp được phím/focus.
// Trạng thái chờ lưu ở storage.session vì service worker có thể bị tắt trong lúc người dùng đang khoanh.

// Chạy trong trang (được inject) — không dùng biến bên ngoài
function mountFrame (id, src) {
  if (document.querySelector('iframe[data-nap]')) return false // đang mở rồi
  const f = document.createElement('iframe')
  f.dataset.nap = id
  f.src = src
  f.style.cssText = 'all:initial;position:fixed;left:0;top:0;width:100vw;height:100vh;border:0;margin:0;padding:0;' +
    'z-index:2147483647;background:transparent;color-scheme:normal'
  const onMsg = (e) => {
    if (e.source !== f.contentWindow || e.data?.napClose !== id) return
    removeEventListener('message', onMsg)
    f.remove()
  }
  addEventListener('message', onMsg)
  document.documentElement.append(f)
  f.focus()
  return true
}

// next: { mode: 'capture' } | { mode: 'ask', image }
// Trả về false nếu trang không cho chèn (chrome://, Web Store…)
async function openOverlay (tab, opts, next) {
  const id = crypto.randomUUID()
  const key = `nap:${id}`
  await chrome.storage.session.set({
    [key]: { opts, next, tab: { id: tab.id, url: tab.url || '', title: tab.title || '' } }
  })
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: mountFrame,
      args: [id, chrome.runtime.getURL(`overlay.html?id=${id}`)]
    })
    if (res?.result === false) chrome.storage.session.remove(key)
    return true
  } catch (e) {
    chrome.storage.session.remove(key)
    return false
  }
}

// result: null (huỷ) | { content, screen, link, region, vw, shapes }
async function finishOverlay (id, result) {
  const key = `nap:${id}`
  const state = (await chrome.storage.session.get(key))[key]
  chrome.storage.session.remove(key)
  if (!state || !result) return
  const { tab, opts, next } = state
  const screen = result.screen || opts.screen || ''
  const link = result.link || opts.link || ''
  if (next.mode === 'capture') {
    const blob = await renderImage(opts.shot, result)
    send(tab, { text: result.content, screen, link, image: { kind: 'blob', data: blob } })
  } else {
    send(tab, { text: result.content, screen, link, image: next.image })
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Phím tắt bắt trong trang (chat-hooks.js) — không phụ thuộc chrome://extensions/shortcuts
  if (msg?.type === 'nap-quick' && sender.tab) {
    quickSend(sender.tab, String(msg.text || '').trim())
    return
  }
  if (msg?.type === 'nap-capture' && sender.tab) {
    captureAndSend(sender.tab)
    return
  }
  if (msg?.type === 'nap-get') {
    const key = `nap:${msg.id}`
    chrome.storage.session.get(key).then((r) => sendResponse(r[key]?.opts ?? null))
    return true
  }
  if (msg?.type === 'nap-done') {
    sendResponse(true)
    finishOverlay(msg.id, msg.result)
  }
})

// Ghép vùng đã chọn + hình khoanh thành ảnh JPEG (Blob)
async function renderImage (shot, result) {
  const bmp = await createImageBitmap(await (await fetch(shot)).blob())
  const k = result.vw ? bmp.width / result.vw : 1 // pixel ảnh trên 1 CSS px
  const r = result.region || { x: 0, y: 0, w: bmp.width / k, h: bmp.height / k }
  const canvas = new OffscreenCanvas(Math.round(r.w * k), Math.round(r.h * k))
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bmp, r.x * k, r.y * k, r.w * k, r.h * k, 0, 0, canvas.width, canvas.height)
  result.shapes.forEach(s => napDrawShape(ctx, s, k))
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
}

// ---------- Gửi ----------

async function send (tab, { text = '', image = null, screen = '', link = '' }) {
  const settings = await getSettings()
  if (!settings.scriptUrl || !settings.secret || !settings.sheet) {
    await toast(tab.id, 'Chưa cài đặt extension. Điền URL, khoá và chọn tab.', 'err')
    chrome.runtime.openOptionsPage()
    return
  }
  if (!text && !image) return toast(tab.id, 'Chưa bôi đen đoạn chat nào.', 'err')

  busy++
  try {
    const images = []
    let expireWarn = ''
    if (image) {
      await toast(tab.id, 'Đang upload ảnh…')
      images.push(await uploadToImgbb(image, settings.imgbbKey))
      // Ảnh phải lưu vĩnh viễn. imgbb vẫn đặt hạn xoá → tài khoản đang bật "Auto delete"
      if (lastImgbbExpiration > 0) {
        expireWarn = ` · ⚠ Ảnh sẽ bị imgbb xoá sau ${Math.ceil(lastImgbbExpiration / 86400)} ngày — tắt "Auto delete" trong tài khoản imgbb`
      }
    }
    await toast(tab.id, 'Đang gửi…')
    const data = await callScript(settings.scriptUrl, {
      action: 'append',
      secret: settings.secret,
      sheet: settings.sheet,
      sheetId: settings.sheetId,
      fields: {
        channel: tab.url || '', // luôn ghi link trang đang mở
        ...(isChatUrl(tab.url) ? { seller: conversationName(tab.title) } : {}),
        screen,
        screenLink: isLenful(link) ? link : '',
        content: text,
        images
      }
    })
    const { latestVersion } = await chrome.storage.local.get('latestVersion')
    const note = latestVersion ? ` · Có bản mới v${latestVersion}: bấm đúp cap-nhat.bat` : ''
    await toast(tab.id, `✓ Đã nạp vào "${data.sheet || settings.sheet}" (dòng ${data.row})${expireWarn}${note}`, expireWarn ? 'err' : 'ok')
  } catch (e) {
    await toast(tab.id, e.message, 'err')
  } finally {
    busy--
  }
}

// Alt+Shift+S / bấm icon: chọn vùng chụp + nhập nội dung (điền sẵn đoạn đang bôi đen)
async function captureAndSend (tab) {
  const text = await getSelectionText(tab.id)
  let shot
  try {
    shot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 92 })
  } catch (e) {
    return toast(tab.id, 'Không chụp được trang này.', 'err')
  }
  const info = await screenInfo(tab, text)
  if (await openOverlay(tab, { shot, text, ...info }, { mode: 'capture' })) return
  // Không chèn được → gửi cả màn hình
  const blob = await renderImage(shot, { content: text, region: null, vw: null, shapes: [] })
  send(tab, { text, ...info, image: { kind: 'blob', data: blob } })
}

// Chuột phải: ô nhập nội dung (điền sẵn đoạn bôi đen), kèm ảnh nếu chuột phải vào ảnh
async function askAndSend (tab, text, image = null) {
  const info = await screenInfo(tab, text)
  if (await openOverlay(tab, { text, ...info }, { mode: 'ask', image })) return
  send(tab, { text, ...info, image })
}

// Lưu nhanh (Alt+Shift+X): đủ thông tin màn hình thì gửi luôn, thiếu thì hiện ô nhập
async function quickSend (tab, text) {
  if (!text) return toast(tab.id, 'Chưa bôi đen đoạn chat nào.', 'err')
  const info = await screenInfo(tab, text)
  if (!missingScreen(info)) return send(tab, { text, ...info })
  if (await openOverlay(tab, { text, ...info }, { mode: 'ask', image: null })) return
  // Không mở được ô nhập link → báo rõ, không gửi dòng thiếu link (Sheet sẽ từ chối)
  toast(tab.id, 'Không mở được ô nhập link màn hình trên trang này. Bôi đen kèm link lenful.com/localhost, hoặc dùng chuột phải → Nạp vào sheet.', 'err')
}

chrome.action.onClicked.addListener(captureAndSend)

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'send-text') return
  if (!tab) [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab) quickSend(tab, (await getSelectionText(tab.id)).trim())
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab) return
  if (info.mediaType === 'image' && info.srcUrl && /^https?:/.test(info.srcUrl)) {
    askAndSend(tab, info.selectionText || '', { kind: 'url', data: info.srcUrl })
  } else if (info.selectionText) {
    askAndSend(tab, info.selectionText)
  } else {
    captureAndSend(tab)
  }
})
