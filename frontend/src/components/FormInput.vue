<script setup lang="ts">
import { Status } from "../validation";
import { ref, onMounted } from "vue";

const focusedInput = ref<HTMLInputElement | null>(null);
onMounted(() => {
	if (focusedInput.value) {
		focusedInput.value.focus();
	}
});

defineProps<{
	name: string;
	modelValue: string;
	status: Status;
	type: string;
}>();

const emit = defineEmits<{
	(event: "update:modelValue", value: string): void;
}>();

function handleInput(event: Event) {
	emit("update:modelValue", (event.target as HTMLInputElement).value);
}
</script>

<template>
	<div class="field">
		<label for="name" class="label">{{ name }}</label>
		<div class="control">
			<input 
				v-if="name === 'E-mail'" 
				:type="type" 
				:id="name" 
				:value="modelValue" 
				class="input" 
				placeholder="Your e-mail" 
				@input="handleInput"
				ref="focusedInput"
			>
			<input 
				v-else-if="name === 'Password'" 
				:type="type" 
				:id="name" 
				:value="modelValue" 
				class="input" 
				placeholder="Your password" 
				@input="handleInput"
			>
			<input 
				v-else-if="name === 'Username'" 
				:type="type" 
				:id="name" 
				:value="modelValue" 
				class="input" 
				placeholder="Your username" 
				@input="handleInput"
			>
			<input 
				v-else-if="name === 'Confirm Password'" 
				:type="type" 
				:id="name" 
				:value="modelValue" 
				class="input" 
				placeholder="Confirm Password" 
				@input="handleInput"
			>
			<input
				v-else-if="name === 'Enter your 6-digit authentication code'"
				:type="type"
				:id="name"
				:value="modelValue"
				class="input"
				placeholder="012345"
				@input="handleInput"
			/>
			<input
				v-else-if="name === 'Channel name'"
				:type="type"
				:id="name"
				:value="modelValue"
				class="input"
				placeholder="Channel name"
				@input="handleInput"
				ref="focusedInput"
			/>
			<input
				v-else-if="name === 'Channel password'"
				:type="type"
				:id="name"
				:value="modelValue"
				class="input"
				placeholder="Channel password"
				@input="handleInput"
			/>
		</div>
		<p class="is-danger help" v-if="!status.valid">
			{{ status.message }}
		</p>
	</div>
</template>

<style scoped>

</style>