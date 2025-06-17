// Defer Tawk.to chat widget loading for better performance
export default defineNuxtPlugin(() => {
  // Only load on client-side and after initial page load
  if (import.meta.client) {
    // Defer loading until after critical content is rendered
    setTimeout(() => {
      const script = document.createElement('script')
      script.async = true
      script.src = 'https://embed.tawk.to/63c9feb9c2f1ac1e202ea427/1gn6gm1s3'
      script.charset = 'UTF-8'
      script.setAttribute('crossorigin', '*')
      document.head.appendChild(script)
    }, 3000) // Delay 3 seconds for better performance
  }
})
