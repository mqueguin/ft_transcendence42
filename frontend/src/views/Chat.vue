<script lang="ts">
import ChannelsList from '@/components/chat/ChannelsList.vue';
import CurrentChannel from '@/components/chat/CurrentChannel.vue';
import UsersInChannel from '@/components/chat/UsersInChannel.vue';
import { useUsers } from '@/stores/users';
import { defineComponent } from 'vue'
import io from 'socket.io-client'
import { useCookies } from 'vue3-cookies'
import { router } from '@/router';
import { useToast, POSITION } from 'vue-toastification'

const { cookies } = useCookies()
const toast = useToast()

export default defineComponent({
	components: {
		ChannelsList,
		CurrentChannel,
		UsersInChannel
	},
	props: ['socketNotifications'],
	data: function () {
		return {
			usersStore: useUsers(),
			currentChan: null,
			socketChat: null,
			leaveChan: false,
			reloadChannelList: false,
			id: null
		}
	},
	created: async function () {
		this.socketChat = io('http://localhost:4444', {
        	query: {
         		userId: this.usersStore.currentUserId
        	},
        	withCredentials: true,
        	extraHeaders: {
          		"my-custom-header": "friends"
        	},
      	})
      	this.socketChat.on('connect', () => {
			;
		})
		if (this.$route.params.userId) {
			await this.sendPrivateMessage()
		} else if (this.$route.params.channelId) {
			this.joinChannel(this.$route.params.channelId)
		}
		router.replace('/chat')
	},
	unmounted: function () { // To disconnect the user from the socket
		this.socketChat.disconnect()
	},
	watch: {
		'$route': function(to, from) {
      		if (to.path === `/chat/${this.$route.params.channelId}`) {
       			this.joinChannel(this.$route.params.channelId)
      		}
			router.replace('/chat')
    	}
	},
	methods: {
		joinChannel: async function (channelId: string) {
			const res = await fetch(`http://localhost:3000/chats/user-is-in-channel/${channelId}`, {
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
			if (data === false) {
				toast.error('Your invitation is not valid...', {
					position: POSITION.TOP_RIGHT
				})
				return
			} else {
				if (this.currentChan === null) {
					this.currentChan = data
					this.socketChat.emit('joinRoom', { channelId: data.id })
				} else {
					this.socketChat.emit('leftRoom', { channelId: this.currentChan.id })
					this.socketChat.emit('joinRoom', { channelId: data.id })
					this.currentChan = data;
				}
			}
			this.reloadChannelList = !this.reloadChannelList
			this.socketChat.emit('reloadChannelList', { data: data })
			this.socketChat.emit('reloadCurrentChannel', { data: data })
		},
		getCurrentChannel: async function (channel: any) {
			this.currentChan = await channel
			this.id = null
		},
		leaveChannel: function () {
			this.leaveChan = !this.leaveChan
		},
		newConversation: async function (data: any) {
			const res = await fetch('http://localhost:3000/chats/create-private-message-channel', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				},
				body: JSON.stringify({ recipientId: data.recipientId })
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
			const data2 = await res.json()
			if (this.currentChan) {
				this.socketChat.emit('leftRoom', { channelId: this.currentChan.id })
				this.socketChat.emit('joinRoom', { channelId: data2.id })

			} else {
				this.socketChat.emit('joinRoom', { channelId: data2.id })
			}
			this.currentChan = data2
			this.reloadChannelList = !this.reloadChannelList
			this.socketChat.emit('reloadChannelList', { data: data2, recipientId: data.recipientId })
		},
		sendPrivateMessage: async function (channel?: any) {
			if (channel === undefined) {
				const res = await fetch(`http://localhost:3000/chats/get-conversation-channel`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${cookies.get('jwt_token')}`
					},
					body: JSON.stringify({ userId: this.$route.params.userId })
				})
				if (res.status === 401) {
					router.push('/unauthorized')
					return
				}
				const data = await res.json()
				if (data === false) {
					this.newConversation({ recipientId: this.$route.params.userId })
				} else {
					if (this.currentChan) {
						this.socketChat.emit('leftRoom', { channelId: this.currentChan.id })
						this.socketChat.emit('joinRoom', { channelId: data.id })
					} else {
						this.socketChat.emit('joinRoom', { channelId: data.id })
					}
					this.currentChan = data;
					this.reloadChannelList = !this.reloadChannelList
					return
				}
			} else {
				if (this.currentChan) {
					this.socketChat.emit('leftRoom', { channelId: this.currentChan.id })
					this.socketChat.emit('joinRoom', { channelId: channel.id })
				} else {
					this.socketChat.emit('joinRoom', { channelId: channel.id })
				}
				this.currentChan = channel;
				this.reloadChannelList = !this.reloadChannelList
				this.id = channel.id
				return
			}
		}
	}
})

</script>

<template>
	<div class="section">
		<div class="container">
			<div class="box">
				<div class="columns">
					<div class="column is-one-quarter">
						<ChannelsList @currentChannel="getCurrentChannel" :socketChat="socketChat" :leaveChan="leaveChan" :reloadChannelList="reloadChannelList" :id="id" />
					</div>
					<div class="column is-two-quarter">
						<CurrentChannel :currentChan="currentChan" :socketChat="socketChat" :leaveChan="leaveChan" />		
					</div>
					<div class="column is-one-quarter">
						<UsersInChannel :currentChan="currentChan" :socketChat="socketChat" @leaveChannel="leaveChannel" @newConversation="newConversation" @sendPrivateMessage="sendPrivateMessage" :socketNotifications="socketNotifications" />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
/* No css here */
</style>