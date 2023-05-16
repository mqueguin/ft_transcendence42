// import { createApp } from 'vue'
// import App from './App.vue'
// import router from './router'

// createApp(App).use(router).mount('#app')

import { createApp } from 'vue'
import Vue from 'vue'
import { createPinia } from 'pinia'
import { router } from './router/index'
import VueCookies from 'vue3-cookies'
import App from './App.vue'
import { useUsers } from './stores/users'
import { useChannels } from './stores/channels'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import 'bulma/css/bulma.css'
import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import './assets/reset.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
const usersStore = useUsers();
const useChannelsStore = useChannels();

library.add(fas)

app.use(router).use(VueCookies, {
	expireTimes: '30d'
}).use(Toast, {
	transition: 'Vue-Toastification__bounce',
	maxToasts: 1,
	newestOnTop: true
}).component('font-awesome-icon', FontAwesomeIcon).mount('#app')