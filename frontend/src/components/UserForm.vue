<script lang="ts" setup>
import { computed, ref } from 'vue';
import { validate, checkEmail, checkGoogleCode, checkUsername, checkPassword, checkConfirmPassword } from '../validation';
import { NewUser } from '../users'
import { useModal } from '../composables/modal'
import FormInput from '../components/FormInput.vue';

defineProps<{
	error?: string,
	b_twoAuth?: boolean
}>()

const emit = defineEmits<{
	(event: 'submit', payload: NewUser): void
}>()

const email = ref('')
const emailStatus = computed(() => {
	return validate(email.value, [checkEmail]);
});

const username = ref('')
const usernameStatus = computed(() => {
	return validate(username.value, [checkUsername]);
});

const password = ref('')
const passwordStatus = computed(() => {
	return validate(password.value, [checkPassword]);
});

const confirmPassword = ref('')
const confirmPasswordStatus = computed(() => {
	return validate(confirmPassword.value, [checkConfirmPassword], password.value);
});

const googleCode = ref('')
const googleCodeStatus = computed(() => {
	return validate(googleCode.value, [checkGoogleCode])
})

const isInvalid = computed(() => {
	return !usernameStatus.value.valid || !passwordStatus.value.valid || !emailStatus.value.valid || !confirmPasswordStatus.value.valid ;
});

const isInvalidSignin = computed(() => {
	return !passwordStatus.value.valid || !emailStatus.value.valid;
});

const modal = useModal()

async function handleSubmit() {
	if (modal.whichModal() ? isInvalid.value : isInvalidSignin.value) {
		return
	}
	if (googleCode.value) {
		const newUser: NewUser = {
		email: email.value,
		login: username.value,
		password: password.value,
		code: googleCode.value
		}
		try {
			emit('submit', newUser)
		} catch (e) { }
	} else {
		const newUser: NewUser = {
		email: email.value,
		login: username.value,
		password: password.value,
		}
		try {
			emit('submit', newUser)
		} catch (e) { }
	}
}

function handleCancel(): void {
	email.value = ''
	username.value = ''
	password.value = ''
	confirmPassword.value = ''
	modal.hideModal()
}

</script>

<template>
	<form class="form" @submit.prevent="handleSubmit">		
		<div class="is-danger help">
			{{ error }}
		</div>
		<FormInput v-if="!b_twoAuth"
			name="E-mail" 
			v-model="email" 
			:status="emailStatus" 
			type="email" 
		/>
		<FormInput 
			v-if="modal.whichModal()" 
			name="Username" 
			v-model="username" 
			:status="usernameStatus" 
			type="text" 
		/>
		<FormInput v-if="!b_twoAuth"
			name="Password" 
			v-model="password" 
			:status="passwordStatus" 
			type="password" 
		/>
		<FormInput 
			v-if="modal.whichModal()" 
			name="Confirm Password" 
			v-model="confirmPassword" 
			:status="confirmPasswordStatus" 
			type="password" 
		/>
		<FormInput
			v-if="b_twoAuth"
			name="Enter your 6-digit authentication code"
			v-model="googleCode"
			:status="googleCodeStatus"
			type="text"
		/>
		<div class="columns">
			<div class="column">
				<button class="button" :disabled="modal.whichModal() ? isInvalid : isInvalidSignin" >Submit</button>
			</div>
			<div class="column">
				<a class="button is-primary" href="http://localhost:3000/auth/school42">Sign In with 42api</a>
			</div>
			<div class="column">
				<button type="button" class="button is-danger" @click="handleCancel">Cancel</button>
			</div>
		</div>
	</form>
</template>


<style scoped>
.form {
	background: white;
	padding: 30px;
	margin-top: 60px;
	flex-direction: column;
	justify-content: center;
	align-items: center;
}

div {
	white-space: pre-line;
}
</style>
