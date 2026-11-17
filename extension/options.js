const $ = (id) => document.getElementById(id)

function show (msg, ok = true) {
  $('status').textContent = msg
  $('status').className = ok ? 'ok' : 'err'
}

// tabs: [{ id, index, name }]. Lưu theo ID tab nên đổi tên / đổi thứ tự tab không ảnh hưởng.
function fillSheets (tabs, selectedId) {
  $('sheet').innerHTML = ''
  for (const t of tabs) {
    const opt = new Option(t.index ? `${t.index}. ${t.name}` : t.name, String(t.id ?? ''), false, String(t.id) === String(selectedId))
    opt.dataset.name = t.name
    $('sheet').add(opt)
  }
}

async function load () {
  const s = await getSettings()
  $('scriptUrl').value = s.scriptUrl || ''
  $('secret').value = s.secret || ''
  fillSheets(s.sheet ? [{ id: s.sheetId ?? '', name: s.sheet }] : [], s.sheetId ?? '')
}

$('connect').addEventListener('click', async () => {
  const scriptUrl = $('scriptUrl').value.trim()
  const secret = $('secret').value.trim()
  if (!scriptUrl || !secret) return show('Điền URL script và khoá bí mật trước.', false)
  show('Đang kết nối…')
  try {
    const data = await callScript(scriptUrl, { action: 'ping', secret })
    if (!data.tabs) return show('Script trên Sheet là bản cũ. Dán Code.gs mới và triển khai Phiên bản mới.', false)
    const { sheetId } = await chrome.storage.sync.get('sheetId')
    fillSheets(data.tabs, $('sheet').value || sheetId)
    show('Kết nối OK. Chọn tab của bạn rồi bấm Lưu.')
  } catch (e) {
    show(e.message, false)
  }
})

$('save').addEventListener('click', async () => {
  const opt = $('sheet').selectedOptions[0]
  const settings = {
    scriptUrl: $('scriptUrl').value.trim(),
    secret: $('secret').value.trim(),
    sheet: opt?.dataset.name || '',
    sheetId: opt && opt.value !== '' ? Number(opt.value) : null
  }
  if (!settings.scriptUrl || !settings.secret) return show('Thiếu URL script hoặc khoá bí mật.', false)
  if (settings.sheetId === null) return show('Bấm "Kết nối" rồi chọn tab của bạn.', false)
  await chrome.storage.sync.set(settings)
  show('Đã lưu.')
})

load()
