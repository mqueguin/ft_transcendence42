<script lang="ts">
import{ Options, Vue } from 'vue-class-component'
import PongComponent from '../components/Pong.vue'

@Options({
    components: {
        PongComponent
    },
    props: ['socketNotifications'],
    emits: ['toggleIsReload', 'userLogout']
})
export default class Pong extends Vue {}
</script>


<template>
	<PongComponent :socketNotifications="socketNotifications" />
</template>

<style scoped>
/* No style */
</style>