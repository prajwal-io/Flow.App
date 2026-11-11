/**
 * Site blocking — the pure parts. Flow manages a marked region in the Windows
 * hosts file so blocked domains fail during running focus in every browser
 * (Chrome, Edge, Firefox, Brave, Opera — all honour the system hosts file).
 * The region is written only while a focus is actually running.
 */

export const BLOCK_BEGIN = '# BEGIN Flow focus block'
export const BLOCK_END = '# END Flow focus block'

/** One entry per hostname, plus the www alias browsers try first. */
const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

/**
 * Normalizes whatever the user typed into clean hostnames:
 * lowercased, scheme/path/star/www stripped, validated, deduped, capped.
 */
export function parseSites(input: string[]): string[] {
  const out: string[] = []
  for (const raw of input) {
    if (typeof raw !== 'string' || out.length >= 50) continue
    let host = raw.trim().toLowerCase()
    host = host.replace(/^[a-z]+:\/\//, '') // scheme
    host = host.split('/')[0] // path
    host = host.split('?')[0] // query
    host = host.replace(/^\*\.|^www\./, '') // wildcard / www alias
    host = host.replace(/\.$/, '') // trailing dot
    if (!DOMAIN_RE.test(host)) continue
    if (!out.includes(host)) out.push(host)
  }
  return out
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Removes any existing Flow block region from hosts content. */
export function stripBlock(content: string): string {
  const re = new RegExp(
    `^[ \\t]*${escapeRegExp(BLOCK_BEGIN)}[\\s\\S]*?^[ \\t]*${escapeRegExp(BLOCK_END)}[ \\t]*\\r?\\n?`,
    'm',
  )
  return content.replace(re, '')
}

/** Renders the hosts file with the Flow region set to exactly `sites` (none = removed). */
export function renderBlock(content: string, sites: string[]): string {
  const hosts = parseSites(sites)
  const stripped = stripBlock(content)
  if (hosts.length === 0) return stripped

  const lines: string[] = [BLOCK_BEGIN]
  for (const host of hosts) {
    lines.push(`0.0.0.0 ${host}`)
    lines.push(`0.0.0.0 www.${host}`)
  }
  lines.push(BLOCK_END)

  const body = stripped.length === 0 || stripped.endsWith('\n') ? stripped : `${stripped}\n`
  return `${body}${lines.join('\n')}\n`
}

/** True when the content currently carries the Flow region. */
export function hasBlock(content: string): boolean {
  return content.includes(BLOCK_BEGIN)
}
