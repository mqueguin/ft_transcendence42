<script lang="ts">
import { defineComponent } from 'vue'
import { useUsers } from '@/stores/users';
import { useCookies } from 'vue3-cookies';
import { router } from '@/router';
import { useToast, POSITION } from 'vue-toastification'
const usersStore = useUsers()
const { cookies } = useCookies()
const toast = useToast()
export default defineComponent({
	props: ['currentChan', 'socketChat', 'leaveChan'],
	data: function () {
		return {
			messages: [],
			newMessage: '',
			channel: [],
			login: '',
			error: '',
			allUsersBlocked: {}
		}
	},
	created: function () {
		this.getCurrentLogin()
		this.getAllUsersBlocked()
	},
	mounted: function () {
		this.socketChat.on('newMessage', (data: any) => {
			this.messages.push({ content: data.message, sender: { login: data.senderLogin }, msgStatus: data.msgStatus })
			this.filteredBlockedUsersMessages()
		})
		this.socketChat.on('youAreMuted', (data: any) => {
			toast.warning(`You have been muted form the channel ${data.name}!`, {
				position: POSITION.TOP_CENTER
			})
		})
		this.socketChat.on('aUserWasKicked', (data: any) => {
			if (data.userId === parseInt(usersStore.currentUserId)) {
				this.messages = []
				return
			}
			this.getAllMessages()
		})
		this.socketChat.on('reloadCurrentChannelPage', () => {
			this.getAllMessages()
			this.filteredBlockedUsersMessages()
		})
	},
	watch: {
		messages() {
    		this.scrollToBottom();
  		},
		leaveChan: async function () {
			const res = await fetch(`http://localhost:3000/chats/get-current-channel/${this.currentChan.id}`, {
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
			if (!data) {
				return
			}
			this.newMessage = `${this.login.login} has just left the channel! BYE!`
			await this.sendMessage('QUIT', data)
			this.newMessage = ''
		},
		currentChan: async function () {
			if (this.currentChan === null) {
				this.messages = null
				return
			}
			this.renamePrivateMsgChannel()
			await this.getAllMessages()
			this.filteredBlockedUsersMessages()
			if (this.currentChan.join === true) {
				this.newMessage = `${this.login.login} has just arrived on the channel !`
				await this.sendMessage('JOIN')
				await this.getAllMessages()
				this.filteredBlockedUsersMessages()
			}
		}
	},
	methods: {
		scrollToBottom() {
    		this.$nextTick(() => {
      			const messageContainer = this.$refs.messageContainer;
      			messageContainer.scrollTop = messageContainer.scrollHeight;
    		});
  		},
		getCurrentLogin: async function () {
			const res = await fetch(`http://localhost:3000/users/get-user-login/${usersStore.currentUserId}`, {
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
			this.login = await res.json()
			return
		},
		renamePrivateMsgChannel: function () {
			if (this.currentChan.channelStatus === 'PRIVATE_MSG') {
				const splitName = this.currentChan.name.split('_')
				if (this.login.login === splitName[0]) {
					this.currentChan.name = splitName[1]
				} else {
					this.currentChan.name = splitName[0]
				}
			}
		},
		getAllMessages: async function () {
			const res = await fetch(`http://localhost:3000/chats/get-all-messages/${this.currentChan.id}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				}
			})
			if (res.status === 401) {
				router.push('/unauthorized')
				return
			} else if (res.status === 400) { // BAD REQUEST
				const error = await res.json()
				const message = error.message
				toast.error(`${message}`, {
					position: POSITION.TOP_RIGHT
				})
				return
			}
			this.messages = await res.json()
			return
		},
		getAllUsersBlocked: async function () {
			const res = await fetch('http://localhost:3000/users/get-blocked-users', {
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
			this.allUsersBlocked = await res.json()
			return
		},
		filteredBlockedUsersMessages: function () {
			if (this.messages === null) {
				return null
			}
			const filteredMessages = this.messages.filter(message => {
				return !this.allUsersBlocked.some(user => (user.id === message.senderId) || (user.login === message.sender.login))
			})
			this.messages = filteredMessages
		},
		sendMessage: async function (msgStatus?: string, data?: object) {
			if (this.currentChan === null) {
				return
			}
			if (msgStatus && msgStatus !== 'QUIT') {
				const result = await fetch(`http://localhost:3000/chats/get-user-is-mute/${this.currentChan.id}`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${cookies.get('jwt_token')}`
					},
				})
				if (result.status === 401) {
					router.push('/unauthorized')
					return
				} else if (result.status === 400) {
					const error = await result.json()
					toast.error(`${error.message}`, {
						position: POSITION.TOP_RIGHT
					})
					return
				}
				const isMute = await result.json()
				if (isMute !== false) {
					const muteUntil = new Date(isMute)
					if (muteUntil > new Date()) {
						toast.error('Sorry, you are mute from this channel!', {
							position: POSITION.TOP_CENTER
						})
						return
					}
				}
			}
			this.error = ''
			this.newMessage = this.newMessage.trim()
			if (!this.newMessage) {
				this.error = 'Your message cannot be empty!'
				return
			}
			if (!this.newMessage.match(/^.{1,1000}$/)) {
				this.error = 'Your message cannot exceed 1000 characters!'
				return
			}
			if ((msgStatus !== 'JOIN') && (msgStatus !== 'QUIT') && (msgStatus != 'NEWADMIN') && (msgStatus !== 'REMOVEADMIN')) {
				msgStatus = 'NORMAL'
			}
			let chan
			if (data) {
				chan = await data
			} else {
				chan = this.currentChan
			}
			const res = await fetch(`http://localhost:3000/chats/send-message/${chan.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				},
				body: JSON.stringify({ message: this.newMessage, msgStatus: msgStatus })
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
				this.error = 'Unexpected error!'
				return
			}
			this.socketChat.emit('sendMessage', { channelId: chan.id, message: this.newMessage, senderLogin: this.login.login, msgStatus: msgStatus })
			if (this.currentChan === null) {
				this.newMessage = ''
				return
			}
			await this.getAllMessages()
			this.filteredBlockedUsersMessages()
			this.newMessage = ''
			return
		}
	}
})
</script>

<template>
	<h1 class="title has-text-centered" v-if="currentChan">{{ currentChan.name }}</h1>
	<h1 class="title has-text-centered" v-else>You have not joined any channels</h1>
	<div class="box">
		<div class="box-content-chat" id="box-content-chat" ref="messageContainer">
			<span v-for="message, index in messages" class="message">
				<p v-if="message.msgStatus === 'NORMAL' && (index % 2) !== 0" class="message-line"><strong>{{
					message.sender.login }}</strong>: {{ message.content }}</p>
				<p v-else-if="message.msgStatus === 'NORMAL' && (index % 2) !== 1" class="message-line"
					style="background-color:gainsboro;"><strong>{{ message.sender.login }}</strong>: {{ message.content }}
				</p>
				<p v-else-if="message.msgStatus === 'JOIN'" class="newUser" style="background-color: ivory;">{{
					message.content }}</p>
				<p v-else-if="message.msgStatus === 'QUIT'" class="userLeft" style="background-color: ivory;">{{
					message.content }}</p>
			</span>
		</div>
	</div>


	<div class="message-input">
		<div class="field">
			<div class="control">
				<div class="columns">
					<div class="column is-9">
						<input v-model="newMessage" @keyup.enter="sendMessage" class="input" type="text" style="margin-top: 5px;"
							placeholder="Type your message here..." />
						<div class="columns">
							<div class="column is-10">
								<p class="invalidMsg" v-if="error">{{ error }}</p>
							</div>
							<div class="column" style="text-align: end;">
								<p :class="{ charCount: true, overLimit: newMessage.length > 1000 }">
									{{ newMessage.length }}/1000</p>
							</div>
						</div>

					</div>
					<div v-if="currentChan" class="column is-2">
						<button class="button is-link" @click="sendMessage" style="margin-top: 5px;">
							<span>
								Send
							</span>
							<span class="icon is-small">
								<font-awesome-icon icon="fas fa-paper-plane" />
							</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.message {
	word-break: break-all;
}
.box {
	height: 400px;
	overflow: hidden;
	margin-top: 20px;
}
.box-content-chat {
	height: 100%;
	overflow-y: auto;
}
.message-line {
	margin: 2px 0;
}
.invalidMsg {
	margin-top: 0.5rem;
	color: red;
}
.newUser {
	color: rgb(139, 117, 43);
}
.userLeft {
	color: rgb(209, 137, 28);
}
.charCount {
	margin-top: 0.5rem;
	font-size: 0.8rem;
	color: gray;
}
.overLimit {
	color: red;
	font-weight: bold;
}
</style>