export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

/** Keeps a full window inside a work area, preferring the requested corner. */
export function clampToArea(bounds: Rect, area: Rect, gap = 0): Point {
  const maxX = Math.max(area.x, area.x + area.width - bounds.width - gap)
  const maxY = Math.max(area.y, area.y + area.height - bounds.height - gap)
  return {
    x: Math.min(maxX, Math.max(area.x + gap, Math.round(bounds.x))),
    y: Math.min(maxY, Math.max(area.y + gap, Math.round(bounds.y))),
  }
}

/**
 * Gently pulls a window flush to a work-area edge once it is released within
 * `threshold` pixels of it. Both axes snap, so corners work too. The snap is
 * intentionally small: it should feel like a magnet, not a grid.
 */
export function snapToArea(bounds: Rect, area: Rect, threshold = 14): Point {
  const left = area.x
  const right = area.x + area.width - bounds.width
  const top = area.y
  const bottom = area.y + area.height - bounds.height

  let x = Math.round(bounds.x)
  let y = Math.round(bounds.y)

  if (Math.abs(x - left) <= threshold) x = left
  else if (Math.abs(x - right) <= threshold) x = right

  if (Math.abs(y - top) <= threshold) y = top
  else if (Math.abs(y - bottom) <= threshold) y = bottom

  return { x, y }
}
