<script lang="ts">
import { useRouter } from 'vue-router';
import { useModal } from '../composables/modal';
import { useUsers } from '../stores/users';
import { useCookies } from 'vue3-cookies'
import { defineComponent } from 'vue'
import { router } from '@/router';
import { useToast, POSITION } from 'vue-toastification'

const { cookies } = useCookies()
const toast = useToast()

export default defineComponent({
  props: ['isReload', 'socketNotifications'],
  emits: ['userLogout', 'reload'],
  data: function () {
    return {
      modal: useModal(),
      usersStore: useUsers(),
      router: useRouter(),
      data: '',
      objNotifications: [],
      userData: [],
      hover: false
    }
  },
  mounted: async function () {
    // nav-bar burger
      const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);

      $navbarBurgers.forEach(el => {
        el.addEventListener('click', () => {
          const target = el.dataset.target;
          const $target = document.getElementById(target);

          el.classList.toggle('is-active');
          $target.classList.toggle('is-active');
        });
      });
    // end nav-bar burger
    this.socketNotifications.on('friendRequestReceived', (data: any) => {
      this.getNotifications()
    })

    this.socketNotifications.on('notifFriendRequestAccepted', async (recipientId: string) => {
      const res = await fetch(`http://localhost:3000/users/get-user-login/${recipientId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cookies.get('jwt_token')}`
        }
      })
      if (res.status === 401) {
        router.push('/unauthorized')
        return
      }
      const data = await res.json()
      
      toast.success(`${data.login} accepted the friend request!`, { // Changer avec le login
			  position: POSITION.TOP_RIGHT
			})
    })

    this.socketNotifications.on('receiveInvitePrivateChannel', async (data: any) => {
      await this.getUserData(data.requesterId)
      this.objNotifications.push({ avatar: this.userData.avatar, login: this.userData.login, channelId: data.channelId, name: data.name, type: 'inviteChannel' })
    })
    
    this.socketNotifications.on('receiveInvitePongClassic', async (data: any) => {
      await this.getUserData(data.requesterId)
      this.objNotifications.push({ avatar: this.userData.avatar, login: data.opponentLogin, matchId: data.matchId, type: 'invitePongClassic' })
    })

    this.socketNotifications.on('receiveInvitePongFun', async (data: any) => {
      await this.getUserData(data.requesterId)
      this.objNotifications.push({ avatar: this.userData.avatar, login: data.opponentLogin, matchId: data.matchId, type: 'invitePongFun' })
    })
  },
  created: function () {
    this.getData()
    this.getNotifications()
  },
  watch: {
    isReload: function() {
      this.getData()
    }
  },
  methods: {
    getNotifications: async function () {
      const res = await fetch(`http://localhost:3000/friends/get-all-friends-request/${this.usersStore.currentUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cookies.get('jwt_token')}`
        }
      })
      if (res.status === 401) {
        router.push('/unauthorized')
        return
      }
      const data = await res.json()
      this.objNotifications = data

      this.objNotifications = this.objNotifications.slice().reverse()

    },
    getUserData: async function (id: number) {
      const res = await fetch(`http://localhost:3000/users/get-user-data/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cookies.get('jwt_token')}`
        }
      })
      if (res.status === 401) {
        router.push('/unauthorized')
        return
      } else if (res.status === 400) {
        const error = await res.json()
        toast.error(`${error.message}`, {
          position: POSITION.TOP_RIGHT
        })
        return
      }
      this.userData = await res.json()
      return 
    },
    getData: async function () {
      const res = await fetch(`http://localhost:3000/users/${this.usersStore.currentUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cookies.get('jwt_token')}`
        },
      })
      if (res.status === 401) {
        router.push('/unauthorized')
        return ;
      } else if (res.status === 200) {
        const user = await res.json()
        this.data = user
      }
    },
    logout: async function () {
      try {
        const res = await fetch('http://localhost:3000/users/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cookies.get('jwt_token')}`
          }
        })
        if (res.status === 401) {
          this.router.push('/unauthorized')
          return
        } else {
          cookies.remove('jwt_token')
          localStorage.removeItem('currentUserId')
          this.usersStore.currentUserId = undefined
          this.socketNotifications.close()
          this.$emit('userLogout')
	        this.router.push('/login');
        }
      } catch (err) {
        console.error(err)
      }
    },
    acceptFriendRequest: async function (requesterId: string) {
      const res = await fetch(`http://localhost:3000/friends/accept-friend-request`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cookies.get('jwt_token')}`
        },
        body: JSON.stringify({ requesterId: requesterId, recipientId: this.usersStore.currentUserId })
      })
      if (res.status === 401) {
        router.push('/unauthorized')
        return
      }
      this.socketNotifications.emit('friendRequestAccepted', requesterId)
      this.getNotifications()
    },
    refuseFriendRequest: async function (requesterId: string) {
      const res = await fetch(`http://localhost:3000/friends/refuse-friend-request`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cookies.get('jwt_token')}`
        },
        body: JSON.stringify({ requesterId: requesterId, recipientId: this.usersStore.currentUserId })
      })
      if (res.status === 401) {
        router.push('/unauthorized')
        return
      }
      this.getNotifications()
    },
    updateNavbar: function () {
      this.getData()
      this.getNotifications()
      this.$emit('reload')
    },
    
    sendFriendRequest: function () {
      this
    },

    goToProfile: function () {
      this.router.push('/profile')
    },

    goToChat: function () {
      this.router.push('/chat');
    },

    goToPong: function () {
      this.router.push('/');
    },

    goToLeaderboard: function () {
      this.router.push('/leaderboard')
    },

    goToSettings: function () {
      this.router.push('/settings')
    },
    refuseInvitation: function (channelId: number, type: string) {
      for (let i = 0; i < this.objNotifications.length; i++) {
        if (this.objNotifications[i].channelId === channelId && this.objNotifications[i].type === type) {
          if (this.objNotifications[i + 1]) {
            this.objNotifications[i] = this.objNotifications[i + 1]
          } else {
            this.objNotifications = []
          }
        }
      }
      return
    },
    acceptInvitation: async function (channelId: number, type: string) {
      const res = await fetch(`http://localhost:3000/chats/join-private-channel/${channelId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cookies.get('jwt_token')}`
        }
      })
      if (res.status === 401) {
        router.push('/unauthorized')
        return
      } else if (res.status === 400) {
        const error = await res.json()
        toast.error(`${error.message}`, {
          position: POSITION.TOP_RIGHT
        })
        return
      }
      if (this.$route.path != '/chat' && this.$route.path !== '/chat/:channelId') {
        router.push(`/chat/${channelId}`)
      } else {
        router.push(`/chat/${channelId}`)
      }
      for (let i = 0; i < this.objNotifications.length; i++) {
        if (this.objNotifications[i].channelId === channelId && this.objNotifications[i].type === type) {
          this.objNotifications.splice(i, 1)
        }
      }
      return
    },
    acceptPongClassicInvitation: function (matchId: number, type: string) {
      router.push(`/pong/join-game/${matchId}`)
      for (let i = 0; i < this.objNotifications.length; i++) {
        if (this.objNotifications[i].matchId  === matchId && this.objNotifications[i].type === type) {
          this.objNotifications.splice(i, 1)
        }
      }
    },
    acceptPongFunInvitation: function (matchId: number, type: string) {
      router.push(`/pong/join-fun-game/${matchId}`)
      for (let i = 0; i < this.objNotifications.length; i++) {
        if (this.objNotifications[i].matchId  === matchId && this.objNotifications[i].type === type) {
          this.objNotifications.splice(i, 1)
        }
      }
    },
    refusePongClassicInvitation: function (matchId: number, type: string) {
      for (let i = 0; i < this.objNotifications.length; i++) {
        if (this.objNotifications[i].matchId === matchId && this.objNotifications[i].type === type) {
          this.objNotifications.splice(i, 1)
        }
      }
      return
    }
  }
})


</script>

<template>
  <nav class="navbar navbarCustom" role="navigation" aria-label="main navigation">
  <div class="navbar-brand">
    <a class="navbar-item" @click="goToPong()">
      <img src="../assets/logo42.png" width="30" height="30">
    </a>

    <a role="button" class="navbar-burger" aria-label="menu" aria-expanded="false" data-target="navbarBasicExample">
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
    </a>
  </div>


  <div id="navbarBasicExample" class="navbar-menu">
    <div class="navbar-start">

      <a class="navbar-item" @click="goToChat()">
        Chat
      </a>

      <a class="navbar-item" @click="goToLeaderboard()">
        Leaderboard
      </a>

      <a class="navbar-item" @click="goToPong()">
        Play
      </a>
    </div>

    <!-- Dropdown -->
    <div class="navbar-end">

      <div class="dropdown dropbtn" style="margin-top: 5px;">
        <span class="font-icon" style="position: relative;">
          <div v-if="objNotifications.length" class="notification-badge">{{ objNotifications.length }}</div>
          <font-awesome-icon icon="fa-solid fa-bell" />
        </span>
        <div class="dropdown-contentBell" style="z-index: 9999 !important;">
          <div v-if="objNotifications.length">
            <div v-for="(notifs, index) in objNotifications" :key="notifs.id">
              <div v-if="!notifs.type" class="navbar-item">
                <div class="columns is-vcentered">
                  <div class="column is-2 has-text-centered">
                    <img :src="notifs.avatar" class="imgProfileNotifs" />
                  </div>
                  <div class="column is-4">
                    <p style="font-size: 12px; font-weight: bold;">{{ notifs.login }} has sent you a friend request!</p>
                  </div>
                  <div class="column">
                    <button class="button is-small is-success is-rounded" @click="acceptFriendRequest(notifs.id)">
                      <span>Accept</span>
                    </button>
                  </div>
                  <div class="column">
                    <button class="button is-small is-danger is-rounded" @click="refuseFriendRequest(notifs.id)">
                      <span>Refuse</span>
                    </button>
                  </div>
                </div>
              </div>
              <div v-else-if="notifs.type === 'inviteChannel'" class="navbar-item">
                <div class="columns is-vcentered">
                  <div class="column is-2 has-text-centered">
                    <img :src="notifs.avatar" class="imgProfileNotifs" />
                  </div>
                  <div class="column is-4">
                    <p style="font-size: 12px; font-weight: bold;">{{ notifs.login }} has sent you an invitation to join the private channel {{ notifs.name }}</p>
                  </div>
                  <div class="column">
                    <button class="button is-small is-success is-rounded" @click="acceptInvitation(notifs.channelId, notifs.type)">
                      <span>
                        Accept
                      </span>
                    </button>
                  </div>
                  <div class="column">
                    <button class="button is-small is-danger is-rounded" @click="refuseInvitation(notifs.channelId, notifs.type)">
                      <span>
                        Refuse
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              <div v-else-if="notifs.type === 'invitePongClassic'" class="navbar-item">
                <div class="columns is-vcentered">
                  <div class="column is-2 has-text-centered">
                    <img :src="notifs.avatar" class="imgProfileNotifs" />
                  </div>
                  <div class="column is-4">
                    <p style="font-size: 12px; font-weight: bold;">{{ notifs.login }} sent you an invitation for a game of pong (Classic mode)</p>
                  </div>
                  <div class="column">
                    <button class="button is-small is-success is-rounded" @click="acceptPongClassicInvitation(notifs.matchId, notifs.type)">
                      <span>
                        Accept
                      </span>
                    </button>
                  </div>
                  <div class="column">
                    <button class="button is-small is-danger is-rounded" @click="refusePongClassicInvitation(notifs.matchId, notifs.type)">
                      <span>
                        Refuse
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              <div v-else-if="notifs.type === 'invitePongFun'" class="navbar-item">
                <div class="columns is-vcentered">
                  <div class="column is-2 has-text-centered">
                    <img :src="notifs.avatar" class="imgProfileNotifs" />
                  </div>
                  <div class="column is-4">
                    <p style="font-size: 12px; font-weight: bold;">{{ notifs.login }} sent you an invitation for a game of pong (Fun mode)</p>
                  </div>
                  <div class="column">
                    <button class="button is-small is-success is-rounded" @click="acceptPongFunInvitation(notifs.matchId, notifs.type)">
                      <span>
                        Accept
                      </span>
                    </button>
                  </div>
                  <div class="column">
                    <button class="button is-small is-danger is-rounded" @click="refusePongClassicInvitation(notifs.matchId, notifs.type)">
                      <span>
                        Refuse
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else>
            <p class="navbar-item">No notifications...</p>
          </div>
        </div>
      </div>
      <div class="dropdown is-active">
        <a class="dropbtn navbar-link" @click="goToProfile()">
          <p class="dropdownLogin">{{ data.login }}</p>
          <img class="imgProfile" style="margin-right: 10px;" :src="data.avatar">
        </a>
        <div class="dropdown-content" style="z-index: 9999 !important;">
          <a class="navbar-item" @click="goToProfile()">
            View my profile
          </a>
          <a class="navbar-item" @click="goToSettings()">
            Settings
          </a>
          <hr class="navbar-divider">
          <a class="navbar-item" @click="logout()">
            Log out
          </a>
        </div>
      </div>
    </div>
  </div>
</nav>

	<teleport to="#modal">
		<component :is="modal.component" v-bind:socketNotifications="socketNotifications" @updateNavbar="updateNavbar" />
	</teleport>

</template>

<style scoped>
.notification-badge {
  position: absolute;
  top: -10px;
  right: -10px;
  background-color: red;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  text-align: center;
  font-size: 12px;
  color: white;
}

.imgProfileNotifs {
  border-radius: 50%;
  width: 30px;
  height: 30px;
  text-align: center;
}
.font-icon {
  color: black;
  font-size: 25px;
}
.navbar-item {
	color: #202020;
}
.navbar-item:hover {
	background-color: #c5c5c5;
	color: #202020;
}



.navbar-divider {
	background-color: #f4f2f0;
}

.dropdownLogin {
  color: #4a4a4a;
  margin-right: 10px;
  font-size: 20px;
}

/* Style The Dropdown Button */
.dropbtn {
  color: #ffffffff;
  padding: 16px;
  font-size: 16px;
  border: none;
  cursor: pointer;
}

.dropdown {
  position: relative;
  display: inline-block;
}

/* Dropdown Content (Hidden by Default) */
.dropdown-content {
  display: none;
  position: absolute;
  background-color: #f4f2f0;
  min-width: 210px;
  box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
  z-index: 999;
}

.dropdown-contentBell {
  display: none;
  position: absolute;
  background-color: #f4f2f0;
  min-width: 410px;
  box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
  right: 0px;
  z-index: 999;
}

.dropdown-contentBell a:hover {background-color: #e9e6e2}

.dropdown-contentBell a {
  color: #202020;
  padding: 12px 16px;
  text-decoration: none;
  display: block;
}

.dropdown:hover .dropdown-contentBell {
  display: block;
}

/* Links inside the dropdown */
.dropdown-content a {
  color: #202020;
  padding: 12px 16px;
  text-decoration: none;
  display: block;
}

/* Change color of dropdown links on hover */
.dropdown-content a:hover {background-color: #e9e6e2}

/* Show the dropdown menu on hover */
.dropdown:hover .dropdown-content {
  display: block;
}

/* Change the background color of the dropdown button when the dropdown content is shown */
.dropdown:hover .dropbtn {
  background-color: #f4f2f0;
}
.navbarCustom {
  height: 80px;
  /* background-color: #f4f2f0; */
  background-image: linear-gradient(to bottom, #f4f2f0, #edf8f7);
}

.imgProfile {
    border-radius: 50%;
    object-fit: cover;
    width: 40px;
    height: 40px;
}

.active {
  border-bottom: 3px solid #4a4a4a;
}



.a:focus::after {
  background-color: aqua;
}

</style>