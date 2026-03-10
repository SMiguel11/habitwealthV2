<template>
  <div class="min-h-screen flex bg-slate-50">
    <Sidebar />
    <main class="flex-1 p-8">
      <div class="max-w-7xl mx-auto">
        <header class="mb-8">
          <h1 class="text-4xl font-bold text-slate-900">Your HabitWealth Insights</h1>
          <p class="text-slate-600 mt-2">Data-driven analysis of your spending patterns and financial behaviors</p>
        </header>

        <div v-if="loading" class="flex items-center justify-center h-96">
          <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            <p class="mt-4 text-slate-600">{{ loadingMessage }}</p>
          </div>
        </div>

        <template v-else>
          <!-- Key Metrics Row -->
          <div class="grid grid-cols-12 gap-6 mb-8">
            <!-- HabitWealth Score -->
            <div class="col-span-12 lg:col-span-3">
              <ScoreGauge :score="habitScore" title="HabitWealth Score" />
            </div>

            <!-- Key Metrics Cards -->
            <div class="col-span-12 lg:col-span-9">
              <div class="grid grid-cols-3 gap-4">
                <div class="bg-white rounded-lg p-6 shadow">
                  <div class="text-sm text-slate-500 font-semibold mb-2">STRESS INDEX</div>
                  <div class="flex items-baseline gap-2">
                    <div class="text-3xl font-bold text-red-500">{{ fsiLevel }}</div>
                    <div class="text-xs text-slate-400">/100</div>
                  </div>
                  <div class="text-xs text-slate-600 mt-2">Financial Stress</div>
                </div>

                <div class="bg-white rounded-lg p-6 shadow">
                  <div class="text-sm text-slate-500 font-semibold mb-2">TOTAL SPENT</div>
                  <div class="flex items-baseline gap-2">
                    <div class="text-3xl font-bold">€{{ totalSpent }}</div>
                  </div>
                  <div class="text-xs text-slate-600 mt-2">Last 3 months</div>
                </div>

                <div class="bg-white rounded-lg p-6 shadow">
                  <div class="text-sm text-slate-500 font-semibold mb-2">STATEMENTS</div>
                  <div class="flex items-baseline gap-2">
                    <div class="text-3xl font-bold">{{ documentCount }}</div>
                  </div>
                  <div class="text-xs text-slate-600 mt-2">Analyzed</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Content Grid -->
          <div class="grid grid-cols-12 gap-6">
            <!-- Left Column: Analysis -->
            <div class="col-span-12 lg:col-span-8 space-y-6">
              <!-- Trend Chart -->
              <div class="bg-white rounded-lg p-6 shadow">
                <h2 class="text-lg font-semibold text-slate-900 mb-4">HabitWealth Score Trend</h2>
                <TrendChart :series="trendSeries" type="area" height="280" />
              </div>

              <!-- Top Categories -->
              <div class="bg-white rounded-lg p-6 shadow">
                <h2 class="text-lg font-semibold text-slate-900 mb-4">Spending by Category</h2>
                <div class="space-y-3">
                  <div v-for="(item, idx) in topCategories" :key="idx" class="flex items-center gap-4">
                    <div class="flex-1">
                      <div class="flex justify-between mb-1">
                        <span class="text-sm font-medium text-slate-700">{{ item.cat }}</span>
                        <span class="text-sm font-bold text-slate-900">€{{ item.amt }}</span>
                      </div>
                      <div class="w-full bg-slate-200 rounded-full h-2">
                        <div class="bg-gradient-to-r from-cyan-500 to-sky-500 h-2 rounded-full" :style="{ width: item.pct + '%' }"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Goal Alignment -->
              <div class="bg-white rounded-lg p-6 shadow">
                <div class="flex items-center justify-between mb-4">
                  <h2 class="text-lg font-semibold text-slate-900">Your Goals</h2>
                  <span class="text-sm font-bold px-3 py-1 rounded-full" :class="goalAlignmentScore >= 66 ? 'bg-green-100 text-green-700' : goalAlignmentScore >= 33 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'">
                    {{ goalAlignmentScore }}% on track
                  </span>
                </div>
                <div v-if="goals.length" class="space-y-4">
                  <div v-for="(g, idx) in goals" :key="idx" class="border rounded-lg p-4">
                    <div class="flex items-start justify-between gap-2">
                      <div class="font-medium text-slate-800">🎯 {{ g.goal }}</div>
                      <span class="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" :class="g.onTrack ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                        {{ g.onTrack ? '✓ On Track' : '✗ Behind' }}
                      </span>
                    </div>
                    <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>Saves monthly: <span class="font-semibold text-slate-800">€{{ g.currentSavings }}</span></div>
                      <div>Needed monthly: <span class="font-semibold text-slate-800">€{{ g.monthlyNeeded }}</span></div>
                    </div>
                    <div v-if="g.projectedMonths" class="mt-1 text-xs text-slate-500">
                      Projected to reach goal in <span class="font-semibold">{{ g.projectedMonths }} months</span>
                    </div>
                    <div v-else class="mt-1 text-xs text-slate-400 italic">No savings detected this period — goal timeline unknown</div>
                    <!-- Progress bar: current vs needed -->
                    <div class="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                      <div class="h-1.5 rounded-full transition-all" :class="g.onTrack ? 'bg-green-500' : 'bg-red-400'" :style="{ width: Math.min(100, g.monthlyNeeded > 0 ? Math.round((g.currentSavings / g.monthlyNeeded) * 100) : 0) + '%' }"></div>
                    </div>
                  </div>
                </div>
                <div v-else class="text-sm text-slate-500">
                  No goals set yet. Go to <NuxtLink to="/get-started" class="text-cyan-600 underline">Get Started</NuxtLink> to add your saving goals.
                </div>
              </div>

              <!-- Recent Transactions -->
              <div class="bg-white rounded-lg p-6 shadow">
                <h2 class="text-lg font-semibold text-slate-900 mb-4">Recent Transactions</h2>
                <div v-if="recentTransactions.length" class="space-y-2">
                  <div v-for="(t, idx) in recentTransactions.slice(0, 8)" :key="idx" class="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p class="text-sm font-medium text-slate-900">{{ t.merchant }}</p>
                      <p class="text-xs text-slate-500">{{ t.date }}</p>
                    </div>
                    <span class="text-sm font-bold text-red-500">€{{ Math.abs(t.amount) }}</span>
                  </div>
                </div>
                <div v-else class="text-sm text-slate-500">No transactions analyzed yet.</div>
              </div>
            </div>

            <!-- Right Column: Insights & Recommendations -->
            <div class="col-span-12 lg:col-span-4 space-y-6">
              <!-- Financial Persona -->
              <div class="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-lg p-6 shadow border border-cyan-100">
                <h3 class="text-lg font-semibold text-slate-900 mb-2">Your Financial Persona</h3>
                <div class="text-2xl font-bold text-cyan-600 mb-3">{{ financialPersona }}</div>
                <p class="text-sm text-slate-700">Based on your spending patterns and behavioral analysis</p>
              </div>

              <!-- Top Nudges / Recommendations -->
              <div class="bg-white rounded-lg p-6 shadow">
                <h3 class="text-lg font-semibold text-slate-900 mb-4">💡 Key Recommendations</h3>
                <div v-if="nudges.length" class="space-y-3">
                  <div v-for="(nudge, idx) in nudges.slice(0, 4)" :key="idx" class="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <p class="text-sm text-slate-800 font-medium">{{ nudge.title || nudge }}</p>
                    <p v-if="nudge.description" class="text-xs text-slate-600 mt-1">{{ nudge.description }}</p>
                  </div>
                </div>
                <div v-else class="text-sm text-slate-500">
                  <p>Complete your analysis with more statements to get personalized recommendations.</p>
                </div>
              </div>

              <!-- Impulse Control -->
              <div class="bg-white rounded-lg p-6 shadow">
                <h3 class="text-lg font-semibold text-slate-900 mb-3">Impulse Control Analysis</h3>
                <div class="text-4xl font-bold text-green-500 mb-2">{{ impulseScore }}%</div>
                <p class="text-xs text-slate-600">Estimated control over impulse purchases</p>
              </div>
            </div>
          </div>

          <!-- CTA -->
          <div class="mt-8 text-center">
            <NuxtLink to="/" class="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-sky-500 text-white font-semibold rounded-lg hover:shadow-lg transition-shadow">
              ← Back to Home
            </NuxtLink>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from '#app'
import Sidebar from '../components/Sidebar.vue'
import ScoreGauge from '../components/ScoreGauge.vue'
import MetricCard from '../components/MetricCard.vue'
import TrendChart from '../components/TrendChart.vue'

const router = useRouter()
const loading = ref(true)
const loadingMessage = ref('Loading your insights...')
const summary = ref(null)
const documentCount = ref(0)
const recentTransactions = ref([])

async function fetchInsights() {
  const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  const functionBase = isProduction ? 'https://hwbase-fn-sas-00211.azurewebsites.net' : ''
  const res = await fetch(`${functionBase}/api/insights-api?userId=local-user`)
  const data = await res.json()
  if (data.summary) {
    summary.value = data.summary
    documentCount.value = data.documentCount || 0
    recentTransactions.value = data.recentTransactions || []
  }
  return data
}

onMounted(async () => {
  try {
    let data = await fetchInsights()
    // If no documents yet (analysis still processing), poll every 4s up to 15 times (~60s)
    if (!data.documentCount) {
      loadingMessage.value = 'Analyzing your bank statement... This takes about 30 seconds.'
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 4000))
        data = await fetchInsights()
        if (data.documentCount) break
        if (i === 5) loadingMessage.value = 'Almost there — extracting transactions from your PDF...'
        if (i === 10) loadingMessage.value = 'Running AI enrichment agents on your data...'
      }
    }
  } catch (e) {
    console.warn('Could not fetch insights:', e)
  } finally {
    loading.value = false
  }
})

// Computed Properties
const habitScore = computed(() => summary.value?.habitWealthScore ?? 76)
const fsiLevel = computed(() => {
  const fsi = summary.value?.fsiLevel
  if (fsi === 'High') return '75-100'
  if (fsi === 'Medium') return '40-74'
  if (fsi === 'Low') return '0-39'
  return '0-39'
})
const totalSpent = computed(() => {
  const total = summary.value?.totalExpenses ?? 0
  return Math.round(total * 100) / 100
})
const financialPersona = computed(() => summary.value?.financialPersona ?? 'Conscious Spender')
const impulseScore = computed(() => {
  const fsi = summary.value?.fsiLevel
  if (fsi === 'High') return '30'
  if (fsi === 'Medium') return '55'
  return '85'
})
const nudges = computed(() => summary.value?.nudges ?? [])
const goals = computed(() => summary.value?.goals ?? [])
const goalAlignmentScore = computed(() => Math.round(summary.value?.goalAlignmentScore ?? 0))
const trendSeries = computed(() => {
  const scores = summary.value?.trendScores ?? [50, 55, 60, 65, 70, 75, habitScore.value]
  return [{ name: 'HabitWealth Score', data: scores }]
})

const topCategories = computed(() => {
  if (!summary.value?.byCategory) return []
  const entries = Object.entries(summary.value.byCategory)
  const total = entries.reduce((sum, [_, amt]) => sum + amt, 0)
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([cat, amt]) => ({
      cat: cat.charAt(0).toUpperCase() + cat.slice(1),
      amt: Math.round(amt * 100) / 100,
      pct: Math.round((amt / total) * 100)
    }))
})
</script>

<style scoped>
/* small page-level adjustments, Tailwind does most of the work */
</style>
