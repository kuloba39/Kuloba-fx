// /api/deriv-token.js
// Vercel serverless function — PKCE token exchange (never expose this in browser)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const { code, code_verifier, redirect_uri, client_id } = req.body || {};
        if (!code || !code_verifier || !redirect_uri || !client_id) {
            return res.status(400).json({ error: 'Missing fields: code, code_verifier, redirect_uri, client_id' });
        }
        const params = new URLSearchParams();
        params.set('grant_type',    'authorization_code');
        params.set('client_id',     client_id);
        params.set('code',          code);
        params.set('code_verifier', code_verifier);
        params.set('redirect_uri',  redirect_uri);

        const r = await fetch('https://auth.deriv.com/oauth2/token', {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:    params.toString()
        });
        const data = await r.json();
        if (!r.ok) {
            return res.status(r.status).json({
                error: data.error || data,
                hint:  'Check code_verifier, code freshness, and redirect_uri'
            });
        }
        return res.status(200).json(data); // { access_token, expires_in, token_type }
    } catch (e) {
        console.error('Token exchange error:', e);
        return res.status(500).json({ error: 'Internal error' });
    }
}
