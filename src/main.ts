import './assets/auth.css'

import 'primeflex/primeflex.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Ripple from 'primevue/ripple'

const app = createApp(App)

app.use(PrimeVue, {
  ripple: true
})
app.use(ToastService)
app.use(createPinia())
app.use(router)

import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'

app.directive('ripple', Ripple)
app.mount('#app')
