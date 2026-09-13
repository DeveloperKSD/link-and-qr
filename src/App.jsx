import { useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

function isValidUrl(value) {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export default function App() {
  const [longUrl, setLongUrl] = useState('')
  const [slug, setSlug] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [error, setError] = useState('')
  const [shortUrl, setShortUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const qrWrapRef = useRef(null)

  async function handleGenerate(e) {
    e.preventDefault()
    setCopied(false)

    if (!isValidUrl(longUrl.trim())) {
      setStatus('error')
      setError("That doesn't look like a full link. Include https://")
      return
    }

    setStatus('loading')
    setError('')

    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: longUrl.trim(), slug: slug.trim() || undefined }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not create that short link.')
      }

      const data = await res.json()
      setShortUrl(data.shortUrl)
      setStatus('ready')
    } catch (err) {
      setStatus('error')
      setError(
        err.message === 'Failed to fetch'
          ? 'No shortener backend found. Deploy to Cloudflare Pages, or see README for local dev.'
          : err.message
      )
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shortUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }

  function handleDownload() {
    const svg = qrWrapRef.current?.querySelector('svg')
    if (!svg) return
    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svg)
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = 8
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#EEF0E9'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)

      const pngUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = 'link-ticket.png'
      a.click()
    }
    img.src = url
  }

  function reset() {
    setLongUrl('')
    setSlug('')
    setShortUrl('')
    setStatus('idle')
    setError('')
    setCopied(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        <header className="mb-8 text-center">
          <p className="font-mono-ticket text-xs tracking-[0.15em] text-[var(--ink-soft)]">
            NO. 002 &middot; ISSUED CLIENT-SIDE
          </p>
          <h1 className="font-mono-ticket text-4xl sm:text-5xl font-extrabold tracking-tight mt-2">
            LINK TICKET
          </h1>
          <p className="mt-3 text-[var(--ink-soft)] max-w-sm mx-auto">
            Paste a link. Get a short address and a printable code for it, boarding-pass style.
          </p>
        </header>

        <div className="perf-edge pl-8 pr-1">
          <div className="bg-[var(--paper-edge)] rounded-sm shadow-[0_1px_0_rgba(27,46,40,0.08)] p-1">
            <div className="relative bg-[var(--paper)] border border-[var(--line)] p-6 sm:p-8">

              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label htmlFor="url" className="block font-mono-ticket text-xs text-[var(--ink-soft)] mb-1">
                    destination
                  </label>
                  <input
                    id="url"
                    type="text"
                    inputMode="url"
                    placeholder="https://example.com/your-very-long-link"
                    value={longUrl}
                    onChange={(e) => setLongUrl(e.target.value)}
                    className="w-full bg-transparent border-b-2 border-[var(--ink)] py-2 font-mono-ticket text-sm sm:text-base outline-none placeholder:text-[var(--ink-soft)]/50 focus:border-[var(--stamp-blue)] transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="slug" className="block font-mono-ticket text-xs text-[var(--ink-soft)] mb-1">
                    custom code (optional)
                  </label>
                  <div className="flex items-baseline gap-1 font-mono-ticket text-sm text-[var(--ink-soft)]">
                    <span>/</span>
                    <input
                      id="slug"
                      type="text"
                      placeholder="e.g. launch"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                      className="w-full bg-transparent border-b border-[var(--line)] py-1.5 outline-none placeholder:text-[var(--ink-soft)]/40 focus:border-[var(--stamp-blue)] transition-colors text-[var(--ink)]"
                    />
                  </div>
                </div>

                {status === 'error' && (
                  <p className="text-sm text-[var(--stamp-red)] font-mono-ticket">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full mt-2 font-mono-ticket text-sm tracking-wide py-3 bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--stamp-blue)] transition-colors disabled:opacity-60"
                >
                  {status === 'loading' ? 'ISSUING...' : 'ISSUE TICKET'}
                </button>
              </form>

              {status === 'ready' && (
                <>
                  <hr className="stub-divider my-6" />

                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div
                      ref={qrWrapRef}
                      className="bg-white p-3 border border-[var(--line)] shrink-0"
                    >
                      <QRCodeSVG value={shortUrl} size={128} bgColor="#ffffff" fgColor="#1B2E28" />
                    </div>

                    <div className="flex-1 w-full text-center sm:text-left">
                      <p className="font-mono-ticket text-xs text-[var(--ink-soft)] mb-1">your short link</p>
                      <p className="font-mono-ticket text-lg break-all">{shortUrl}</p>

                      <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-3">
                        <button
                          onClick={handleCopy}
                          className="font-mono-ticket text-xs px-3 py-2 border border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
                        >
                          {copied ? 'COPIED' : 'COPY LINK'}
                        </button>
                        <button
                          onClick={handleDownload}
                          className="font-mono-ticket text-xs px-3 py-2 border border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] transition-colors"
                        >
                          DOWNLOAD PNG
                        </button>
                        <button
                          onClick={reset}
                          className="font-mono-ticket text-xs px-3 py-2 text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
                        >
                          NEW TICKET
                        </button>
                      </div>
                    </div>

                    <div className="stamp-anim absolute right-6 top-6 sm:static sm:rotate-[-8deg] hidden sm:block">
                      <span className="font-mono-ticket text-[10px] tracking-widest border-2 border-[var(--stamp-red)] text-[var(--stamp-red)] px-2 py-1 rotate-[-8deg] inline-block">
                        READY TO SCAN
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--ink-soft)] mt-6 font-mono-ticket">
          runs entirely on Cloudflare Pages &middot; no server to manage
        </p>
      </div>
    </div>
  )
}
