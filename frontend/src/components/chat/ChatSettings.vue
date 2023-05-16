<script lang="ts">
import { defineComponent } from 'vue'
import { useUsers } from '@/stores/users'
import { useCookies } from 'vue3-cookies'
import { router } from '@/router'
import { useToast, POSITION } from 'vue-toastification'

const { cookies } = useCookies()
const toast = useToast()

export default defineComponent({
    props: ['socketChat', 'currentChan'],
    data: function () {
        return {
            visible: false,
            usersStore: useUsers(),
            visibleInput: false,
            passwordProtected: '',
            confirmPasswordProtected: '',
            passwordError: '',
            confirmPasswordError: '',
            error: '',
            password: '',
            isVerify: false,
            visibleNewPass: false
        }
    },
    methods: {
        showModal: function () {
            this.visible = true
        },
        hideModal: function () {
            this.visible = false
            this.visibleNewPass = false
            this.isVerify = false
            this.password = ''
        },
        showInput: function () {
            this.visibleInput = !this.visibleInput
        },
        publicChannel: async function () {
            if (this.currentChan.channelStatus === 'PROTECTED') {
                if (this.verifyPasswordProtectedChannel() === false) {
                    return
                }
            }
            const res = await fetch(`http://localhost:3000/chats/update-channel-type/${this.currentChan.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                },
                body: JSON.stringify({ channelStatus: 'PUBLIC', password: '' })
            })
            if (res.status === 401) {
                router.push('/unauthorized')
                return
            } else if(res.status === 400) {
                const error = await res.json()
                toast.error(`${error.message}`, {
                    position: POSITION.TOP_RIGHT
                })
            }
            const data = await res.json()
            this.hideModal()
            toast.success('The channel type has been updated!', {
                position: POSITION.TOP_RIGHT
            })
            this.socketChat.emit('reloadChatPage', { data })
            return
        },
        privateChannel: async function () {
            if (this.currentChan.channelStatus === 'PROTECTED') {
                if (this.verifyPasswordProtectedChannel() === false) {
                    return
                }
            }
            const res = await fetch(`http://localhost:3000/chats/update-channel-type/${this.currentChan.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                },
                body: JSON.stringify({ channelStatus: 'PRIVATE', password: '' })
            })
            if (res.status === 401) {
                router.push('/unauthorized')
                return
            } else if(res.status === 400) {
                const error = await res.json()
                toast.error(`${error.message}`, {
                    position: POSITION.TOP_RIGHT
                })
            }
            const data = await res.json()
            this.hideModal()
            toast.success('The channel type has been updated!', {
                position: POSITION.TOP_RIGHT
            })
            this.socketChat.emit('reloadChatPage', { data })
            return
        },
        protectedChannel: async function () {
            this.passwordError = ''
            this.confirmPasswordError = ''
            if (!this.passwordProtected) {
                this.passwordError = 'This field cannot be empty!'
                return
            } else if (!this.confirmPasswordProtected) {
                this.confirmPasswordError = 'This field cannot be empty!'
                return
            } else if (!this.passwordProtected.match(/^[a-zA-Z0-9]{3,12}$/)) {
                this.passwordError = 'Channel password must contain between 3 and 12 characters.'
                return
            } else if (this.passwordProtected !== this.confirmPasswordProtected) {
                this.passwordError = "The password don't match!"
                this.confirmPasswordError = "The password don't match!"
                return
            }
            const res = await fetch(`http://localhost:3000/chats/update-channel-type/${this.currentChan.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                },
                body: JSON.stringify({ channelStatus: 'PROTECTED', password: this.passwordProtected })
            })
            if (res.status === 401) {
                router.push('/unauthorized')
                return
            } else if(res.status === 400) {
                const error = await res.json()
                toast.error(`${error.message}`, {
                    position: POSITION.TOP_RIGHT
                })
            }
            const data = await res.json()
            this.hideModal()
            toast.success('The channel type has been updated!', {
                position: POSITION.TOP_RIGHT
            })
            this.socketChat.emit('reloadChatPage', { data })
            return
        },
        verifyPasswordProtectedChannel: async function () {
            this.error = ''
            if (!this.password) {
                this.error = 'Password canot be empty!'
                return false
            } else if (!this.password.match(/^[a-zA-Z0-9]{3,12}$/)) {
                this.error = 'Channel password must contain between 3 and 12 characters.'
                return false
            }
            const res = await fetch(`http://localhost:3000/chats/verify-password-channel-protected/${this.currentChan.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                },
                body: JSON.stringify({ password: this.password })
            })
            if (res.status === 401) {
                router.push('/unauthorized')
                return false
            } else if (res.status === 400) {
                const error = await res.json()
                const message = error.message
                toast.error(`${message}`, {
                    position: POSITION.TOP_RIGHT
                })
            } else if (res.status === 403) {
                this.error = 'Wrong password'
                this.password = ''
                return false
            }
            this.isVerify = true
            return true
        },
        showUpdatePassword: function () {
            this.passwordProtected = ''
            this.confirmPasswordProtected = ''
            this.passwordError = ''
            this.confirmPasswordError = ''
            this.visibleNewPass = true
        },
        updatePassword: async function () {
            this.passwordError = ''
            this.confirmPasswordError = ''
            if (!this.passwordProtected) {
                this.passwordError = 'This field cannot be empty!'
                return
            } else if (!this.confirmPasswordProtected) {
                this.confirmPasswordError = 'This field cannot be empty!'
                return
            } else if (!this.passwordProtected.match(/^[a-zA-Z0-9]{3,12}$/)) {
                this.passwordError = 'Channel password must contain between 3 and 12 characters.'
                return
            } else if (this.passwordProtected !== this.confirmPasswordProtected) {
                this.passwordError = "The password don't match!"
                this.confirmPasswordError = "The password don't match!"
                return
            }
            const res = await fetch(`http://localhost:3000/chats/update-password-protected-chan/${this.currentChan.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                },
                body: JSON.stringify({ oldPass: this.password, newPass: this.passwordProtected })
            })
            if (res.status === 401) {
                router.push('/unauthorized')
                return
            } else if (res.status === 400) {
                const error = await res.json()
                const message = error.message
                toast.error(`${message}`, {
                    position: POSITION.TOP_RIGHT
                })
            }
            toast.success('Password update success!', {
                position: POSITION.TOP_RIGHT
            })
            this.hideModal()
            return
        }
    }
})
</script>

<template>
<span class="icon is-large settingsButton" v-if="currentChan && currentChan.ownerId === parseInt(usersStore.currentUserId) && currentChan.channelStatus !== 'PRIVATE_MSG'" style="cursor: pointer;" @click="showModal">
	<font-awesome-icon icon="fas fa-solid fa-gear" style="width: 30px; height: 30px;" />
</span>
<div class="modal is-active" v-if="visible">
    <div class="modal-background" @click="hideModal"></div>
    <div class="modal-content" style="width: 60%;">
        <div class="box">
            <div class="modal-title has-text-centered">
                <h1 style="font-weight: bold; margin-top: 0;">Channel {{ currentChan.name }} settings</h1>
            </div>
            <div v-if="currentChan.channelStatus === 'PUBLIC'" class="columns has-text-centered is-vcentered">
                <div class="column">
                    <button class="button is-primary" @click="privateChannel">
                        Switch to Private channel
                    </button>
                </div>
                <div class="column is-1">
                    <p style="font-weight: bold;">Or</p>
                </div>
                <div class="column">
                    <button class="button is-primary" @click="showInput">
                        Switch to Protected channel
                    </button>
                </div>
            </div>
            <div v-if="currentChan.channelStatus === 'PRIVATE'" class="columns has-text-centered is-vcentered">
                <div class="column">
                    <button class="button is-primary" @click="publicChannel">
                        Switch to Public channel
                    </button>
                </div>
                <div class="column is-1">
                    <p style="font-weight: bold;">Or</p>
                </div>
                <div class="column">
                    <button class="button is-primary" @click="showInput">
                        Switch to Protected channel
                    </button>
                </div>
            </div>
            <div v-if="currentChan.channelStatus === 'PROTECTED'">
                <div v-if="!isVerify" class="columns is-vcentered has-text-centered">
                    <div class="column">
                        <label class="label" style="text-align: left;">Type the Password of the channel:</label>
                        <input class="input" type="password" placeholder="********" v-model="password" />
                        <p class="errorPass" v-if="error">{{ error }}</p>
                    </div>
                    <div class="column">
                        <button class="button is-primary is-medium" @click="verifyPasswordProtectedChannel">
                            <span>
                                Access to settings
                            </span>
                        </button>
                    </div>
                </div>
                <div v-else>
                    <div class="columns has-text-centered is-vcentered">
                        <div class="column">
                            <button class="button is-primary" @click="publicChannel">
                                Switch to Public channel
                            </button>
                        </div>
                        <div class="column is-1">
                            <p style="font-weight: bold;">Or</p>
                        </div>
                        <div class="column">
                            <button class="button is-primary" @click="privateChannel">
                                Switch to Private channel
                            </button>
                        </div>
                    </div>
                    <div class="columns is-centered">
                        <button style="margin-top: 20px; margin-bottom: 20px;" class="button is-primary" @click="showUpdatePassword">
                            <span>
                                Edit Password
                            </span>
                            <span class="icon is-large">
                                <font-awesome-icon icon="fas fa-solid fa-pen-to-square" />
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            <div v-if="visibleInput">
                <div class="columns">
                    <div class="column">
                        <label class="label">Type the Password of the Protected channel:</label>
                        <input class="input" type="password" placeholder="********" v-model="passwordProtected" />
                        <p class="errorPass" v-if="passwordError">{{ passwordError }}</p>
                    </div>
                    <div class="column">
                        <label class="label">Confirm Password:</label>
                        <input class="input" type="password" placeholder="********" v-model="confirmPasswordProtected" />
                        <p class="errorPass" v-if="confirmPasswordError">{{ confirmPasswordError }}</p>
                    </div>
                </div>
                <div class="columns has-text-centered">
                    <div class="column">
                        <button class="button is-large is-success" @click="protectedChannel">
                            <span>
                                Switch the channel
                            </span>
                            <span class="icon is-large">
                                <font-awesome-icon icon="fas fa-solid fa-check" />
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            <div v-if="visibleNewPass">
                <div class="columns">
                    <div class="column">
                        <label class="label">Type the new password:</label>
                        <input class="input" type="password" placeholder="********" v-model="passwordProtected" />
                        <p class="errorPass" v-if="passwordError">{{ passwordError }}</p>
                    </div>
                    <div class="column">
                        <label class="label">Confirm Password:</label>
                        <input class="input" type="password" placeholder="********" v-model="confirmPasswordProtected" />
                        <p class="errorPass" v-if="confirmPasswordError">{{ confirmPasswordError }}</p>
                    </div>
                </div>
                <div class="columns has-text-centered">
                    <div class="column">
                        <button class="button is-large is-success" @click="updatePassword">
                            <span>
                                Update Password
                            </span>
                            <span class="icon is-large">
                                <font-awesome-icon icon="fas fa-solid fa-check" />
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<style scoped>
.settingsButton:hover {
    color: gray;
}

.errorPass {
    color: red;
    text-align: left;
}
</style>