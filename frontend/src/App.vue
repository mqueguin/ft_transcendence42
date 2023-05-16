<script lang="ts" >
import NavBar from './components/NavBar.vue'
import { useModal } from './composables/modal'
import { useUsers } from './stores/users'
import { defineComponent } from 'vue'
import io from 'socket.io-client'

export default defineComponent({
  name: 'App',
  components: {
    NavBar,
  },
  data: function () {
    return {
      isReload: false as boolean,
      usersStore: useUsers(),
      modal: useModal(),
      socketNotifications: null,
      socketConnected: false as boolean,
      reloadComponent: false as boolean
    }
  },
  methods: {
    toggleIsReload () {
      this.isReload = !this.isReload
      this.reloadComponent = !this.reloadComponent
    },
    isLog () {
      if (this.usersStore.currentUserId != undefined && localStorage.getItem('currentUserId')) {
        if (!this.socketConnected) {
          this.connectSocket()
          this.socketConnected = true
        }
        return true
      }
      return false
    },
    connectSocket: function () {
      this.socketNotifications = io('http://localhost:4040', {
        query: {
          userId: this.usersStore.currentUserId
        },
        withCredentials: true,
        extraHeaders: {
          "my-custom-header": "friends"
        },
      })
      this.socketNotifications.on('connect', () => {
        ;
      })
    },
    userLogout: function () {
      this.socketConnected = false
    }
  },
  computed: {
    modalStyle() {
      return {
        display: this.modal.show ? 'block' : 'none'
      }
    }
  }
})

</script>

<template>
  <div class="modal" style="color:white;" :style="modalStyle">
    <div class="modal-background"></div>
    <div class="modal-content">
      <div id="modal"></div>
    </div>   
    <button class="modal-close is-large" aria-label="Close" @click="modal.hideModal()"></button>
  </div>

  <NavBar v-if="isLog() && socketNotifications" :isReload="isReload" :socketNotifications="socketNotifications" @userLogout="userLogout" @reload="toggleIsReload" />
      <RouterView @updateUser="toggleIsReload" :socketNotifications="socketNotifications" @userLogout="userLogout" />
</template>
