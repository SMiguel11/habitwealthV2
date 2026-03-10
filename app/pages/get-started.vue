<template>
  <div class="min-h-screen flex items-center justify-center bg-hero bg-cover bg-center p-6">
    <div class="w-full max-w-4xl text-center bg-white/60 backdrop-blur rounded-2xl p-10">
      <h1 class="text-3xl font-bold text-[var(--color-green-800)]">
        Welcome, {{ userName }}!
      </h1>
      <p class="mt-4 text-gray-600">Let's get started with your financial journey.</p>

      <h3 class="mt-6 text-lg font-semibold">Let's get started today!</h3>

      <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <!-- Step 1: Upload Bank Statements -->
        <div class="flex flex-col items-center">
          <div @click="openUpload" role="button" tabindex="0" :class="['w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold cursor-pointer transition-colors', uploadCompleted ? 'bg-green-200 text-green-800' : 'bg-blue-100 text-blue-800 hover:bg-blue-200']">
            {{ uploadCompleted ? '✓' : '1' }}
          </div>
          <div class="mt-3 flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow">
            <div class="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">🏦</div>
            <div class="text-sm font-medium">{{ uploadCompleted ? 'Uploaded ✓' : 'Upload Statements' }}</div>
          </div>
          <div v-if="uploadCompleted" class="mt-2 text-xs text-green-600 font-semibold">✓ Done</div>
        </div>

        <!-- Step 2: Survey -->
        <div class="flex flex-col items-center">
          <div @click="openSurvey" role="button" tabindex="0" :disabled="!uploadCompleted" :class="['w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold', !uploadCompleted ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : surveyCompleted ? 'bg-green-200 text-green-800 cursor-pointer' : 'bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer']">
            {{ surveyCompleted ? '✓' : '2' }}
          </div>
          <div class="mt-3 flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow" :class="!uploadCompleted ? 'opacity-50' : ''">
            <div :class="['w-8 h-8 rounded-full flex items-center justify-center', !uploadCompleted ? 'bg-gray-200' : 'bg-pink-100']">
              {{ !uploadCompleted ? '🔒' : '💡' }}
            </div>
            <div class="text-sm font-medium">{{ surveyCompleted ? 'Survey Done ✓' : 'Spending Insights' }}</div>
          </div>
          <div v-if="surveyCompleted" class="mt-2 text-xs text-green-600 font-semibold">✓ Done</div>
          <div v-if="!uploadCompleted" class="mt-2 text-xs text-gray-500">Complete Step 1 first</div>
        </div>

        <!-- Step 3: Goals -->
        <div class="flex flex-col items-center">
          <div @click="openGoals" role="button" tabindex="0" :disabled="!surveyCompleted" :class="['w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold', !surveyCompleted ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : goalsCompleted ? 'bg-green-200 text-green-800 cursor-pointer' : 'bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer']">
            {{ goalsCompleted ? '✓' : '3' }}
          </div>
          <div class="mt-3 flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow" :class="!surveyCompleted ? 'opacity-50' : ''">
            <div :class="['w-8 h-8 rounded-full flex items-center justify-center', !surveyCompleted ? 'bg-gray-200' : 'bg-yellow-100']">
              {{ !surveyCompleted ? '🔒' : '🎯' }}
            </div>
            <div class="text-sm font-medium">{{ goalsCompleted ? 'Goals Set ✓' : 'Saving Goals' }}</div>
          </div>
          <div v-if="goalsCompleted" class="mt-2 text-xs text-green-600 font-semibold">✓ Done</div>
          <div v-if="!surveyCompleted" class="mt-2 text-xs text-gray-500">Complete Step 2 first</div>
        </div>
      </div>

      <!-- Success Message Banner -->
      <div v-if="successMessage" class="mt-6 bg-green-100 border border-green-400 text-green-800 px-6 py-3 rounded-lg text-sm font-medium animate-pulse">
        {{ successMessage }}
      </div>

      <!-- Error Message Banner -->
      <div v-if="errorMessage" class="mt-6 bg-red-100 border border-red-400 text-red-800 px-6 py-3 rounded-lg text-sm font-medium">
        {{ errorMessage }}
      </div>

      <div class="mt-10 flex justify-center">
        <button @click="next" :disabled="!(uploadCompleted && surveyCompleted && goalsCompleted)" :class="['px-12 py-3 rounded-full text-lg font-bold transition-all', (uploadCompleted && surveyCompleted && goalsCompleted) ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white hover:shadow-lg shadow-cyan-500/30' : 'bg-gray-300 text-gray-600 cursor-not-allowed']">
          Next: View Your Insights →
        </button>
      </div>
    </div>

    <!-- Upload Modal Overlay -->
    <div v-if="showUploadModal" @click.self="closeUpload" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div class="group relative w-[420px]">
        <div class="relative overflow-hidden rounded-2xl bg-slate-950 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-cyan-500/10">
          <div class="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-500/20 to-sky-500/0 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-70"></div>
          <div class="absolute -right-16 -bottom-16 h-32 w-32 rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/0 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-70"></div>

          <div class="relative p-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-white">Upload last 3 months ...</h3>
                <p class="text-sm text-slate-400">Drag &amp; drop your Bank Statements here</p>
              </div>
              <div class="rounded-lg bg-cyan-500/10 p-2">
                <svg class="h-6 w-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
              </div>
            </div>

            <div class="group/dropzone mt-6">
              <div class="relative rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 p-8 transition-colors group-hover/dropzone:border-cyan-500/50">
                <input type="file" @change="onFiles" class="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0" multiple />
                <div class="space-y-6 text-center">
                  <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-900">
                    <svg class="h-10 w-10 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </div>

                  <div class="space-y-2">
                    <p class="text-base font-medium text-white">Drop your files here or browse</p>
                    <p class="text-sm text-slate-400">Support files: PDF, CSV</p>
                    <p class="text-xs text-slate-400">Max file size: 10MB</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-6 space-y-4">
              <div v-if="uploadedFiles.length" class="rounded-xl bg-slate-900/50 p-4">
                <div v-for="(f, i) in uploadedFiles" :key="i" class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="rounded-lg bg-cyan-500/10 p-2">
                      <svg class="h-6 w-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                    <div>
                      <p class="font-medium text-white">{{ f.name }}</p>
                      <p class="text-xs text-slate-400">{{ Math.round(f.size/1024) }} KB</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-4">
                    <span :class="['text-sm font-medium', f.status==='ready' ? 'text-green-400' : f.status==='uploading' ? 'text-cyan-400 animate-pulse' : f.status==='failed' ? 'text-red-400' : 'text-slate-400']">{{ f.status === 'queued' ? 'Pending' : f.status === 'uploading' ? 'Uploading…' : f.status === 'ready' ? 'Done ✓' : f.status === 'failed' ? 'Failed ✗' : f.status }}</span>
                    <button @click="removeFile(i)" class="text-slate-400 transition-colors hover:text-white">
                      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-6 grid grid-cols-2 gap-4">
              <button @click="uploadAll" class="group/btn relative overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 p-px font-medium text-white shadow-[0_1000px_0_0_hsl(0_0%_100%_/_0%)_inset] transition-colors hover:shadow-[0_1000px_0_0_hsl(0_0%_100%_/_2%)_inset]">
                <span class="relative flex items-center justify-center gap-2 rounded-xl bg-slate-950/50 px-4 py-2 transition-colors group-hover/btn:bg-transparent">Upload</span>
              </button>
              <button @click="clearAll" class="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-800">Clear</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Survey Modal Overlay -->
    <div v-if="showSurveyModal" @click.self="closeSurvey" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div class="group relative w-[520px]">
        <div class="relative overflow-hidden rounded-2xl bg-slate-950 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-cyan-500/10">
          <div class="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-500/20 to-sky-500/0 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-70"></div>
          <div class="absolute -right-16 -bottom-16 h-32 w-32 rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/0 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-70"></div>

          <div class="relative p-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-white">Tell us about your spending habits</h3>
                <p class="text-sm text-slate-400">Responde la siguiente encuesta para continuar</p>
              </div>
              <button @click="closeSurvey" class="rounded-lg bg-transparent p-2 text-slate-400 hover:text-white">✕</button>
            </div>

            <div class="mt-4 space-y-4">
              <div v-for="(q, idx) in surveyQuestions" :key="idx" class="flex items-center justify-between gap-4">
                <div class="text-sm text-slate-200">
                  <template v-if="typeof q === 'string'">{{ q }}</template>
                  <template v-else>{{ q.question }}</template>
                </div>
                <div class="flex items-center gap-2">
                  <template v-if="typeof q === 'string'">
                    <button v-for="val in [1,2,3,4]" :key="val" @click="selectAnswer(idx, val)" :class="['w-8 h-8 rounded-sm border flex items-center justify-center', answers[idx]===val ? 'bg-emerald-400 text-white border-emerald-400' : 'bg-slate-800 text-slate-300 border-slate-700']">{{ val }}</button>
                  </template>
                  <template v-else>
                    <button v-for="(opt, oi) in q.options" :key="oi" @click="selectAnswer(idx, oi)" :class="['px-3 py-1 rounded-sm border flex items-center justify-center text-sm', answers[idx]===oi ? 'bg-emerald-400 text-white border-emerald-400' : 'bg-slate-800 text-slate-300 border-slate-700']">{{ opt }}</button>
                  </template>
                </div>
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button @click="closeSurvey" class="rounded-xl bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800">Cancelar</button>
              <button :disabled="!isSurveyComplete" @click="submitSurvey" :class="['rounded-xl px-4 py-2 font-medium', isSurveyComplete ? 'bg-cyan-500 text-white' : 'bg-gray-600 text-gray-300 cursor-not-allowed']">Enviar</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Goals Modal Overlay -->
    <div v-if="showGoalsModal" @click.self="closeGoals" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div class="group relative w-[520px]">
        <div class="relative overflow-hidden rounded-2xl bg-slate-950 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-cyan-500/10">
          <div class="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-500/20 to-sky-500/0 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-70"></div>
          <div class="absolute -right-16 -bottom-16 h-32 w-32 rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/0 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-70"></div>

          <div class="relative p-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-white">Metas financieras inteligentes</h3>
              </div>
              <button @click="closeGoals" class="rounded-lg bg-transparent p-2 text-slate-400 hover:text-white">✕</button>
            </div>

            <div class="mt-4">
              <textarea v-model="goalsText" placeholder="Escribe aquí tu meta financiera (ej: Comprar computadora → $1,200 en 6 meses)" class="w-full min-h-[100px] rounded-lg p-4 bg-slate-800 text-white placeholder:text-slate-400" />
            </div>

            <div class="mt-4 text-sm text-slate-300">
              <div class="font-semibold text-slate-200">EJEMPLOS:</div>
              <ul class="list-disc ml-5 mt-2 space-y-1">
                <li>COMPRAR COMPUTADORA → $1,200 EN 6 MESES</li>
                <li>COMPRAR MOTO → $4,500 EN 12 MESES</li>
                <li>AHORRO DE $100 MENSUAL.</li>
              </ul>
            </div>

            <div class="mt-6 flex justify-center">
              <button @click="saveGoals" :disabled="!goalsText.trim().length" :class="['w-14 h-14 rounded-full text-white flex items-center justify-center', goalsText.trim().length ? 'bg-green-500' : 'bg-gray-600 cursor-not-allowed']">»</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import AppLogo from '~/components/AppLogo.vue'
import { useRouter, useRoute } from '#app'
import { ref, computed } from 'vue'

const router = useRouter()
const route = useRoute()
const userName = route.query.name || 'Guest'
const showUploadModal = ref(false)
const uploadedFiles = ref([])
const uploading = ref(false)
const uploadCompleted = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const SAS_API = '/api/sas-function'
const showSurveyModal = ref(false)
const surveyQuestions = [
  'Cuando estoy estresado, tiendo a comprar cosas que no necesito.',
  'Suelo gastar más cuando me siento emocionalmente agotado.',
  'Reviso mi saldo antes de hacer compras importantes.',
  'Me genera ansiedad ver mis gastos acumulados.',
  'Prefiero pagar con tarjeta aunque tenga dinero disponible.',
  {
    type: 'choices',
    question: '¿Qué emociones suelen acompañar tus compras impulsivas?',
    options: ['Estrés','Aburrimiento','Recompensa','Presión social','No lo sé']
  },
  {
    type: 'choices',
    question: '¿En qué momento del mes sientes más presión financiera?',
    options: ['Inicio','Mitad','Final']
  }
]
const answers = ref(Array(surveyQuestions.length).fill(null))
const surveyCompleted = ref(false)
const isSurveyComplete = computed(() => answers.value.every(a => a !== null))
const showGoalsModal = ref(false)
const goalsText = ref('')
const goalsCompleted = ref(false)

function next() {
  router.push('/insights')
}

function openUpload() {
  showUploadModal.value = true
}

function closeUpload() {
  showUploadModal.value = false
}

function onFiles(e) {
  const files = e.target.files
  if (!files) return
  // Only queue – upload is triggered by the Upload button
  const incoming = Array.from(files).map(f => ({ name: f.name, size: f.size, status: 'queued', url: null, _file: f }))
  uploadedFiles.value = [...uploadedFiles.value, ...incoming]
}

function removeFile(index) {
  uploadedFiles.value.splice(index, 1)
}

function clearAll() {
  uploadedFiles.value = []
}

async function uploadAll() {
  if (!uploadedFiles.value.length) return
  uploading.value = true
  errorMessage.value = ''
  let allSuccess = true
  
  for (let i = 0; i < uploadedFiles.value.length; i++) {
    const item = uploadedFiles.value[i]
    if (item.status === 'ready') continue
    if (item.status === 'failed' && !item._file) continue
    try {
      item.status = 'uploading'
      console.log(`[Upload] Uploading file: ${item.name} (${item.size} bytes)`)
      
      // Use direct Function App URL in production, vite proxy in local dev
      const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      const functionBase = isProduction ? 'https://hwbase-fn-sas-00211.azurewebsites.net' : ''

      // Read file as base64 to avoid multipart/busboy issues in Azure Functions
      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(item._file)
      })

      const res = await fetch(`${functionBase}/api/sas-function-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, filename: item.name, userId: 'local-user' })
      })
      
      if (!res.ok) {
        const error = await res.text()
        throw new Error(`Upload failed (${res.status}): ${error}`)
      }
      
      const result = await res.json()
      const blobUrl = result.blobUrl
      
      console.log(`[Upload] File uploaded successfully: ${blobUrl}`)
      item.url = blobUrl
      item.status = 'ready'
      
      // Trigger enrichment analysis via Azure Function
      fetch(`${functionBase}/api/mock-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          blobUrl: item.url, 
          filename: item.name, 
          userId: 'local-user',
          surveyAnswers: answers.value,
          goals: goalsText.value
        })
      }).catch((err) => {
        console.error('Analysis request failed:', err)
      })
    } catch (err) {
      console.error(`[Upload Error] ${item.name}:`, err)
      allSuccess = false
      item.status = 'failed'
      item.error = err.message || String(err)
      errorMessage.value = `Upload failed: ${item.error}`
    }
    delete item._file
    uploadedFiles.value.splice(i, 1, { ...item })
  }
  
  uploading.value = false
  
  if (allSuccess && uploadedFiles.value.every(f => f.status === 'ready')) {
    uploadCompleted.value = true
    successMessage.value = '✓ Files uploaded successfully! Proceeding to Step 2...'
    setTimeout(() => {
      closeUpload()
      successMessage.value = ''
    }, 1500)
  }
}

function openSurvey() {
  if (!uploadCompleted.value) {
    errorMessage.value = '⚠ Complete Step 1 (Upload Statements) first!'
    setTimeout(() => { errorMessage.value = '' }, 3000)
    return
  }
  showSurveyModal.value = true
}

function closeSurvey() {
  showSurveyModal.value = false
}

function selectAnswer(idx, val) {
  answers.value[idx] = val
}

function submitSurvey() {
  if (!isSurveyComplete.value) return
  surveyCompleted.value = true
  successMessage.value = '✓ Survey completed! Moving to Step 3...'
  setTimeout(() => {
    showSurveyModal.value = false
    successMessage.value = ''
  }, 1000)
}

function openGoals() {
  if (!surveyCompleted.value) {
    errorMessage.value = '⚠ Complete Step 2 (Survey) first!'
    setTimeout(() => { errorMessage.value = '' }, 3000)
    return
  }
  showGoalsModal.value = true
}

function closeGoals() {
  showGoalsModal.value = false
}

function saveGoals() {
  if (!goalsText.value.trim().length) return
  goalsCompleted.value = true
  successMessage.value = '✓ Goals saved! All steps complete. Click Next to view your insights.'
  setTimeout(() => {
    showGoalsModal.value = false
    successMessage.value = ''
  }, 1500)
}
</script>

<style scoped>
/* background placeholder: use app/assets css or replace with public image */
.bg-hero { background-image: radial-gradient(circle at 10% 10%, rgba(255,255,255,0.6), rgba(255,255,255,0.2)); }
</style>
