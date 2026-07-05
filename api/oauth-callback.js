// /api/oauth-callback — Amy's server-side token exchange (mobile-safe)
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { code, state } = await parseBody(req);
    if (!code || !state) return res.status(400).json({ error: 'Missing code or state' });

    const clientId = process.env.DERIV_CLIENT_ID || "33ByqD0GecGTE5whirko8";
    const rec      = globalThis.__PKCE && globalThis.__PKCE.get(state);
    if (!rec) return res.status(400).json({ error: 'Invalid or expired session. Please log in again.' });

    const body = new URLSearchParams();
    body.set('grant_type',    'authorization_code');
    body.set('client_id',     clientId);
    body.set('code',          code);
    body.set('code_verifier', rec.code_verifier);
    body.set('redirect_uri',  rec.redirect_uri);

    try {
        const r = await fetch('https://auth.deriv.com/oauth2/token', {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body
        });
        const json = await r.json();
        if (!r.ok) return res.status(r.status).json({ error: json.error || 'Token exchange failed', hint: json.error_description || '' });

        globalThis.__PKCE.delete(state); // cleanup
        return res.status(200).json(json);
    } catch(err) {
        console.error('Token exchange error:', err);
        return res.status(500).json({ error: 'Server error during token exchange' });
    }
}

async function parseBody(req) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}