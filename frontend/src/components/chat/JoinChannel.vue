<script lang="ts">
import { router } from '@/router'
import { defineComponent } from 'vue'
import { useCookies } from 'vue3-cookies'
import { useToast, POSITION } from 'vue-toastification'

const { cookies } = useCookies()
const toast = useToast()

export default defineComponent({
    emits: ['submit'],
    data: function () {
        return {
            visible: false,
            visiblePublicChannel: false,
            visibleProtectedChannel: false,
            allChannels: {},
            protectedChannelPass: '',
            error: '',
            visibleInput: false,
            protectedChannelSelected: {}
        }
    },
    methods: {
        showModal: function () {
            this.visible = true
        },
        hideModal: function () {
            this.visible = false
            this.visibleInput = false
            this.visiblePublicChannel = false
            this.visibleProtectedChannel = false
            this.allChannels = {}
            this.protectedChannelSelected = {}
            this.protectedChannelPass = ''
        },
        showPublicChannels: async function () {
            if (this.visibleProtectedChannel) {
                this.visibleProtectedChannel = false
            }
            this.visiblePublicChannel = true
            const res = await fetch('http://localhost:3000/chats/get-all-public-channels', {
                method: 'GET',
                headers: {
                    'Content-type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                }
            })
            if (res.status === 401) {
                router.push('/unauthorized')
                return
            }
            this.allChannels = await res.json()
            return
        },
        showProtectedChannels: async function () {
            if (this.visiblePublicChannel) {
                this.visiblePublicChannel = false
            }
            this.visibleProtectedChannel = true
            const res = await fetch('http://localhost:3000/chats/get-all-protected-channels', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                }
            })
            if (res.status === 401) {
                router.push('/unauthorized')
                return
            }
            this.allChannels = await res.json()
            return
        },
        showInput: function (channel) {
           this.visibleInput = true
           this.protectedChannelSelected = channel
           return
        },
        goBack: function () {
            this.visibleInput = false
        },
        joinPublicChannel: async function (channel: any) {
            const res = await fetch(`http://localhost:3000/chats/join-public-channel/${channel.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                }
            })
            if (res.status === 401) {
                router.push('/unauthorized')
                return
            } else if (res.status === 400) { // BAD_REQUEST
                const error = await res.json()
                const message = error.message
                toast.error(`${message}`, {
                    position: POSITION.TOP_RIGHT
                })
                return
            }
            this.$emit('submit', channel)
            /* this.visibleInput = false
            this.visible = false */
            this.hideModal()
            return
        },
        joinProtectedChannel: async function () {
            this.error = ''
            if (!this.protectedChannelPass.match(/^[a-zA-Z0-9]{3,12}$/)) {
                this.error = 'This password is invalid.'
                return
            }
            const res = await fetch(`http://localhost:3000/chats/join-protected-channel/${this.protectedChannelSelected.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                },
                body: JSON.stringify({ password: this.protectedChannelPass})
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
                return
            } else if (res.status === 403) { // FORBIDDEN
                this.error = 'Wrong password'
                return
            }
            this.$emit('submit', this.protectedChannelSelected)
            /* this.visibleInput = false
            this.visible = false */
            this.hideModal()
            return
        }
    }
})
</script>

<template>
<button class="button is-primary is-outlined" @click="showModal()">
    Join a chan
</button>
<div class="modal is-active" v-if="visible">
    <div class="modal-background" @click="hideModal"></div>
    <div class="modal-content" v-if="!visibleInput">
        <div class="box">
            <div class="modal-title">
                <h1 style="font-weight: bold;">Join a Channel!</h1>
            </div>
            <div class="columns">
                <div class="column">
                    <button class="button is-success is-medium" @click="showPublicChannels">
                        Show Public Channel
                    </button>
                </div>
                <div class="column">
                    <button class="button is-success is-medium" @click="showProtectedChannels">
                        Show Protected Channel
                    </button>
                </div>
            </div>
            <div class="columns" v-if="visiblePublicChannel" v-for="channel in allChannels">
                <div class="column">
                    {{ channel.name }}
                </div>
                <div class="column">
                    <button class="button is-outlined is-small" @click="joinPublicChannel(channel)">
                        Join this Channel
                    </button>
                </div>
            </div>
            <div class="columns" v-if="visibleProtectedChannel" v-for="channel in allChannels">
                <div class="column">
                    {{ channel.name }}
                </div>
                <div class="column">
                    <button class="button is-outlined is-small" @click="showInput(channel)">
                        Join this Channel
                    </button>
                </div>
            </div>
        </div>
    </div>
    <div class="modal-content" v-if="visibleInput && protectedChannelSelected">
        <div class="box">
            <div class="columns">
                <div class="column" style="text-align: left">
                    <button class="button is-small is-rounded" @click="goBack">
                        <span class="icon is-small">
                            <font-awesome-icon icon="fas fa-solid fa-arrow-left" />
                        </span>
                        <span>
                            Back
                        </span>
                    </button>
                </div>
                <div class="column">
                    <div class="modal-title">
                        <h1 style="font-weight: bold;">{{ protectedChannelSelected.name }}</h1>
                    </div>
                </div>
                <div class="column"></div>
            </div>
            <label for="" class="label">Password:</label>
            <div class="field">
                <p class="control has-icons-left" >
                    <input class="input" type="password" placeholder="********" v-model="protectedChannelPass">
                    <span class="icon is-small is-left">
                        <font-awesome-icon icon="fas fa-lock" />
                    </span>
                </p>
            </div>
            <p style="color: red; text-align:left;" v-if="error">{{ error }}</p>
            <div class="columns">
                <button class="button is-success is-medium" style="margin-top: 20px;" @click="joinProtectedChannel(channel)">
                    <span>
                        Join this channel
                    </span>
                    <span class="icon is-small">
                        <font-awesome-icon icon="fas fa-solid fa-check" />
                    </span>
                </button>
            </div>
        </div>
    </div>
</div>
</template>

<style scoped>
    .button {
        margin: 5px;     
    }
</style>