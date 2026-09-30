// Las casas que se pueden elegir en el monitor: las que conoce la API (`/localData`), sin el BCU,
// ordenadas por nombre. Tira si la API no contesta: sin la lista no se puede validar un guardado.
export async function loadMonitorHouses(): Promise<{ id: string; name: string }[]> {
  const data = await $fetch<Record<string, { name?: string }>>('/localData', {
    baseURL: useRuntimeConfig().apiBaseServer,
    timeout: 8000,
  })
  return Object.entries(data ?? {})
    .filter(([id]) => id !== 'bcu')
    .map(([id, info]) => ({ id, name: info?.name || id }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}
