import { propertySaleValidKey } from '~/utils/propertySales'

export function usePropertySaleFavorites() {
  const keys = useState<string[]>('property-sale-favorites', () => [])
  const ready = useState('property-sale-favorites-ready', () => false)
  const limited = ref(false)
  const storageFailed = ref(false)
  onMounted(() => {
    if (ready.value) return
    try {
      const stored: unknown = JSON.parse(localStorage.getItem('cu_property_sale_favorites') || '[]')
      if (Array.isArray(stored))
        keys.value = [...new Set(stored.filter(propertySaleValidKey))].slice(0, 48)
    } catch {
      /* Private browsing and malformed local data must not block search. */
    }
    ready.value = true
  })
  function toggle(key: string) {
    if (!propertySaleValidKey(key)) return
    limited.value = !keys.value.includes(key) && keys.value.length >= 48
    if (limited.value) return
    keys.value = keys.value.includes(key)
      ? keys.value.filter(item => item !== key)
      : [...keys.value, key]
    try {
      localStorage.setItem('cu_property_sale_favorites', JSON.stringify(keys.value))
      storageFailed.value = false
    } catch {
      storageFailed.value = true
    }
  }
  return {
    keys,
    ready,
    limited,
    storageFailed,
    toggle,
    has: (key: string) => keys.value.includes(key),
  }
}
