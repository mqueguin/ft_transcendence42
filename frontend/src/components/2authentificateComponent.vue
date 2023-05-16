<script lang="ts">
import { defineComponent } from 'vue'
import { useUsers } from '@/stores/users'
import { useModal } from '../composables/modal'
import { useToast, POSITION } from 'vue-toastification'
import { useCookies } from 'vue3-cookies'
import { router } from '@/router'

const { cookies } = useCookies()

export default defineComponent({
  data: function () {
    return {
      userId: '0',
      login: '',
      googleCode: '',
      accessToken: '',
      expireIn: '',
      firstConn: false,
      error: '',
      twofa: false,
      toast: useToast(),
      usersStore: useUsers(),
      modal: useModal()
    }
  },
  created: function () {
    this.loginWith42Api()
  },
  methods: {
    checkCode: async function () {
      this.error = ''
      if (!this.googleCode) {
        this.error = 'The code must be not empty.'
        return
      } else if (!this.googleCode.match(/^[0-9]{6,6}$/)) {
        this.error = 'Google code must contains only 6 digits.'
        return
      }
      const res = await fetch(`http://localhost:3000/auth/2fa/authenticate/${this.userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: this.googleCode })
      })
      if (res.status === 403) { // FORBIDDEN
        this.error = 'Wrong authentication code.'
        return
      } else {
        this.usersStore.authenticate(null, this.userId)
        if (this.usersStore.currentUserId != undefined) {
          cookies.set('jwt_token', this.accessToken, this.expireIn)
        }
        if (this.firstConn === true) {
			    this.toast.success(`Welcome to Transcendence ${this.login}`, {
			      position: POSITION.TOP_RIGHT
			    })
			    this.modal.showModal('firstConnection')

			    // Request for set firstConn variable to false
			    await fetch(`http://localhost:3000/users/${this.userId}/first_connection`, {
				    method: 'PUT',
				    headers: {
					    'Content-Type': 'application/json',
					    'Authorization': `Bearer ${cookies.get('jwt_token')}`
				    }
			    })
		    } else {
			    this.toast.success(`Welcome back ${this.login} !`, {
			      position: POSITION.TOP_CENTER
			    })
		    }
        this.$router.push('/Pong')
      }
    },
    loginWith42Api: async function () {
      const url = window.location.href
      let backendUrl = 'http://localhost:3000/auth'
      const code = url.slice(36)
      backendUrl += code
      const res = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      if (res.status === 500) {
        router.push('/')
        return
      }
      const user = await res.json()

      if (res.status === 401) {
        this.$router.push('/Pong')
        this.toast.error('Sorry, the connection with 42 api is impossible. This email is already registered', {
          position: POSITION.TOP_CENTER
        })
        this.modal.showModal('signUp')
        return
      }
      if (user.data.twoFaAuth === false) {
        this.usersStore.authenticate(user)
        if (this.usersStore.currentUserId != undefined) {
          cookies.set('jwt_token', user.Access_token, user.expiresIn)
        }
        if (user.data.firstConn === true) {
			    this.toast.success(`Welcome to Transcendence ${user.data.login}`, {
			      position: POSITION.TOP_RIGHT
			    })
			    this.modal.showModal('firstConnection')

			    // Request for set firstConn variable to false
			    await fetch(`http://localhost:3000/users/${user.data.id}/first_connection`, {
				    method: 'PUT',
				    headers: {
					    'Content-Type': 'application/json',
					    'Authorization': `Bearer ${cookies.get('jwt_token')}`
				    }
			    })
		    } else {
			    this.toast.success(`Welcome back ${user.data.login} !`, {
			      position: POSITION.TOP_CENTER
			    })
		    }
        this.$router.push('/Pong')
      } else if (user.data.twoFaAuth) {
        this.twofa = true
        this.userId = user.data.id
        this.login = user.data.login
        this.accessToken = user.Access_token
        this.expireIn = user.expiresIn
        this.firstConn = user.data.firstConn
      }
    }
  }
})
</script>

<template>
  <div class="container" v-if="twofa">
    <div class="field">
      <label class="label">Please enter the 6 digit code from Google authentificator</label>
      <input type="googleCode" class="input is-half" v-model="googleCode" placeholder="123456" />
    </div>
    <p class="error" v-if="error">{{ error }}</p>
    <button type="button" class="button is-large is-primary" @click="checkCode()">
      <span>Access to the site</span>
    </button>
  </div>
</template>


<style lang="scss" scoped>
</style>
