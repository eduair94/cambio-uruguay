// Las casillas "Ya la tengo" del kit de /apps-utiles-uruguay, guardadas en ESTE navegador
// (localStorage `cu_apps_kit`). Nada llega a un servidor.
//
// El SSR dibuja el kit vacío y `ready` se prende recién después de leer lo guardado: así no hay
// diferencia de hidratación. Y nunca se escribe antes de leer: los controles de Vuetify emiten al
// montar, y un guardado temprano pisaba la lista real con la vacía (pasó con la watchlist y con
// los favoritos de Bankos). Todo acceso va en try/catch: el modo privado o la cuota llena
// degradan a "el kit se olvida", nunca a una página rota.
import { USEFUL_APPS_KIT_STORAGE, usefulAppsKitSanitize } from '~/utils/usefulAppsContent'

export function useUsefulAppsKit() {
  const checked = useState<string[]>('useful-apps-kit', () => [])
  const ready = useState('useful-apps-kit-ready', () => false)
  const storageFailed = ref(false)

  onMounted(() => {
    if (ready.value) return
    try {
      checked.value = usefulAppsKitSanitize(
        JSON.parse(localStorage.getItem(USEFUL_APPS_KIT_STORAGE) || '[]')
      )
    } catch {
      /* modo privado o dato corrupto: el kit arranca vacío */
    }
    ready.value = true
  })

  function toggle(id: string) {
    if (!ready.value) return
    const next = checked.value.includes(id)
      ? checked.value.filter(item => item !== id)
      : usefulAppsKitSanitize([...checked.value, id])
    checked.value = next
    try {
      localStorage.setItem(USEFUL_APPS_KIT_STORAGE, JSON.stringify(next))
      storageFailed.value = false
    } catch {
      storageFailed.value = true
    }
  }

  return { checked, ready, storageFailed, toggle }
}
