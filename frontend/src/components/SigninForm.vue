<script setup lang="ts">
import { ref } from 'vue';
import { NewUser } from '../users';
import { useUsers } from '../stores/users';
import { useModal } from '../composables/modal';
import UserForm from './UserForm.vue';
import { useToast, POSITION } from 'vue-toastification'
import { useCookies } from 'vue3-cookies'
import { useRouter } from 'vue-router'

const { cookies } = useCookies()
const usersStore = useUsers();
const modal = useModal();
const error = ref('')
const b_twoAuth = ref(false)
const toast = useToast()
const router = useRouter()

async function handleSignin (newUser: NewUser) {
	const body = JSON.stringify(newUser)
	const res = await fetch("http://localhost:3000/auth/login", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body
	});
	const user = await res.json();
	if ([401, 404].includes(res.status)) {
		error.value = "Invalid email or password."
	}
	else {
		if (b_twoAuth.value) {
			const res = await fetch(`http://localhost:3000/auth/2fa/authenticate/${user.data.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ code: newUser.code })
			})
			if (res.status === 403) { // FORBIDDEN
				error.value = 'wrong authentication code.'
				return
			}
		} else if (user.data.twoFaAuth) {
			b_twoAuth.value = true
			return
		}
		usersStore.authenticate(user);
		cookies.set('jwt_token', user.Access_token, user.expiresIn)
		modal.hideModal()
		router.push('/')
		if (user.data.firstConn === true) {
			toast.success(`Welcome to Transcendence ${user.data.login}`, {
			  position: POSITION.TOP_RIGHT
			})
			modal.showModal('firstConnection')

			await fetch(`http://localhost:3000/users/${user.data.id}/first_connection`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				}
			})
		} else {
			toast.success(`Welcome back ${user.data.login} !`, {
			  position: POSITION.TOP_CENTER
			})
		}
	}
}
</script>

<template>
	<UserForm @submit="handleSignin" :error="error" :b_twoAuth="b_twoAuth" />
</template>