import { useLoadingStore } from '~/stores/loading'

export const useAppReadiness = () => {
  const loadingStore = useLoadingStore()
  const isReady = ref(false)
  const readinessChecks = reactive({
    domReady: false,
    imagesLoaded: false,
    asyncDataLoaded: false,
    componentsReady: false,
  })

  const checkDOMReadiness = () => {
    return new Promise<void>((resolve) => {
      if (document.readyState === 'complete') {
        readinessChecks.domReady = true
        resolve()
      } else {
        const handleReadyStateChange = () => {
          if (document.readyState === 'complete') {
            readinessChecks.domReady = true
            document.removeEventListener(
              'readystatechange',
              handleReadyStateChange,
            )
            resolve()
          }
        }
        document.addEventListener('readystatechange', handleReadyStateChange)
      }
    })
  }

  const checkImagesLoaded = () => {
    return new Promise<void>((resolve) => {
      const images = document.querySelectorAll('img')
      if (images.length === 0) {
        readinessChecks.imagesLoaded = true
        resolve()
        return
      }

      let loadedCount = 0
      const totalImages = images.length

      const handleImageLoad = () => {
        loadedCount++
        if (loadedCount === totalImages) {
          readinessChecks.imagesLoaded = true
          resolve()
        }
      }

      images.forEach((img) => {
        if (img.complete) {
          handleImageLoad()
        } else {
          img.addEventListener('load', handleImageLoad, { once: true })
          img.addEventListener('error', handleImageLoad, { once: true })
        }
      })

      // Fallback timeout for images
      setTimeout(() => {
        readinessChecks.imagesLoaded = true
        resolve()
      }, 5000)
    })
  }

  const waitForAppReadiness = async () => {
    try {
      // Wait for DOM to be ready
      await checkDOMReadiness()

      // Wait for next tick to ensure Vue components are mounted
      await nextTick()

      // Wait for images to load
      await checkImagesLoaded()

      // Mark components as ready
      readinessChecks.componentsReady = true
      readinessChecks.asyncDataLoaded = true

      // All checks passed
      isReady.value = true
      loadingStore.hideLoading()
    } catch (error) {
      console.error('Error waiting for app readiness:', error)
      // Still hide loading on error
      isReady.value = true
      loadingStore.hideLoading()
    }
  }

  const markAsyncDataReady = () => {
    readinessChecks.asyncDataLoaded = true
  }

  const markComponentsReady = () => {
    readinessChecks.componentsReady = true
  }

  return {
    isReady: readonly(isReady),
    readinessChecks: readonly(readinessChecks),
    waitForAppReadiness,
    markAsyncDataReady,
    markComponentsReady,
  }
}
