/** $fetch wrapper that attaches the Firebase ID token as a bearer credential. */
export function useAuthFetch() {
  const store = useAuthStore()

  async function authFetch<T>(url: string, opts: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    const token = await store.getToken()
    return $fetch<T>(url, {
      ...opts,
      headers: {
        ...(opts.headers as Record<string, string>),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  }

  return { authFetch }
}
