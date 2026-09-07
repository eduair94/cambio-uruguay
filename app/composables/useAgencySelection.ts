import { agencyKey } from '~/utils/propertyAdvertiser'

/** Resolve the public label once per agency; never show a previous selection's name. */
export function useAgencySelection(selection: () => string) {
  const key = computed(() => agencyKey(selection()))
  const { data } = useAsyncData(
    () => `agency-selection:${key.value}`,
    async () => {
      if (!key.value) return { agency: null }
      return $fetch<{ agency: { key: string; name: string } }>(
        `/api/agencies/${encodeURIComponent(key.value)}`
      ).catch(() => ({ agency: null }))
    },
    { server: false, lazy: true }
  )
  return computed(() => (data.value?.agency?.key === key.value ? data.value.agency.name : ''))
}
