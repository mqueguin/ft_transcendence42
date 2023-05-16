<script lang="ts">
import{ Options, Vue } from 'vue-class-component'
import LeaderbordComponent from '../components/LeaderboardComponent.vue'

@Options({
    components: {
        LeaderbordComponent
    },
    emits: ['updateUser', 'userLogout'],
    props: ['socketNotifications']
})
export default class Leaderbord extends Vue {}
</script>

<template>
    <LeaderbordComponent :socketNotifications="socketNotifications" />
</template>

<style>
/* No css here */
</style>