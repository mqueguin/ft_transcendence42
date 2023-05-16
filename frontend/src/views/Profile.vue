<script lang="ts">
import { Options, Vue } from 'vue-class-component'
import ProfileComponent from '../components/ProfileComponent.vue'

@Options({
	components: {
		ProfileComponent
	},
	emits: ['updateUser'],
	props: ['socketNotifications']
})
export default class Profile extends Vue {}
</script>

<template>
<section class="section">
	<div class="container">
		<div class="box">
			<ProfileComponent :profileLogin="this.$route.params.login" :socketNotifications="socketNotifications" />
		</div>
	</div>
</section>
</template>

<style scoped>

</style>