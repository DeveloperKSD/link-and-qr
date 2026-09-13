// GET /:code  -> 302 redirect to the stored long URL.
// Cloudflare Pages serves real static files first; this only runs
// for paths that don't match an actual file in your build output.

export async function onRequestGet({ params, env }) {
  const { code } = params

  if (!env.LINKS) {
    return new Response('Shortener storage (KV) is not configured.', { status: 500 })
  }

  const longUrl = await env.LINKS.get(code)

  if (!longUrl) {
    return new Response('No link found for this code.', { status: 404 })
  }

  return Response.redirect(longUrl, 302)
}
