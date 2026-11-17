// Chạy trong overlay.html (iframe của extension phủ lên trang). Hai chế độ:
//  - Có shot (Alt+Shift+S): kéo chọn vùng → khoanh (tuỳ chọn) → gõ nội dung → Enter gửi.
//  - Không shot (Alt+Shift+X): chỉ hiện ô nội dung, điền sẵn đoạn đang bôi đen → Enter gửi.
// Màn hình (tên, chữ tự do): chưa có → hiện ô nhập; bắt buộc khi Sheet không có cột "Link màn hình".
// Link màn hình: Sheet có cột này mà chưa có link → hiện ô nhập, bắt buộc là link lenful.com.
// Trả về null (huỷ) hoặc { content, screen, link, region: {x,y,w,h} | null, vw, shapes }.
window.__napOpen = window.__napOpen || function ({ shot = null, text = '', screen = '', link = '', hasLinkCol = false } = {}) {
  if (window.__napActive) return Promise.resolve(null)
  window.__napActive = true

  return new Promise((resolve) => {
    const TOOLS = [['rect', '▭ Khung'], ['ellipse', '◯ Tròn'], ['arrow', '➜ Mũi tên'], ['pen', '✎ Bút']]
    const capture = !!shot

    const host = document.createElement('div')
    host.style.cssText = 'all:initial;position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:2147483647;' +
      (capture ? 'cursor:crosshair' : '')
    const root = host.attachShadow({ mode: 'closed' })
    root.innerHTML = `<style>
      *{box-sizing:border-box;font:13px/1.5 system-ui,sans-serif}
      .bg{position:absolute;left:0;top:0;pointer-events:none;user-select:none}
      .dim{position:absolute;inset:0;background:rgba(0,0,0,.4)}
      .sel{position:absolute;display:none;outline:2px solid #4af;box-shadow:0 0 0 99999px rgba(0,0,0,.4)}
      canvas{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}
      .tip{position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;gap:4px;align-items:center;background:#111;color:#fff;padding:5px 8px;border-radius:6px;white-space:nowrap;cursor:default}
      .tip button{background:#333;color:#eee;border:1px solid #555;border-radius:4px;padding:2px 8px;cursor:pointer}
      .tip button.on{background:#e53935;border-color:#e53935;color:#fff}
      .bar{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);width:min(680px,calc(100vw - 32px));background:#fff;color:#222;border-radius:10px;padding:10px;box-shadow:0 8px 28px rgba(0,0,0,.4);cursor:default;display:none}
      .bar.show{display:block}
      .bar .head{font-weight:600;margin-bottom:4px}
      textarea{display:block;width:100%;min-height:64px;max-height:40vh;resize:vertical;padding:6px 8px;border:1px solid #ccc;border-radius:6px;font-size:14px;color:#222;background:#fff}
      .bar .foot{display:flex;justify-content:space-between;align-items:center;margin-top:6px;color:#666}
      .bar button{background:#1a3c8f;color:#fff;border:0;border-radius:6px;padding:6px 14px;cursor:pointer}
      .scr{margin-bottom:8px}
      .scr input{display:block;width:100%;padding:6px 8px;border:1px solid #ccc;border-radius:6px;font-size:14px;color:#222;background:#fff}
      .scr input.bad{border-color:#d93025;outline:1px solid #d93025}
      .scr .err{color:#d93025;min-height:0}
    </style>
    <img class="bg"><div class="dim"></div><div class="sel"><canvas></canvas></div>
    <div class="tip"></div>
    <div class="bar">
      <div class="scr s-name">
        <div class="head">Màn hình</div>
        <input class="screen" placeholder="VD: Tạo đơn, Danh sách sản phẩm…">
        <div class="err"></div>
      </div>
      <div class="scr s-link">
        <div class="head">Link màn hình</div>
        <input class="link" placeholder="VD: https://admin.lenful.com/orders">
        <div class="err"></div>
      </div>
      <div class="head">Nội dung phản ánh</div>
      <textarea placeholder="Mô tả vấn đề…"></textarea>
      <div class="foot"><span>Enter: gửi · Shift+Enter: xuống dòng · Esc: huỷ</span><button type="button" class="send">Gửi</button></div>
    </div>`

    const $ = (s) => root.querySelector(s)
    const bg = $('.bg')
    const dim = $('.dim')
    const sel = $('.sel')
    const canvas = $('canvas')
    const tip = $('.tip')
    const bar = $('.bar')
    const input = $('textarea')
    const screenInput = $('.screen')
    const linkInput = $('.link')
    // Tên màn hình không bắt buộc → không hỏi. Link màn hình bắt buộc → chưa có thì hỏi.
    const needScreen = false
    const needLink = !link
    if (!needScreen) $('.s-name').remove()
    if (!needLink) $('.s-link').remove()
    const fieldInputs = [input, screenInput, linkInput]
    const ctx = canvas.getContext('2d')
    const dpr = devicePixelRatio || 1

    input.value = text

    let region = null
    let shapes = []
    let lastAction = 'text' // 'shape' | 'text' — quyết định Ctrl+Z xoá hình hay hoàn tác chữ
    let drawing = null
    let start = null
    let tool = 'rect'

    if (capture) {
      // Hiện ảnh vừa chụp để màn hình đứng yên; trang chặn ảnh data: (CSP) thì thôi
      bg.onerror = () => bg.remove()
      bg.src = shot
      bg.style.width = innerWidth + 'px'
      bg.style.height = innerHeight + 'px'
    } else {
      bg.remove()
      tip.remove()
      dim.style.background = 'rgba(0,0,0,.2)'
      bar.classList.add('show')
    }

    function updateTip () {
      if (!capture) return
      if (!region) {
        tip.innerHTML = '<span>Kéo chọn vùng chụp · Enter: chọn cả màn hình · Esc: huỷ</span>'
        return
      }
      tip.innerHTML = '<span>Khoanh:</span>' +
        TOOLS.map(([t, label]) => `<button type="button" data-tool="${t}" class="${t === tool ? 'on' : ''}">${label}</button>`).join('') +
        '<button type="button" data-undo="1">↶ Hoàn tác</button>'
    }

    tip.addEventListener('click', (e) => {
      const b = e.target.closest('button')
      if (!b) return
      if (b.dataset.tool) tool = b.dataset.tool
      if (b.dataset.undo) { shapes.pop(); redraw() }
      updateTip()
      input.focus()
    })

    function redraw () {
      if (!region) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      shapes.forEach(s => napDrawShape(ctx, s, dpr))
      if (drawing) napDrawShape(ctx, drawing, dpr)
    }

    function showRegion () {
      dim.style.display = region ? 'none' : 'block'
      sel.style.display = region ? 'block' : 'none'
      bar.classList.toggle('show', !!region)
      if (!region) return
      Object.assign(sel.style, { left: region.x + 'px', top: region.y + 'px', width: region.w + 'px', height: region.h + 'px' })
      canvas.width = Math.round(region.w * dpr)
      canvas.height = Math.round(region.h * dpr)
      redraw()
    }

    function done (result) {
      removeEventListener('keydown', onKey, true)
      removeEventListener('keyup', block, true)
      removeEventListener('keypress', block, true)
      host.remove()
      window.__napActive = false
      resolve(result)
    }

    // Ô bắt buộc còn trống → focus vào đó trước, còn lại focus ô nội dung
    function focusFirst () {
      if (needScreen && !screenInput.value.trim()) screenInput.focus()
      else if (needLink && !linkInput.value.trim()) linkInput.focus()
      else input.focus()
    }

    function mark (el, msg) {
      el.nextElementSibling.textContent = msg
      el.classList.toggle('bad', !!msg)
      return !msg
    }

    function checkFields () {
      let first = null
      if (needScreen) {
        const ok = mark(screenInput, !hasLinkCol && !screenInput.value.trim() ? 'Nhập tên màn hình.' : '')
        if (!ok) first = first || screenInput
      }
      if (needLink) {
        const v = linkInput.value.trim()
        const ok = mark(linkInput, !v ? 'Nhập link màn hình.' : !/(^|[/.@])lenful\.com\b|^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(v) ? 'Link màn hình phải thuộc lenful.com hoặc localhost.' : '')
        if (!ok) first = first || linkInput
      }
      first?.focus()
      return !first
    }
    for (const el of [screenInput, linkInput]) el.addEventListener('input', () => mark(el, ''))

    const submit = () => {
      if (!checkFields()) return
      done({
        content: input.value.trim(),
        screen: needScreen ? screenInput.value.trim() : screen,
        link: needLink ? linkInput.value.trim() : link,
        region,
        vw: innerWidth,
        shapes
      })
    }

    function onKey (e) {
      // Chặn phím tắt của trang (Messenger…), nhưng vẫn cho gõ vào ô nội dung.
      // Shadow root dạng closed nên phải hỏi root.activeElement, composedPath() từ window không thấy bên trong.
      e.stopImmediatePropagation()
      const inInput = fieldInputs.includes(root.activeElement)
      if (e.key === 'Escape') { e.preventDefault(); return done(null) }
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault()
        if (capture && !region) {
          // Chưa chọn vùng: lấy cả màn hình, hiện ô nội dung để gõ trước khi gửi
          region = { x: 0, y: 0, w: innerWidth, h: innerHeight }
          showRegion()
          updateTip()
          focusFirst()
          return
        }
        return submit()
      }
      // Ctrl+Z: thao tác cuối là vẽ (hoặc không đang gõ) → xoá hình vừa vẽ; còn lại để ô chữ tự hoàn tác.
      // So cả e.code vì bộ gõ tiếng Việt / CapsLock có thể làm e.key khác 'z'.
      const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.code === 'KeyZ' || e.key.toLowerCase() === 'z')
      if (isUndo && shapes.length && (lastAction === 'shape' || !inInput)) {
        e.preventDefault()
        shapes.pop()
        redraw()
        return
      }
      if (!inInput) e.preventDefault()
    }
    // Gõ chữ sau khi vẽ → Ctrl+Z trả lại cho ô chữ
    for (const el of fieldInputs) el?.addEventListener('input', () => { lastAction = 'text' })
    // keyup/keypress cũng chặn để Messenger không cướp focus về ô chat của nó
    const block = (e) => e.stopImmediatePropagation()
    addEventListener('keydown', onKey, true)
    addEventListener('keyup', block, true)
    addEventListener('keypress', block, true)

    $('.send').addEventListener('click', submit)

    // Bấm vào ô nhập / thanh công cụ thì không tính là chọn vùng hay vẽ
    for (const el of [bar, tip]) {
      el.addEventListener('mousedown', (e) => {
        e.stopPropagation()
        // Bấm vào chỗ trống trong khung thì giữ focus ở ô nhập
        if (!fieldInputs.includes(e.target)) e.preventDefault()
      })
    }
    const inside = (p) => region && p.x >= region.x && p.y >= region.y && p.x <= region.x + region.w && p.y <= region.y + region.h

    host.addEventListener('mousedown', (e) => {
      if (!capture || e.button !== 0) return
      e.preventDefault()
      const p = { x: e.clientX, y: e.clientY }
      if (inside(p)) {
        const lx = p.x - region.x
        const ly = p.y - region.y
        drawing = { type: tool, x1: lx, y1: ly, x2: lx, y2: ly, points: [[lx, ly]] }
      } else {
        // Bấm ra ngoài vùng: chọn lại
        start = p
        region = null
        shapes = []
        showRegion()
        updateTip()
      }
    })

    host.addEventListener('mousemove', (e) => {
      if (drawing) {
        drawing.x2 = e.clientX - region.x
        drawing.y2 = e.clientY - region.y
        if (drawing.type === 'pen') drawing.points.push([drawing.x2, drawing.y2])
        redraw()
      } else if (start) {
        region = {
          x: Math.min(start.x, e.clientX),
          y: Math.min(start.y, e.clientY),
          w: Math.abs(e.clientX - start.x),
          h: Math.abs(e.clientY - start.y)
        }
        showRegion()
      }
    })

    host.addEventListener('mouseup', () => {
      if (drawing) {
        const s = drawing
        drawing = null
        const big = Math.abs(s.x2 - s.x1) > 3 || Math.abs(s.y2 - s.y1) > 3
        if (s.type === 'pen' ? s.points.length > 1 : big) { shapes.push(s); lastAction = 'shape' }
        redraw()
        input.focus()
      } else if (start) {
        start = null
        if (!region || region.w < 5 || region.h < 5) region = null
        showRegion()
        updateTip()
        if (region) focusFirst()
      }
    })

    updateTip()
    document.documentElement.append(host)
    if (!capture) {
      input.setSelectionRange(input.value.length, input.value.length)
      focusFirst()
    }
  })
}
