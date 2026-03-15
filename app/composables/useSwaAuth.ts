import { ref, computed } from 'vue'

export const useSwaAuth = () => {
  const principal = ref<any>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!principal.value?.userId)
  const displayName = computed(() => {
    if (!principal.value) return 'Guest'
    const userDetails = principal.value.userDetails
    if (!userDetails) return 'Guest'
    // Try to extract name from userDetails (varies by provider)
    return userDetails.split('@')[0] || 'Guest'
  })

  const refresh = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch('/.auth/me')
      if (!response.ok) {
        console.log('Not authenticated')
        principal.value = null
        return null
      }
      const data = await response.json()
      principal.value = data.clientPrincipal
      return data.clientPrincipal
    } catch (err) {
      console.error('Auth refresh failed:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
      principal.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    window.location.href = '/.auth/logout?post_logout_redirect_uri=/'
  }

  return {
    principal,
    loading,
    error,
    isAuthenticated,
    displayName,
    refresh,
    logout
  }
}
