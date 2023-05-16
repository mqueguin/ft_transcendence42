<script lang="ts">
import { defineComponent } from 'vue'
import { router } from '@/router'
import { useUsers } from '@/stores/users'
import { useCookies } from 'vue3-cookies'
import { useToast, POSITION } from 'vue-toastification'
import { useModal } from '@/composables/modal'

const { cookies } = useCookies()
const toast = useToast()

export default defineComponent({
    data: function () {
        return {
            data: '',
            success: ['', '', '', ''],
            error: ['', '', '', ''],
            usersStore: useUsers(),
            modal: useModal(),
            newLogin: '',
            oldLogin: '',
            newEmail: '',
            oldEmail: '',
            passwordUpdate: 0,
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            b_twoFa: false,
            b_twoAuth: false,
            qrcode: '',
            secret: '',
            googleCode: '',
            b_disableTwoAuth: false
        }
    },
    created: function () {
        this.getData()
    },
    methods: {
        getData: async function () {
            const res = await fetch(`http://localhost:3000/users/${this.usersStore.currentUserId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                }
            })
            if (res.status === 401) {
                router.push('/unauthorized')
                return ;
            } else if (res.status === 200) {
                const user = await res.json()
                this.data = user
                this.newLogin = user.login
                this.oldLogin = this.newLogin
                this.newEmail = user.email
                this.oldEmail = user.newEmail
                this.b_twoFa = user.twoFaAuth
            }
        },
        updateLogin: async function () {
            this.error[0] = ''
            this.success[0] = ''
            if (!this.newLogin.match(/^[a-zA-Z][a-zA-Z0-9._-]{4,15}$/)) {
                this.error[0] = 'This field must only contain between 4 and 15 letters, numbers or . _ -\nAnd must start with a letter'
                return
            } else if (this.newLogin === this.oldLogin) {
                this.error[0] = 'You already have this login'
                return
            } else {
                const res = await fetch(`http://localhost:3000/auth/users/${this.usersStore.currentUserId}/update-login`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${cookies.get('jwt_token')}`
                    },
                    body: JSON.stringify({ login: this.newLogin })
                })
                if (res.status === 401) {
                    router.push('/unauthorized')
                    return
                } else if (res.status === 409) {
                    this.error[0] = 'Error, This Login is already registered'
                    return 
                } else {
                    const data = await res.json()
                    cookies.remove('jwt_token')
                    cookies.set('jwt_token', data.newToken.Access_token, data.newToken.expiresIn)
                    this.oldLogin = this.newLogin
                }
            }
            toast.success('Your login has been updated !', {
                position: POSITION.TOP_CENTER
            })
            this.$emit('updateUser')
        },
        updateEmail: async function () {
            this.error[1] = ''
            this.success[1] = ''
            if (!this.newEmail.match(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/)) {
                this.error[1] = 'This field must be a valid email'
                return
            } else if (this.newEmail === this.oldEmail) {
                this.error[1] = 'You already have this email'
                return
            } else {
                const res = await fetch(`http://localhost:3000/users/update-email/${this.usersStore.currentUserId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${cookies.get('jwt_token')}`
                    },
                    body: JSON.stringify({ email: this.newEmail })
                })
                if (res.status === 401) {
                    router.push('/unauthorized')
                    return
                } else if (res.status === 409) {
                    this.error[1] = 'Error, This email is already registered'
                    return 
                } else {
                    const data = await res.json()
                    this.oldEmail = this.newEmail
                }
                toast.success('Your email has been updated !', {
                    position: POSITION.TOP_CENTER
                })
            }
        },
        updatePassword: async function () {
            this.error[2] = ''
            this.success[2] = ''
            if (!this.passwordUpdate) {
                this.passwordUpdate = 1
                return 
            } else if (this.passwordUpdate === 1) {
                this.error[2] = ''
                this.success[2] = ''
                if (!this.currentPassword) {
                    this.error[2] = 'The field must not be empty'
                    return
                } else {
                    const res = await fetch(`http://localhost:3000/users/check-password/${this.usersStore.currentUserId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${cookies.get('jwt_token')}`
                        },
                        body: JSON.stringify({ password: this.currentPassword })
                    })
                    if (res.status === 401) {
                        router.push('/unauthorized')
                        return
                    } else if (res.status === 403) { // 403 (FORBIDDEN)
                        this.error[2] = 'Wrong password'
                        return
                    } else {
                        this.passwordUpdate = 2
                        return
                    }
                }
            } else if (this.passwordUpdate === 2) {
                if (!this.newPassword.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,15}$/)) {
                    this.error[2] = 'Password must contain between 8 and 15 characters.\n At least one lowercase and one uppercase letters,\none number and one special character.'
                    return
                } else if (this.newPassword != this.confirmPassword) {
                    this.error[2] = 'This field must match the password.'
                    return
                } else {
                    const res = await fetch(`http://localhost:3000/users/update-password/${this.usersStore.currentUserId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${cookies.get('jwt_token')}`
                        },
                        body: JSON.stringify({ password: this.newPassword })
                    })
                    if (res.status === 401) {
                        router.push('/unauthorized')
                        return
                    } else {
                        toast.success('Your password has been updated !', {
                            position: POSITION.TOP_CENTER
                        })
                        this.passwordUpdate = 0
                    }
                }
            }
        },
        updatePicture: function () {
            this.modal.showModal('updatePicture')
        },
        handleTwoAuth: async function () {
            if (this.b_twoFa === true) {
                this.b_disableTwoAuth = true
                return
            }
            const res = await fetch(`http://localhost:3000/auth/2fa/generate/${this.usersStore.currentUserId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                },
                body: JSON.stringify({ email: this.newEmail })
            })
            if (res.status === 201) {
                const data = await res.json()
                this.qrcode = data.qrCode
                this.secret = data.otpauth.secret
                this.b_twoAuth = true
            }
        },
        DisableTwoAuth: async function () {
            this.error[3] = ''
            if (!this.googleCode) {
                this.error[3] = 'The code must not be empty.'
                return
            }
            const res = await fetch(`http://localhost:3000/auth/2fa/turn-off/${this.usersStore.currentUserId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                },
                body: JSON.stringify({ code: this.googleCode })
            })
            if (res.status === 403) {
                this.error[3] = 'Wrong authentication code.'
                return
            }
            this.getData()
            toast.success('Double authentication is now disabled !', {
                position: POSITION.TOP_CENTER
            })
            this.b_twoFa = false
            this.b_disableTwoAuth = false
        },
        ActiveTwoAuth: async function () {
            this.error[3] = ''
            if (!this.googleCode) {
                this.error[3] = 'The code must not be empty.'
                return
            }
            const res = await fetch(`http://localhost:3000/auth/2fa/turn-on/${this.usersStore.currentUserId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                },
                body: JSON.stringify({ code: this.googleCode })
            })
            if (res.status === 403) { // FORBIDDEN
                this.error[3] = 'Wrong authentication code.'
                return
            }
            this.getData()
            toast.success('Double authentication is now enabled !', {
                position: POSITION.TOP_CENTER
            })
            this.b_twoFa = true
            this.b_twoAuth = false
        },
        goToProfile: function () {
            router.push('/profile')
        }
    }
})
</script>

<template>
<div>
    <div class="section">
        <div class="container">
            <div class="box">
                <div class="columns">
                    <div class="column is-9 has-text-centered">
                        <h1 style="font-weight: bold; margin-top: 0; font-size: 40px;">Settings</h1>
                    </div>
                    <div class="column" style="text-align: end;">
                        <button class="button is-button is-rounded" @click="goToProfile()">
                            <span class="icon is-small">
                                <font-awesome-icon icon="fas fa-solid fa-arrow-left" />
                            </span>
                            <span>Back to my profile</span>
                        </button>
                    </div>
                </div>
                <div class="columns is-vcentered">
                    <div class="column has-text-centered">
                        <img class="imgProfile" :src="data.avatar" />
                    </div>
                    <div class="column has-text-centered pic-modif-space">
                        <button class="button pic-modif-button" @click="updatePicture()">
                            <span>Update your profile picture</span>
                            <span class="icon is-small">
                                <font-awesome-icon icon="fas fa-image" />
                            </span>
                        </button>
                    </div>
                </div>
                <div class="columns is-vcentered">
                    <div class="column">
                        <div class="field">
                            <label class="label" style="text-align:left;">Username</label>
                            <div class="control has-icons-left has-icon-right" >
                                <input class="input is-input" :class="{'is-danger':error[0], 'is-success': success[0]}" type="text" v-model="newLogin" placeholder="Your new Login" >
                                <span class="icon is-small is-left">
                                    <font-awesome-icon icon="fas fa-user" />
                                </span>
                            </div>
                        </div>
                        <p v-if="error[0]" class="help" style="text-align: left !important; color: #ff3860;">{{ error[0] }}</p>
                    </div>
                    <div class="column has-text-centered login-modif-space">
                        <button class="button login-modif-button" @click="updateLogin()">
                            <span>Update your login</span>
                        </button>
                    </div>
                </div>
                <div v-if="data.id42 === -1" class="columns is-vcentered">
                    <div class="column">
                        <div class="field">
                            <label class="label" style="text-align:left;">Email</label>
                            <div class="control has-icons-left has-icon-right" >
                                <input class="input is-input" :class="{'is-danger': error[1], 'is-success': success[1]}" type="text" v-model="newEmail" placeholder="exemple@exemple.com">
                                <span class="icon is-small is-left">
                                    <font-awesome-icon icon="fas fa-solid fa-envelope" />
                                </span>
                            </div>
                        </div>
                        <p v-if="error[1]" class="help" style="text-align: left !important; color: #ff3860;">{{ error[1] }}</p>
                    </div>
                    <div class="column has-text-centered email-modif-space">
                        <button class="button email-modif-button" @click="updateEmail()">
                            <span>Update your email</span>
                        </button>
                    </div>
                </div>
                <div v-if="data.id42 === -1" class="columns is-vcentered">
                    <div class="column">
                        <div v-if="!passwordUpdate" class="field">
                            <label class="label" style="text-align:left;">Password</label>
                            <div class="control has-icons-left has-icon-right" >
                                <input class="input is-input" type="password" value="********" disabled>
                                <span class="icon is-small is-left">
                                    <font-awesome-icon icon="fas fa-solid fa-lock" />
                                </span>
                            </div>
                        </div>
                        <div v-else-if="passwordUpdate === 1" class="field">
                            <label class="label" style="text-align:left;">Type your current password</label>
                            <div class="control has-icons-left has-icon-right" >
                                <input class="input is-input" :class="{'is-danger': error[2], 'is-success': success[2]}" type="password" v-model="currentPassword">
                                <span class="icon is-small is-left">
                                    <font-awesome-icon icon="fas fa-solid fa-lock" />
                                </span>
                            </div>
                        </div>
                        <div v-else-if="passwordUpdate === 2" class="field">
                            <label class="label" style="text-align:left;">Type your new password</label>
                            <div class="control has-icons-left has-icon-right" >
                                <input class="input is-input" :class="{'is-danger': error[2], 'is-success': success[2]}" type="password" v-model="newPassword">
                                <span class="icon is-small is-left">
                                    <font-awesome-icon icon="fas fa-solid fa-lock" />
                                </span>
                            </div>
                            <label class="label" style="text-align:left;">Confirm your new password</label>
                            <div class="control has-icons-left has-icon-right" >
                                <input class="input is-input" :class="{'is-danger': error[2], 'is-success': success[2]}" type="password" v-model="confirmPassword">
                                <span class="icon is-small is-left">
                                    <font-awesome-icon icon="fas fa-solid fa-lock" />
                                </span>
                            </div>
                        </div>
                        <p v-if="error[2]" class="help" style="text-align: left !important; color: #ff3860;">{{ error[2] }}</p>
                    </div>
                    <div class="column has-text-centered pass-modif-space">
                        <button v-if="!passwordUpdate" class="button pass-modif-button" @click="updatePassword()">
                            <span>Update your password</span>
                        </button>
                        <button v-else-if="passwordUpdate === 1" class="button" @click="updatePassword()">
                            <span>Check your password</span>
                        </button>
                        <button v-else-if="passwordUpdate === 2" class="button" @click="updatePassword()">
                            <span>Update your new password</span>
                        </button>
                    </div>
                </div>
                <div class="columns is-vcentered">
                    <div class="column">
                        <label class="label">Double authentification</label>
                        <button v-if="!b_twoFa" class="button" @click="handleTwoAuth()">
                            <span >Enable two Factor Authentification</span>
                        </button>
                        <button v-else class="button" @click="handleTwoAuth()">
                            <span>Disable two Factor Authentification</span>
                        </button>
                    </div>
                    <div v-if="b_twoAuth" class="column">
                        <p>Please keep this secret code: <strong>{{ secret }}</strong></p>
                        <br />
                        <img :src="qrcode" />
                        <p>If you are unable to scan the QR code in the google authentificator application , please enter this code manually into the app.</p>
                        <div class="field">
                            <label class="label" style="text-align:left;">To finish security verification and enable Google Authenticator, please enter the 6 digit code from Google Authenticator</label>
                            <div class="control has-icons-left has-icon-right" >
                                <input class="input is-input is-small" :class="{'is-danger': error[3], 'is-success': success[3]}" type="googlecode" v-model="googleCode">
                                <span class="icon is-small is-left">
                                    <font-awesome-icon icon="fas fa-solid fa-lock" />
                                </span>
                            </div>
                        </div>
                        <p v-if="error[3]" class="help" style="text-align: left !important; color: #ff3860;">{{ error[3] }}</p>
                        <br/>
                        <button class="button" @click="ActiveTwoAuth()">
                            <span>Active two Factor Authentification</span>
                        </button>
                    </div>
                    <div v-if="b_disableTwoAuth" class="column">
                        <div class="field">
                            <label class="label" style="text-align:left;">For disable Google authenticator, please enter the 6 digit code from Google Authenticator</label>
                            <div class="control has-icons-left has-icon-right" >
                                <input class="input is-input is-small" :class="{'is-danger': error[3], 'is-success': success[3]}" type="googlecode" v-model="googleCode">
                                <span class="icon is-small is-left">
                                    <font-awesome-icon icon="fas fa-solid fa-lock" />
                                </span>
                            </div>
                        </div>
                        <p v-if="error[3]" class="help" style="text-align: left !important; color: #ff3860;">{{ error[3] }}</p>
                        <br />
                        <button class="button is-danger" @click="DisableTwoAuth()">
                            <span>Disable double Auth</span>
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    </div>
</template>

<style scoped>

.pic-modif-button:hover {
	box-shadow: 0 12px 16px 0 rgba(0,0,0,0.24), 0 1px 20px 0 rgba(0,0,0,0.19);

}
.login-modif-space {
	padding: none;
	width: 561px;
	height: 106px;
}

.login-modif-button {
	margin-top: 32px;
	background-color: white;
	width: 243.833px;
}

.login-modif-button:hover {
  box-shadow: 0 12px 16px 0 rgba(0,0,0,0.24), 0 1px 20px 0 rgba(0,0,0,0.19);
}

.email-modif-space {
	padding: none;
	width: 561px;
	height: 106px;
}

.email-modif-button {
	margin-top: 32px;
	background-color: white;
	width: 243.833px;
}

.email-modif-button:hover {
	box-shadow: 0 12px 16px 0 rgba(0,0,0,0.24), 0 1px 20px 0 rgba(0,0,0,0.19);
}

.pass-modif-space {
	padding: none;
	width: 561px;
	height: 106px;	
}

.pass-modif-button {
	margin-top: 32px;
	background-color: white;
}

.pass-modif-button:hover {
  box-shadow: 0 12px 16px 0 rgba(0,0,0,0.24), 0 1px 20px 0 rgba(0,0,0,0.19);
}

.imgProfile {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    object-fit: cover;
    margin: auto;
}
</style>