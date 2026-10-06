const PROVIDERS = {
  google: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'openid email profile',
  },
  discord: {
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userInfoUrl: 'https://discord.com/api/users/@me',
    authUrl: 'https://discord.com/api/oauth2/authorize',
    scope: 'identify email',
  },
};

function getAuthorizationUrl(provider, redirectUri, state) {
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new Error(`Proveedor OAuth desconocido: ${provider}`);
  const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
  if (!clientId) throw new Error(`Falta ${provider.toUpperCase()}_CLIENT_ID en las variables de entorno.`);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: cfg.scope,
    state,
  });
  return `${cfg.authUrl}?${params.toString()}`;
}

async function exchangeCodeForProfile(provider, code, redirectUri) {
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new Error(`Proveedor OAuth desconocido: ${provider}`);
  const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
  const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) {
    throw new Error(`Faltan credenciales OAuth de ${provider}.`);
  }

  const tokenResponse = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenResponse.ok) throw new Error(`Error intercambiando código con ${provider}: ${await tokenResponse.text()}`);
  const tokenData = await tokenResponse.json();

  const userResponse = await fetch(cfg.userInfoUrl, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userResponse.ok) throw new Error(`Error obteniendo perfil de ${provider}: ${await userResponse.text()}`);
  const profile = await userResponse.json();

  return normalizeProfile(provider, profile);
}

function normalizeProfile(provider, profile) {
  if (provider === 'google') {
    return { providerUserId: profile.sub, email: profile.email, displayName: profile.name || profile.email };
  }
  if (provider === 'discord') {
    return {
      providerUserId: profile.id,
      email: profile.email,
      displayName: profile.global_name || profile.username,
    };
  }
  throw new Error(`Proveedor OAuth desconocido: ${provider}`);
}

module.exports = { getAuthorizationUrl, exchangeCodeForProfile, PROVIDERS };
