export const useBreakpoints = () => {
  const mobile = ref(false)

  const updateBreakpoints = () => {
    mobile.value = window.innerWidth < 960
  }

  onMounted(() => {
    updateBreakpoints()
    window.addEventListener('resize', updateBreakpoints)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateBreakpoints)
  })

  return {
    mobile: readonly(mobile),
  }
}
