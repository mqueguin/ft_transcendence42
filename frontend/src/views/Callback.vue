<template>
    <GoogleAuthentificate></GoogleAuthentificate>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component'
import GoogleAuthentificate from '@/components/2authentificateComponent.vue' // @ is an alias to /src
@Options({
  components: {
    GoogleAuthentificate
  },
  emits: ['updateUser']
})
export default class CallbackView extends Vue {}
</script>

<style scoped>
</style>
