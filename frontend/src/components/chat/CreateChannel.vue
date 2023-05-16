<script lang="ts" setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useChannels } from '@/stores/channels'
import { useUsers } from '@/stores/users'
import { validate, checkChannelName, checkChannelPassword } from '../../validation';
import { NewChannel } from '@/channels';
import { router } from '@/router'
import { useCookies } from 'vue3-cookies'
import FormInput from '../FormInput.vue';

const { cookies } = useCookies()
const channelsStore = useChannels()
const usersStore = useUsers()
const { errorMessage } = storeToRefs(channelsStore);
const visible = ref<boolean>(false)
const currentUser = ref<string>(getCurrentLogin())

defineProps<{
	error?: string,
}>()

const emit = defineEmits<{
	(event: 'submit', payload: NewChannel): void
}>()

const channelName = ref('')

const channelNameStatus = computed(() => {
	return validate(channelName.value, [checkChannelName]);
});

const privateChannel = ref<boolean>(false)

const isChanPrivateStatus = computed(() => {
	if (privateChannel.value === true)
		protectedChannel.value = false;
		return (validate(channelName.value, [checkChannelName]));
});

const protectedChannel = ref<boolean>(false)

const isChanProtectedStatus = computed(() => {
	if (protectedChannel.value === true)
		return privateChannel.value = false;
});

const channelPassword = ref('')

const channelPasswordStatus = computed(() => {
	return validate(channelPassword.value, [checkChannelPassword]);
});

const isValid = computed(() => {
	if (protectedChannel.value)
		return !channelNameStatus.value.valid || !channelPasswordStatus.value.valid;
	else
		return !channelNameStatus.value.valid;
});

const showModal = () => {
	visible.value = true
}

const hideModal = () => {
	visible.value = false
}

const clearInputs = () => {
	channelName.value = ""
	channelPassword.value = ""
	privateChannel.value = false
	protectedChannel.value = false
}

async function getCurrentLogin() {
	const res = await fetch(`http://localhost:3000/users/${usersStore.currentUserId}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${cookies.get('jwt_token')}`
		}
	})
	if (res.status === 401) {
		router.push('/unauthorized')
		return
	} else if (res.status === 200) {
		const user = await res.json()
		currentUser.value = user.login
	}
}
async function handleCreateChannel() {
	if (!isValid)
		return
	const newChannel: NewChannel = {
		name: channelName.value,
		isPrivate: privateChannel.value,
		isProtected: protectedChannel.value,
		password: channelPassword.value,
		owner: currentUser.value
	}
	const channel = await channelsStore.createChannel(newChannel)
	try {
		if (channel !== undefined) {
			emit('submit', channel)
		}
	} catch (e) {
		console.error(e)
	}
	hideModal()
	clearInputs()
}
function handleCancel(): void {
	hideModal()
	clearInputs()
}
</script>

<template>
	<div class="button is-primary is-outlined" @click="showModal"> Create chan </div>
	<div class="modal is-active" v-if="visible">
		<div class="modal-background" @click="handleCancel"></div>
		<div class="modal-content">
			<div class="box">
				<form class="form" @submit.prevent="handleCreateChannel">
					<FormInput name="Channel name" v-model="channelName" :status="channelNameStatus" type="text"
						style="text-align:left;" />
					<div class="field">
						<div class="control" style="text-align:left;">
							<div class="columns">
								<div class="column">
									<label class="checkbox">
										<input type="checkbox" v-model="privateChannel" :status="isChanPrivateStatus" @click="`privateChannel = !privateChannel`">
										Private Channel (invite only)
									</label>
								</div>
								<div class="column">
									<label class="checkbox">
										<input type="checkbox" v-model="protectedChannel" :status="isChanProtectedStatus" @click="`protectedChannel = !protectedChannel`">
										Protected Channel
									</label>
								</div>
							</div>
						</div>
					</div>
					<FormInput v-if="protectedChannel" name="Channel password" v-model="channelPassword"
						:status="channelPasswordStatus" type="password" style="text-align:left;" />
					<div class="field">
						<div class="control">
							<p class="help is-danger" v-if="errorMessage">{{ errorMessage.value }}</p>
						</div>
					</div>
					<div class="columns">
						<div class="column">
							<button class="button" :disabled="isValid" @submit="handleCreateChannel">Submit</button>
						</div>
						<div class="column">
							<button type="button" class="button is-danger" @click="handleCancel">Cancel</button>
						</div>
					</div>
				</form>
			</div>
		</div>
		<button class="modal-close is-large" aria-label="close" @click="handleCancel"></button>
	</div>
</template>

<style scoped>
.columns {
	display: flex;
	justify-content: space-between;
}
.button {
	margin: 5px;
}
</style>