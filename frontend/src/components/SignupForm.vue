<script setup lang="ts">
import { NewUser } from '../users';
import { useUsers } from '../stores/users';
import { useModal } from '../composables/modal';
import UserForm from './UserForm.vue';
import { ref } from 'vue'

const usersStore = useUsers();
const modal = useModal();
const error = ref('')

async function handleSignup (newUser: NewUser) {
	const res = await usersStore.createUser(newUser)
	if (res && [400].includes(res.status)) {
		error.value = 'User already registered'
		return
	}
	modal.hideModal()
	modal.showModal('signIn')
}
</script>

<template>
	<UserForm @submit="handleSignup" :error="error"/>
</template>

