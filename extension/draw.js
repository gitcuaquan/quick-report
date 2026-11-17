// Vẽ một hình chú thích. Dùng chung cho overlay (xem trước) và background (ảnh gửi đi).
// Toạ độ của hình tính theo CSS px trong vùng chụp; k = số pixel ảnh trên 1 CSS px.
function napDrawShape (ctx, s, k) {
  ctx.save()
  ctx.strokeStyle = '#e53935'
  ctx.fillStyle = '#e53935'
  ctx.lineWidth = 3 * k
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const x1 = s.x1 * k
  const y1 = s.y1 * k
  const x2 = s.x2 * k
  const y2 = s.y2 * k
  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  const w = Math.abs(x2 - x1)
  const h = Math.abs(y2 - y1)

  if (s.type === 'rect') {
    ctx.strokeRect(x, y, w, h)
  } else if (s.type === 'ellipse') {
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (s.type === 'arrow') {
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const head = 16 * k
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2 - Math.cos(angle) * head * 0.8, y2 - Math.sin(angle) * head * 0.8)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 7), y2 - head * Math.sin(angle - Math.PI / 7))
    ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 7), y2 - head * Math.sin(angle + Math.PI / 7))
    ctx.closePath()
    ctx.fill()
  } else if (s.type === 'pen') {
    ctx.beginPath()
    s.points.forEach(([px, py], i) => (i ? ctx.lineTo(px * k, py * k) : ctx.moveTo(px * k, py * k)))
    ctx.stroke()
  }
  ctx.restore()
}
