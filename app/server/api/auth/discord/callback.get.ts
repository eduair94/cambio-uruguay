// Complete Discord OAuth2: verify state, exchange code, resolve the Firebase
// user, and hand a custom token back to the client via ?ct=. Errors redirect to
// /cuenta?authError=discord (no detail leaked).
import { verifyState, resolveDiscordUid } from '../../../utils/discordAuth'
import { adminAuth } from '../../../utils/firebaseAdmin'
import { connectDb } from '../../../utils/db'
import { UserModel } from '../../../models/User'

export default defineEventHandler(async event => {
  const cfg = useRuntimeConfig().discord as {
    clientId: string
    clientSecret: string
    redirectUri: string
  }
  const q = getQuery(event)
  const code = String(q.code || '')
  const state = String(q.state || '')
  const cookie = getCookie(event, 'dc_state') || ''
  deleteCookie(event, 'dc_state', { path: '/' })

  try {
    if (!code || !verifyState(state, cookie, cfg.clientSecret)) {
      throw new Error('bad-state')
    }

    // 1. Exchange the authorization code for an access token.
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: cfg.redirectUri,
      }),
    })
    const token: any = await tokenRes.json()
    if (!token?.access_token) throw new Error('token-exchange-failed')

    // 2. Fetch the Discord identity.
    const meRes = await fetch('https://discord.com/api/users/@me', {
      headers: { authorization: `Bearer ${token.access_token}` },
    })
    const me: any = await meRes.json()
    if (!me?.id) throw new Error('userinfo-failed')

    const displayName = me.global_name || me.username || null
    const photoURL = me.avatar
      ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png`
      : undefined

    // 3. Resolve / create the Firebase user.
    const auth = adminAuth()
    const uid = await resolveDiscordUid(
      { id: String(me.id), email: me.email ?? null, verified: Boolean(me.verified) },
      {
        getUserByEmail: e => auth.getUserByEmail(e),
        createUser: p =>
          auth.createUser({
            ...(p.uid ? { uid: p.uid } : {}),
            ...(p.email ? { email: p.email } : {}),
            ...(displayName ? { displayName } : {}),
            ...(photoURL ? { photoURL } : {}),
          }),
        getUser: u => auth.getUser(u),
      }
    )

    // 4. Persist the Discord mapping + fill profile gaps.
    await connectDb()
    await UserModel.updateOne(
      { _id: uid },
      {
        $set: { discordId: String(me.id) },
        $setOnInsert: { email: me.email ?? null, name: displayName, photo: photoURL ?? null },
      },
      { upsert: true }
    )

    // 5. Mint a custom token for the client to sign in with.
    const customToken = await auth.createCustomToken(uid)
    return sendRedirect(event, `/cuenta?ct=${encodeURIComponent(customToken)}`, 302)
  } catch {
    return sendRedirect(event, '/cuenta?authError=discord', 302)
  }
})
