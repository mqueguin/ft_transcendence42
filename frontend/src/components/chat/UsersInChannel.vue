<script lang="ts">
import { defineComponent } from 'vue'
import { useUsers } from '@/stores/users'
import { router } from '@/router'
import { useCookies } from 'vue3-cookies'
import { useToast, POSITION } from 'vue-toastification'
import ChatSettings from '@/components/chat/ChatSettings.vue'
const { cookies } = useCookies()
const toast = useToast()
export default defineComponent({
	components: {
		ChatSettings
	},
	props: ['currentChan', 'socketChat', 'socketNotifications'],
	emits: ['leaveChannel', 'newConversation', 'sendPrivateMessage'],
	data: function () {
		return {
			usersInChannel: {},
			usersStore: useUsers(),
			myRole: '',
			visible: false,
			isBan: false,
			isMute: false,
			muteInput: 0,
			banInput: 0,
			currentUser: null,
			errorMute: '',
			errorBan: '',
			inviteUsers: false,
			query: '',
			searchResults: [] as any[],
		}
	},
	mounted: function () {
		this.socketChat.on('reloadUserList', async () => {
			await this.getUsersInChannel()
			await this.getUserRole()
			if (this.myRole === 'OWNER') {
				for (let i = 0; i <  this.usersInChannel.length; i++) {
					if (this.usersInChannel[i].userRole === 'OWNER') {
						this.currentChan.ownerId = this.usersInChannel[i].user.id
						break
					}
				}
			}
		})
		this.socketChat.on('changeAdminMessage', async () => {
			await this.getUsersInChannel()
			await this.getUserRole()
		})
		this.socketChat.on('aUserWasKicked', (data: any) => {
			if (data.userId === parseInt(this.usersStore.currentUserId)) {
				return
			}
			this.getUsersInChannel()
		})
		this.socketNotifications.on('userChangeStatus', (data: any) => {
			if (!this.usersInChannel) {
				return
			}
			for (let i = 0;  i < this.usersInChannel.length; i++) {
				if (this.usersInChannel[i].user.id === data.id) {
					this.usersInChannel[i].user.isOnline = data.status
					break ;
				}
			}
		})
		this.socketNotifications.on('userInGame', (data: any) => {
			if (!this.userInChannel) {
				return
			}
			for (let i = 0;  i < this.usersInChannel.length; i++) {
				if (this.usersInChannel[i].user.id === data.userId) {
					this.usersInChannel[i].user.isOnline = 'INGAME'
					break ;
				}
			}
		})
		this.socketNotifications.on('userNotInGame', (data: any) => {
			if (!this.userInChannel) {
				return
			}
			for (let i = 0;  i < this.usersInChannel.length; i++) {
				if (this.usersInChannel[i].user.id === data.userId) {
					this.usersInChannel[i].user.isOnline = 'ON'
					break ;
				}
			}
		})
	},
	watch: {
		currentChan: function () {
			if (this.currentChan === null) {
				this.usersInChannel = null
				return
			}
			this.getUsersInChannel()
			this.getUserRole()
		}
	},
	methods: {
		getUsersInChannel: async function () {
			if (this.currentChan === undefined || this.currentChan === null || !this.currentChan) {
				return
			}
			const res = await fetch(`http://localhost:3000/chats/get-all-users-in-channel/${this.currentChan.id}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				}
			})
			if (res.status === 401) { // Unauthorized
				router.push('/unauthorized')
				return
			} else if (res.status === 400) {
				toast.error('Error, BAD_REQUEST!', {
					position: POSITION.TOP_RIGHT
				})
				return
			}
			this.usersInChannel = await res.json()
			return
		},
		getUserRole:  async function ()  {
			const res = await fetch(`http://localhost:3000/chats/get-user-role/${this.currentChan.id}`, {
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
			const data = await res.json()
			this.myRole = data.userRole
			return
		},
		leaveChannel: async function () {
			const res = await fetch(`http://localhost:3000/chats/leave-channel/${this.currentChan.id}`, {
				method: 'DELETE',
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
				const message = error.message
				toast.error(`${message}`, {
					position: POSITION.TOP_RIGHT
				})
				return
			}
			toast.success('You have left the channel!', {
				position: POSITION.TOP_RIGHT
			})
			this.socketChat.emit('leftRoom', { channelId: this.currentChan.id })
			this.$emit('leaveChannel')
			this.usersInChannel = {}
			return
		},
		goToProfile: function (login?: string) {
			if (login) {
				router.push(`/profile/${login}`)
				return
			} else {
				router.push('/profile')
				return
			}
		},
		privateMsg: async function (user: any) {
			const res = await fetch('http://localhost:3000/chats/get-conversation-channel', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				},
				body: JSON.stringify({ userId: user.user.id })
			})
			if (res.status === 401) {
				router.push('/unauthorized')
				return
			}
			const data = await res.json()
			if (data) {
				this.$emit('sendPrivateMessage', data)
			} else {
				this.$emit('newConversation', { requesterId: parseInt(this.usersStore.currentUserId), recipientId: user.user.id })
			}
		},
		setAdmin: async function (user: any) {
			const res = await fetch(`http://localhost:3000/chats/add-admin/${user.user.id}/${this.currentChan.id}`, {
				method: 'PATCH',
				headers : {
					'Content-Type': 'application-json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				},
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
			this.getUsersInChannel()
			this.socketChat.emit('changeAdmin', {channelId: this.currentChan.id, senderLogin: user.user.login, newAdmin: true })
			return
		},
		unsetAdmin: async function (user: any) {
			const res = await fetch(`http://localhost:3000/chats/remove-admin/${user.user.id}/${this.currentChan.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				},
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
			this.getUsersInChannel()
			this.socketChat.emit('changeAdmin', { channelId: this.currentChan.id, senderLogin: user.user.login, newAdmin: false })
			return
		},
		showModal: function (isMuteOrBan: string, currentUser: any) {
			this.inviteUsers = false
			this.visible = true
			if (isMuteOrBan === 'MUTE') {
				this.isMute = true
			} else {
				this.isBan = true
			}
			this.currentUser = currentUser
		},
		hideModal: function () {
			this.visible = false
			this.isMute = false
			this.isBan = false
			this.query = ''
			this.searchResults = null
		},
		muteUser: async function () {
			this.errorMute = ''
			if (!this.muteInput) {
				this.errorMute = 'This field cannot be empty!'
				return
			} else if (this.muteInput < 0) {
				this.errorMute = 'Invalid input!'
				return
			} else if (this.muteInput > 3600) {
				this.errorMute = "You can't mute someone for more than 3600 seconds"
				return
			}
			const res = await fetch(`http://localhost:3000/chats/mute-a-user/${this.currentChan.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				},
				body: JSON.stringify({ userId: this.currentUser.user.id, muteDurationSeconds: this.muteInput })
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
			this.socketChat.emit('muteUser', { id: this.currentUser.user.id, channelId: this.currentChan.id, name: this.currentChan.name })
			this.muteInput = 0;
			this.hideModal()
			return
		},
		inviteUser: function () {
			this.visible = true
			this.inviteUsers = true
		},
		banUser: async function () {
			this.errorBan = ''
			if (!this.banInput) {
				this.errorBan = 'This field cannot be empty!';
				return
			} else if (this.banInput < 0) {
				this.errorBan = 'Invalid input!'
				return
			} else if (this.banInput > 3600) {
				this.errorBan = "You can't ban someone for more than 3600 seconds"
				return
			}
			const res = await fetch(`http://localhost:3000/chats/ban-a-user/${this.currentChan.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				},
				body: JSON.stringify({ userId: this.currentUser.user.id, banDurationSeconds: this.banInput })
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
			this.socketChat.emit('banUser', { id: this.currentUser.user.id, channelId: this.currentChan.id, name: this.currentChan.name })
			this.banInput = 0;
			this.hideModal()
			return
		},
		kickUser: async  function (user: any) {
			const res = await fetch(`http://localhost:3000/chats/kick-a-user/${this.currentChan.id}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				},
				body: JSON.stringify({ userId: user.user.id })
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
			this.socketChat.emit('kickUser', { userId: user.user.id, channelId: this.currentChan.id, name: this.currentChan.name })
			this.getUsersInChannel()
			return
		},
		searchUsers: async function () {
			if (this.query == '') {
				this.searchResults = []
				return
			}
            const res = await fetch(`http://localhost:3000/users/search-users?login=${this.query}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                }
            })
            if (res.status === 401) { // Unauthorize
                router.push('/unauthorize')
                return
            }
            this.searchResults = await res.json()
			for (let i = 0; i < this.searchResults.length; i++) {
				for (let j = 0; j < this.usersInChannel.length; j++) {
					if (this.searchResults[i].login === this.usersInChannel[j].user.login) {
						this.searchResults.splice(i, 1)
						break
					}
				}
			}
        },
		sendInvite(userId: number) {
			this.socketNotifications.emit('sendInvitePrivateChannel', { recipientId: userId.toString(), requesterId: this.usersStore.currentUserId, channelId: this.currentChan.id, name: this.currentChan.name })
			this.hideModal()
			return
		},
		sendClassicGameInvitation: function (user: any) {
			router.push(`/pong/new-classic/${user.id}`)
		},
		sendFunGameInvitation: function (user: any) {
			router.push(`pong/new-fun/${user.id}`)
		}
	}
})
</script>

<template>
	<div class="columns is-vcentered columnsCustom">
		<div class="column is-3"></div>
		<div class="column is-6">
			<h1 class="title has-text-centered">Users</h1>
		</div>
		<div class="column is-3">
			<ChatSettings :socketChat="socketChat" :currentChan="currentChan" />
		</div>
	</div>
	<div class="box">
		<div v-if="usersInChannel">
			<div v-for="userInChannel in usersInChannel">
				<div class="user-dropdown">
					<p class="subtitle user-name" v-if="userInChannel.userRole === 'OWNER'"
						style="font-weight: bold; color: goldenrod;">
						<span>
							{{ userInChannel.user.login }}
						</span>
						<span class="icon is-small">
							<font-awesome-icon icon="fa-solid fa-crown" />
						</span>
					</p>
					<p class="subtitle user-name" v-if="userInChannel.userRole === 'ADMIN'"
						style="font-weight: bold; color:darkslategrey;">
						{{ userInChannel.user.login }}
						<span class="tag is-info is-light">Admin</span>
					</p>
					<p class="subtitle user-name" v-if="userInChannel.userRole === 'NORMAL'" style="color:darkcyan;">
						{{ userInChannel.user.login }}
					</p>
					<div v-if="userInChannel.user.id === parseInt(usersStore.currentUserId)" class="user-dropdown-content">
						<a class="dropdown-item" @click="goToProfile()">View my profile</a>
					</div>
					<div v-else class="user-dropdown-content">
 						<a class="dropdown-item" @click="goToProfile(userInChannel.user.login)">View Profile</a>
						<a v-if="userInChannel.user.isOnline === 'ON'" class="dropdown-item" @click="sendClassicGameInvitation(userInChannel.user)">Invite to normal game</a>
						<a v-if="userInChannel.user.isOnline === 'ON'" class="dropdown-item" @click="sendFunGameInvitation(userInChannel.user)">Invite to special game</a>
						<a class="dropdown-item" @click="privateMsg(userInChannel)">Send message</a>
						<a v-if="(currentChan.channelStatus !== 'PRIVATE_MSG' ) && (myRole === 'OWNER') || (myRole === 'ADMIN' && userInChannel.userRole === 'NORMAL')" @click="showModal('MUTE', userInChannel)" class="dropdown-item">Mute</a>
						<a v-if="(currentChan.channelStatus !== 'PRIVATE_MSG' ) && (myRole === 'OWNER') || (myRole === 'ADMIN' && userInChannel.userRole === 'NORMAL')" class="dropdown-item" @click="kickUser(userInChannel)">Kick</a>
						<a v-if="(currentChan.channelStatus !== 'PRIVATE_MSG' ) && (myRole === 'OWNER') || (myRole === 'ADMIN' && userInChannel.userRole === 'NORMAL')" @click="showModal('BAN', userInChannel)" class="dropdown-item">Ban</a>
						<a v-if="(currentChan.channelStatus !== 'PRIVATE_MSG' ) && myRole === 'OWNER' && userInChannel.userRole === 'NORMAL'" class="dropdown-item" @click="setAdmin(userInChannel)">Set Admin</a>
						<a v-else-if="(currentChan.channelStatus !== 'PRIVATE_MSG' ) && myRole === 'OWNER' && userInChannel.userRole === 'ADMIN'" class="dropdown-item" @click="unsetAdmin(userInChannel)">Unset Admin</a>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div style="text-align: center;">
		<span class="has-text-centered">
			<button v-if="currentChan && currentChan.channelStatus === 'PRIVATE'" class="button is-outlined is-success" style="margin: 5px;" @click="inviteUser">Invite users</button>
		</span>
		<span class="has-text-centered">
			<button v-if="currentChan !== null && currentChan.channelStatus !== 'PRIVATE_MSG'" class="button is-outlined is-danger" style="margin: 5px;" @click="leaveChannel">Leave channel</button>
		</span>
	</div>

<div class="modal is-active" v-if="visible">
    <div class="modal-background" @click="hideModal"></div>
    <div class="modal-content">
        <div class="box boxCustom">
            <div class="modal-title has-text-centered">
                <h1 v-if="isMute" style="font-weight: bold;">Mute a user for a limited time!</h1>
				<h1 v-else-if="isBan" style="font-weight: bold;">Ban a user for a limited time!</h1>
            </div>
			<div v-if="isMute">
				<label class="label">How long does the user mute (in seconds)?</label>
            	<div class="field">
                    <input class="input" type="number" placeholder="60(seconds)" v-model="muteInput">
            	</div>
            	<p style="color: red; text-align:left;" v-if="errorMute">{{ errorMute }}</p>
				<div class="columns is-v-centered is-centered" style="margin-top: 20px;">
					<button class="button is-success is-medium" @click="muteUser()">
						<span>Mute this user</span>
						<span class="icon is-small">
							<font-awesome-icon icon="fas fa-solid fa-check" />
						</span>
					</button>
				</div>
			</div>
			<div v-else-if="isBan">
				<label class="label">How long does the user ban (in seconds)?</label>
            	<div class="field">
                    <input class="input" type="number" placeholder="60(seconds)" v-model="banInput">
            	</div>
            	<p style="color: red; text-align:left;" v-if="errorBan">{{ errorBan }}</p>
				<div class="columns is-v-centered is-centered" style="margin-top: 20px;">
					<button class="button is-success is-medium" @click="banUser()">
						<span>Ban this user</span>
						<span class="icon is-small">
							<font-awesome-icon icon="fas fa-solid fa-check" />
						</span>
					</button>
				</div>
			</div>
			<div>
		</div>
    </div>
</div>
<div class="modal is-active" v-if="inviteUsers">
	<div class="modal-background" @click="hideModal"></div>
	<div class="modal-content">
		<div class="box">
			<div class="modal-title has-text-centered">
                <h1 style="font-weight: bold;">Invite users in this private channel!</h1>
            </div>
			<div class="has-text-centered">
				<input class="searchBar" type="text" v-model="query" @input="searchUsers" placeholder="search your friends">
				<ul >
            		<li v-for="(result, $index) in searchResults" style="color: black;">
						<div v-if="result.isOnline === 'ON' && result.id != parseInt(usersStore.currentUserId)" class="columns is-vcentered">
							<div class="column" style="text-align: right;">
								<img class="img" :src="result.avatar" />
							</div>
							<div class="column">
								<p style="margin-top: 12.5px; margin-bottom: 12.5px;">
									{{ result.login }}
								</p>
							</div>
							<div class="column" style="text-align: left;">
								<button id="button2" class="button is-pulled-right is-rounded"  v-on:click="sendInvite(result.id)">Invite user</button>
							</div>
						</div>
						<div v-else-if="result.isOnline === 'OFF'">
							<div class="columns is-vcentered">
								<div class="column" style="text-align: right;">
									<img class="img" :src="result.avatar" />
								</div>
								<div class="column">
									<p style="text-align: center;">{{ result.login }} is not Online...</p>
								</div>
								<div class="column"></div>
							</div>
						</div>
					</li>
        		</ul>
			</div>
			<div class="columns is-centered">
				<button style="margin-top: 40px;" class="button is-medium is-success" @click="hideModal">
					<span>
						Close
					</span>
					<span class="icon is-small">
						<font-awesome-icon icon="fas fa-solid fa-xmark" />
					</span>
				</button>
			</div>
		</div>
	</div>
</div>
</div>
</template>

<style scoped>
.img {
    border-radius: 50%;
    object-fit: cover;
    width: 50px;
    height: 50px;
	margin-right: 15px;
}
.searchBar {
	margin-bottom: 10px;
	margin-top: 30px;
	border: none;
	background-color: rgba(128,128,128,0.1);
	padding: 10px;
	border-radius: 10px;
}
.searchBar::placeholder {
	margin-bottom: 10px;
}
span.icon {
	margin-left: 10px;
}
.columnsCustom {
	margin-bottom: calc(0rem - 1.8rem);
}
.box {
	height: 400px;
	overflow: auto;
	margin-top: 20px;
}
.boxCustom {
	height: 260px;
}
p.subtitle {
	margin-bottom: 0;
}
p.subtitle:hover {
	cursor: pointer;
}
.user-name:hover {
	background-color: #dddddd;
}
.user-dropdown:hover .user-dropdown-content {
	display: block;
}
.user-dropdown {
	position: relative;
	display: inline-block;
}
.user-dropdown-content {
	left: 40%;
	top: 20%;
	display: none;
	position: absolute;
	background-color: #f4f2f0;
	min-width: 210px;
	box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
	z-index: 999;
}
.user-dropdown-content a:hover {
	background-color: #e9e6e2
}
</style>