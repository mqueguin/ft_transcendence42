import { defineStore } from 'pinia'
import { NewChannel } from '../channels'
import { useToast, POSITION } from 'vue-toastification'
import { useCookies } from 'vue3-cookies'
import { router } from '@/router'

export interface ChannelState {
	currentChannelId?: string
} 

const toast = useToast()
const { cookies } = useCookies()

export const useChannels = defineStore('channels', {
	actions: {
		async createChannel(newChannel: NewChannel) {
			const body = JSON.stringify(newChannel)
			const res = await fetch("http://localhost:3000/chats/create-channel", {
				method: "POST",
				headers: {
					'Authorization': `Bearer ${cookies.get('jwt_token')}`,
					"Content-Type": "application/json"
				},
				body
			})
			if (res.status === 400) {
				toast.error('Error, Bad request!', {
					position: POSITION.TOP_RIGHT
				})
			} else if (res.status === 409) { // CONFLICT
                const error = await res.json()
                const message = error.message
                toast.error(`${message}`, {
                    position: POSITION.TOP_RIGHT
                })
                return
			} else if (res.status === 401) {
				router.push('/unauthorized')
				return
			}
			return await res.json()
		},
	},
});
