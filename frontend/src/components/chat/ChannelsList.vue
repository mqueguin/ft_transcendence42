<script lang="ts">
import { defineComponent } from 'vue'
import createChannel from '@/components/chat/CreateChannel.vue';
import joinChannel from '@/components/chat/JoinChannel.vue'
import { useCookies } from 'vue3-cookies'
import { router } from '@/router';
import { useToast, POSITION } from 'vue-toastification'
import { useUsers } from '@/stores/users';
const { cookies } = useCookies()
const toast = useToast()
export default defineComponent({
	props: ['socketChat', 'leaveChan', 'reloadChannelList', 'id'],
	components: {
		createChannel,
		joinChannel
	},
	emits: ['currentChannel'],
	data: function () {
		return {
			channelList: {},
			currChan: null,
			newChannel: null,
			usersStore: useUsers(),
			login: ''
		}
	},
	created: async function () {
		await this.getCurrentLogin()
		await this.getChannels()
		this.renamePrivateMsgChannel()
		if (this.channelList[0] != undefined) {
			this.currChan = this.channelList[0]
			this.$emit('currentChannel', this.channelList[0])
			this.socketChat.emit('joinRoom', { channelId: this.channelList[0].id })
		}
	},
	mounted: async function () {
		this.socketChat.on('reloadPage', async (data: any) => {
			await this.getChannels()
			if (data.ownerId !== parseInt(this.usersStore.currentUserId)) {
				toast.success(`${data.name} channel has been updated by the owner!`, {
					position: POSITION.TOP_RIGHT
				})
			}
			this.$emit('currentChannel', data)
		})
		this.socketChat.on('reloadChannelListPage', async (data: any) => {
			await this.getChannels()
			this.renamePrivateMsgChannel()
			this.currChan = data
			this.socketChat.emit('joinRoom', { channelId: data.id })
			this.$emit('currentChannel', data)
		})
		this.socketChat.on('youAreBanned', async (data: any) => {
			toast.warning(`You have been banned from the channel ${data.name}`, {
				position: POSITION.TOP_CENTER
			})
			this.activeBan(data)
		})
		this.socketChat.on('youAreKicked', async (data: any) => {
			toast.warning(`You have been kicked out of the channel ${data.name}`, {
				position: POSITION.TOP_CENTER
			})
			await this.getChannels()
			if (this.channelList[0] != undefined) {
				this.$emit('currentChannel', this.channelList[0])
				this.socketChat.emit('leftRoom', { channelId: data.channelId })
				this.currChan = this.channelList[0]
				this.socketChat.emit('joinRoom', { channelId: this.currChan.id })
			} else {
				this.$emit('currentChannel', null)
				this.socketChat.emit('leftRoom', { channelId: data.channelId })
			}
		})
	},
	watch: {
		leaveChan: async function () {
			const chan = (this.currChan) ? this.currChan : this.channelList[0]
			await this.getChannels()
			if (this.channelList[0] != undefined) {
				this.$emit('currentChannel', this.channelList[0])
				this.socketChat.emit('leftRoom', { channelId: chan.id })
				this.currChan = this.channelList[0]
				this.socketChat.emit('joinRoom', { channelId: this.currChan.id })
			} else {
				this.$emit('currentChannel', null)
				this.socketChat.emit('leftRoom', { channelId: chan.id })
			}
		},
		reloadChannelList: async function () {
			await this.getChannels()
			this.renamePrivateMsgChannel()
		}
	},
	methods: {
		activeBan(data: any) {
			for (let i = 0; i < this.channelList.length; i++) {
				if (this.channelList[i].id === this.currChan.id) {
					if (this.channelList[i + 1]) {
						this.$emit('currentChannel', this.channelList[i + 1])
						this.socketChat.emit('leftRoom', { channelId: this.channelList[i].id })
						this.socketChat.emit('joinRoom', { channelId: this.channelList[i + 1].id })
						this.currChan = this.channelList[i + 1]
						break ;
					} else if (this.channelList[i - 1]) {
						this.$emit('currentChannel', this.channelList[i - 1])
						this.socketChat.emit('leftRoom', { channelId: this.channelList[i].id })
						this.socketChat.emit('joinRoom', { channelId: this.channelList[i - 1].id })
						this.currChan = this.channelList[i - 1]
						break ;
					} else {
						this.$emit('currentChannel', null)
						this.socketChat.emit('leftRoom', { channelId: this.channelList[i].id })
						this.currChan = null
						break ;
					}
				}
			}
		},
		getCurrentLogin: async function () {
			const res = await fetch(`http://localhost:3000/users/get-user-login/${this.usersStore.currentUserId}`, {
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
		getChannels: async function () {
			const res = await fetch('http://localhost:3000/chats/get-channels', {
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
			this.channelList = await res.json()
			return
		},
		goToChannel: async function (channel) {
			const res = await fetch(`http://localhost:3000/chats/get-user-is-ban/${channel.id}`, {
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
			const isBan = await res.json()
			if (isBan !== false) {
				const banUntil = new Date(isBan)
				if (banUntil > new Date())
				{
					toast.error('Sorry, you have been temporarily banned from this channel!', {
						position: POSITION.TOP_CENTER
					})
					return
				}
			}
			if (this.id !== null) {
				this.currChan.id = this.id
			}
			this.socketChat.emit('leftRoom', { channelId: this.currChan.id })
			this.$emit('currentChannel', channel)
			this.socketChat.emit('joinRoom', { channelId: channel.id })
			this.currChan = channel
		},
		reloadList: async function (newChannel) {
			await this.getChannels()
			newChannel.join = true
			if (this.currChan != null) {
				this.socketChat.emit('leftRoom', { channelId: this.currChan.id })
				this.socketChat.emit('joinRoom', { channelId: newChannel.id })
			} else {
				this.socketChat.emit('joinRoom', { channelId: newChannel.id })
			}
			this.currChan = newChannel
			this.$emit('currentChannel', newChannel)
		},
		renamePrivateMsgChannel: function () {
			for (let i = 0; this.channelList[i]; i++) {
				if (this.channelList[i].channelStatus === 'PRIVATE_MSG') {
					const splitName = this.channelList[i].name.split('_')
					if (this.login.login === splitName[0]) {
						this.channelList[i].name = splitName[1]
					} else {
						this.channelList[i].name = splitName[0]
					}
				}
			}
		},
		checkIfUserIsInPublicChannel: function () {
			for (let i = 0; this.channelList[i]; i++) {
				if (this.channelList[i].channelStatus === 'PUBLIC') {
					return true
				}
			}
			return false
		},
		checkIfUserIsInProtectedChannel: function () {
			for (let i = 0; this.channelList[i]; i++) {
				if (this.channelList[i].channelStatus === 'PROTECTED') {
					return true
				}
			}
			return false
		},
		checkIfUserIsInPrivateChannel: function () {
			for (let i = 0; this.channelList[i]; i++) {
				if (this.channelList[i].channelStatus === 'PRIVATE') {
					return true
				}
			}
			return false
		},
		checkIfUserHasMP: function () {
			for (let i = 0; this.channelList[i]; i++) {
				if (this.channelList[i].channelStatus === 'PRIVATE_MSG') {
					return true
				}
			}
			return false
		},
	}
})
</script>

<template>
	<h1 class="title has-text-centered">Channels</h1>
	<div class="box">
		<div class="" v-if="channelList">
			<p class="menu-label" v-if="checkIfUserIsInPublicChannel() === true"> Public </p>
  			<ul class="menu-list">
    			<li v-for="channel in channelList" class="channel">
					<a @click="goToChannel(channel)" v-if="channel.channelStatus === 'PUBLIC'">
						{{ channel.name }}
					</a>
				</li>
  			</ul>
			<p class="menu-label" v-if="checkIfUserIsInProtectedChannel() === true"> Protected </p>
			<ul class="menu-list">
    			<li v-for="channel in channelList" class="channel">
					<a @click="goToChannel(channel)" v-if="channel.channelStatus === 'PROTECTED'">
						{{ channel.name }}
					</a>
				</li>
  			</ul>
			<p class="menu-label" v-if="checkIfUserIsInPrivateChannel() === true"> Private </p>
			<ul class="menu-list">
    			<li v-for="channel in channelList" class="channel">
					<a @click="goToChannel(channel)" v-if="channel.channelStatus === 'PRIVATE'">
						{{ channel.name }}
					</a>
				</li>
  			</ul>
			<p class="menu-label" v-if="checkIfUserHasMP() === true"> Private messages </p>
			<ul class="menu-list">
    			<li v-for="channel in channelList" class="channel">
					<a @click="goToChannel(channel)" v-if="channel.channelStatus === 'PRIVATE_MSG'">
						{{ channel.name }}
					</a>
				</li>
  			</ul>
		</div>
	</div>
		<div class="create-button">
			<createChannel @submit="reloadList" />
			<joinChannel @submit="reloadList" />
		</div>
</template>

<style scoped>
.menu-label {
	font-weight: bold;
	padding: 0;
	margin: 5px;
}
.box {
	height: 400px;
	overflow: auto;
	margin-top: 20px;
}
.create-button {
	text-align: center;
}
</style>