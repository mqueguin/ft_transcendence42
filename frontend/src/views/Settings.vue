<script lang="ts">
import { Options, Vue } from 'vue-class-component'
import SettingsComponent from '../components/SettingsComponent.vue'

@Options({
    components: {
        SettingsComponent
    },
    emits: ['updateUser'],
})
export default class Settings extends Vue {

    emitIsReload() {
        this.$emit('updateUser', true)
    }
}
</script>

<template>
     <SettingsComponent v-on:updateUser="emitIsReload" />
</template>

<style>
/* No css here */
</style>