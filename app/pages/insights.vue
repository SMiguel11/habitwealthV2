<template>
  <div class="min-h-screen flex bg-slate-50">
    <Sidebar />
    <main class="flex-1 p-8">
      <div class="max-w-7xl mx-auto">
        <header class="mb-6">
          <h1 class="text-3xl font-bold">Insights</h1>
          <p class="text-gray-600 mt-1">Here are your financial behavioral insights for this month.</p>
        </header>

        <div class="grid grid-cols-12 gap-6">
          <div class="col-span-12 lg:col-span-4 space-y-6">
            <ScoreGauge :score="habitScore" />

            <div class="grid grid-cols-1 gap-4">
              <MetricCard title="Impulse Risk" :value="impulseRisk" :badge="impulseRisk === 'Low' ? 'Good Control' : impulseRisk === 'Medium' ? 'Watch Out' : 'High Alert'" :trend="impulseTrend" />
              <MetricCard title="Total Spent (3mo)" :value="'€' + totalSpent" badge="From statements" :trend="stressTrend" />
            </div>

            <!-- Top spending categories -->
            <div v-if="categoryItems.length" class="bg-white rounded-lg p-4 shadow">
              <div class="text-sm font-semibold text-gray-600 mb-3">Top Categories</div>
              <div v-for="item in categoryItems" :key="item.cat" class="flex justify-between text-sm py-1 border-b last:border-0">
                <span>{{ item.cat }}</span>
                <span class="font-medium">€{{ item.amt }}</span>
              </div>
            </div>
          </div>

          <div class="col-span-12 lg:col-span-8">
            <div v-if="loading" class="flex items-center justify-center h-48 text-gray-400">Loading insights…</div>
            <template v-else>
            <div class="bg-white rounded-lg p-4 shadow">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <div class="text-sm text-gray-500">Monthly Trend</div>
                  <div class="text-xl font-semibold">HabitWellness over time</div>
                </div>
              </div>
              <TrendChart :series="areaSeries" type="area" height="280" />
            </div>

            <div class="grid grid-cols-2 gap-4 mt-6">
              <div class="bg-white rounded-lg p-4 shadow">
                <div class="text-sm font-semibold text-gray-600 mb-2">Recent Transactions</div>
                <div v-if="recentTransactions.length" class="space-y-1">
                  <div v-for="t in recentTransactions.slice(0,5)" :key="t.date+t.merchant" class="flex justify-between text-xs text-gray-700">
                    <span>{{ t.merchant }}</span>
                    <span class="text-red-500 font-medium">€{{ Math.abs(t.amount) }}</span>
                  </div>
                </div>
                <div v-else class="text-xs text-gray-400">Upload statements to see transactions.</div>
              </div>
              <div class="bg-white rounded-lg p-4 shadow">
                <div class="text-sm font-semibold text-gray-600 mb-2">HabitWealth Score</div>
                <div class="text-3xl font-bold text-green-500">{{ habitScore }}</div>
                <div class="text-xs text-gray-400 mt-1">Based on {{ documentCount }} statement(s)</div>
              </div>
            </div>
            </template>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import ScoreGauge from '../components/ScoreGauge.vue'
import MetricCard from '../components/MetricCard.vue'
import TrendChart from '../components/TrendChart.vue'

const loading = ref(true)
const summary = ref(null)
const documentCount = ref(0)
const recentTransactions = ref([])

onMounted(async () => {
  try {
    const res = await fetch('/api/insights-api?userId=local-user')
    const data = await res.json()
    if (data.summary) {
      summary.value = data.summary
      documentCount.value = data.documentCount || 0
      recentTransactions.value = data.recentTransactions || []
    }
  } catch (e) {
    console.warn('Could not fetch insights, using demo data', e)
  } finally {
    loading.value = false
  }
})

// Falls back to demo values when no data yet
const habitScore  = computed(() => summary.value?.habitWealthScore ?? 76)
const impulseRisk = computed(() => {
  const fsi = summary.value?.fsiLevel
  if (fsi === 'High') return 'High'
  if (fsi === 'Medium') return 'Medium'
  if (fsi === 'Low') return 'Low'
  return 'Low'
})
const totalSpent  = computed(() => summary.value?.totalExpenses ?? 0)
const stressTrend  = [4, 5, 6, 5, 4, 6, 7]
const impulseTrend = [2, 2, 3, 2, 1, 2, 1]
const areaSeries   = computed(() => [{ name: 'HabitWellness', data: [30, 40, 55, 60, 65, 70, habitScore.value] }])

const categoryItems = computed(() => {
  if (!summary.value?.byCategory) return []
  return Object.entries(summary.value.byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat, amt]) => ({ cat, amt: Math.round(amt * 100) / 100 }))
})
</script>

<style scoped>
/* small page-level adjustments, Tailwind does most of the work */
</style>
