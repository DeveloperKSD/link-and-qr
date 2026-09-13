// POST /api/shorten
// Body: { url: string, slug?: string }
// Stores url -> slug mapping in Workers KV (binding name: LINKS)

function randomSlug(length = 6) {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

function isValidUrl(value) {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.LINKS) {
    return new Response(
      JSON.stringify({ error: 'KV namespace "LINKS" is not bound. See README.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { url, slug } = body || {}

  if (!url || !isValidUrl(url)) {
    return new Response(JSON.stringify({ error: 'Provide a valid http(s) URL.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let code = (slug || '').trim()

  if (code) {
    if (!/^[a-zA-Z0-9-_]{1,32}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: 'Custom code can only contain letters, numbers, - and _.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    const existing = await env.LINKS.get(code)
    if (existing) {
      return new Response(JSON.stringify({ error: 'That code is already taken.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  } else {
    // generate a unique random code, retrying on the rare collision
    for (let i = 0; i < 5; i++) {
      const candidate = randomSlug()
      const existing = await env.LINKS.get(candidate)
      if (!existing) {
        code = candidate
        break
      }
    }
    if (!code) {
      return new Response(JSON.stringify({ error: 'Could not allocate a code, try again.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  await env.LINKS.put(code, url)

  const origin = new URL(request.url).origin
  const shortUrl = `${origin}/${code}`

  return new Response(JSON.stringify({ shortUrl, code, url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
