<script lang="ts">
import { Options, Vue } from 'vue-class-component'
import LoginComponent from '../components/LoginComponent.vue'

@Options({
    components: {
        LoginComponent
    },
    emits: ['updateUser', 'userLogout'],
    props: ['socketNotifications']
})
export default class Login extends Vue {}
</script>


<template>
   <LoginComponent />
</template>
  

<style>
/* No css here */
</style>