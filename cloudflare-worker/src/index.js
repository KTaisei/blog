/**
 * Decap CMS GitHub OAuth proxy for Cloudflare Workers.
 * Required secrets: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, ALLOWED_GITHUB_LOGIN
 */
const githubHeaders = { Accept: 'application/json', 'User-Agent': 'decap-cms-oauth-worker' };

function html(body, status = 200) {
  return new Response(`<!doctype html><html><body><script>${body}</script></body></html>`, { status, headers: { 'content-type': 'text/html; charset=UTF-8', 'cache-control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors() });
    if (url.pathname === '/auth') {
      const state = crypto.randomUUID();
      const authorize = new URL('https://github.com/login/oauth/authorize');
      authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      authorize.searchParams.set('redirect_uri', `${url.origin}/callback`);
      authorize.searchParams.set('scope', 'repo');
      authorize.searchParams.set('state', state);
      // A short-lived, HttpOnly cookie prevents a cross-site callback from being accepted.
      return new Response(null, { status: 302, headers: { Location: authorize.toString(), 'Set-Cookie': `decap_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/callback; Max-Age=600` } });
    }
    if (url.pathname === '/callback') {
      const state = url.searchParams.get('state');
      const cookieState = request.headers.get('Cookie')?.match(/(?:^|; )decap_oauth_state=([^;]+)/)?.[1];
      const code = url.searchParams.get('code');
      if (!code || !state || state !== cookieState) return html(`window.opener?.postMessage('authorization:github:error:Invalid OAuth state','*');window.close();`, 400);
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { ...githubHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${url.origin}/callback` }) });
      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) return html(`window.opener?.postMessage('authorization:github:error:GitHub token exchange failed','*');window.close();`, 502);
      const userResponse = await fetch('https://api.github.com/user', { headers: { ...githubHeaders, Authorization: `Bearer ${tokenData.access_token}` } });
      const user = await userResponse.json();
      if (user.login?.toLowerCase() !== env.ALLOWED_GITHUB_LOGIN?.toLowerCase()) return html(`window.opener?.postMessage('authorization:github:error:This GitHub account is not allowed','*');window.close();`, 403);
      // Decap CMS reads this exact message format from the OAuth popup.
      const payload = JSON.stringify(`authorization:github:success:${tokenData.access_token}`);
      return new Response(`<!doctype html><html><body><script>window.opener&&window.opener.postMessage(${payload},'*');window.close()</script></body></html>`, { headers: { 'content-type': 'text/html; charset=UTF-8', 'Set-Cookie': 'decap_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/callback; Max-Age=0', 'cache-control': 'no-store' } });
    }
    return new Response('Not found', { status: 404, headers: cors() });
  }
};
function cors() { return { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS' }; }
