<script lang="ts">
import { defineComponent } from 'vue'
import { useModal } from '../composables/modal'
import { useUsers } from '@/stores/users'
import { useCookies } from 'vue3-cookies'
import { useToast, POSITION } from 'vue-toastification'
import { router } from '@/router'

const { cookies } = useCookies()
const toast = useToast()

export default defineComponent({
    name: 'FirstConnection',
    props: ['socketNotifications'],
    emits: ['updateNavbar'],
    data: function () {
        return {
            modal: useModal(),
            usersStore: useUsers(),
            step: 0,
            data: '',
            selectedFileName: '',
            imageUrl: '',
            file: null,
            b_doubleAuth: false,
            buttonEnableDoubleAuth: true,
            newLogin: '',
            oldLogin: '',
            error: ['', ''],
            success: '',
            secret: '',
            googleCode: '',
            qrcode: '',
            email: '',
            query: '',
            searchResults: [] as any[],
	        requestSent: [] as boolean[],
			index: -1,
            socket: null
        }
    },
    created: async function () {
        this.userData()
    },
    methods: {
        updateSelectedFileName: function ($event: any) {
            this.selectedFileName = $event.target.files[0].name
            this.file = $event.target.files[0]
            this.readImage($event.target.files[0])
        },
        readImage: function (file: File) {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = (event: any) => {
                this.imageUrl = event.target.result
            }
        },
        userData: async function () {
            const res = await fetch(`http://localhost:3000/users/${this.usersStore.currentUserId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                }
            })
            if (res.status === 401) {
                this.modal.hideModal()
                this.$router.push('/unauthorized')
                // Mettre un message d'erreur qui s'affiche a l'ecran
                return
            } else if (res.status === 200) {
                const user = await res.json()
                this.newLogin = user.login
                this.oldLogin = user.login
                this.data = user
                this.b_doubleAuth = user.twoFaAuth
                this.email = user.email
            }
        },
        uploadPicture: async function () {

            if (!this.imageUrl || !this.file)
                return ;
            let formData = new FormData()
            formData.append('file', this.file)
            // Request for upload new profil picture
            const res = await fetch(`http://localhost:3000/users/${this.usersStore.currentUserId}/update/picture`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                },
                body: formData
            })

            if (res.status === 401) {
                this.modal.hideModal()
                this.$router.push('/unauthorized')
                return
            }
            this.$emit('updateNavbar')
        },
        updateCheckbox: function () {
            if (this.b_doubleAuth === false) {
                this.b_doubleAuth = true;
            } else {
                this.b_doubleAuth = false;
            }
        },
        checkLogin: async function () {
            this.error[0] = '' // On remet a 0 les erreurs
            this.success = ''
            if (!this.newLogin.match(/^[a-zA-Z][a-zA-Z0-9._-]{4,15}$/)) {
                this.error[0] = 'This field must only contain between 4 and 15 letters, numbers or . _ -\nAnd must start with a letter'
                return
            } else if (this.newLogin === this.oldLogin) {
                this.error[0] = 'You already have this login'
                return 
            } else {
                const res = await fetch(`http://localhost:3000/users/check-login-availability/${this.newLogin}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })

                if (res.status === 409) {
                    this.error[0] = 'This login is not available'
                } else if (res.status === 200) {
                    this.success = 'This login is available'
                }
            }
        },
        updateLogin: async function (): Promise<boolean> {
            if (this.oldLogin != this.newLogin && !this.success && !this.error[0]) {
                this.error[0] = 'You must click on the button to verify your login before going to the next step'
                return false
            }
            if (this.newLogin != this.oldLogin && this.success && !this.error[0]) {
                const res = await fetch(`http://localhost:3000/auth/users/${this.usersStore.currentUserId}/update-login`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${cookies.get('jwt_token')}`
                    },
                    body: JSON.stringify({ login: this.newLogin })
                })
                if (res.status === 401){
                    this.modal.hideModal()
                    this.$router.push('/unauthorized')
                    return false
                } else {
                    const data = await res.json()
                    cookies.remove('jwt_token')
                    cookies.set('jwt_token', data.newToken.Access_token, data.newToken.expiresIn)
                    this.$emit('updateNavbar')
                    this.userData()
                }
            }
            return true
        },
        handleSubmit: async function () {
            if (this.step === 0) {
                this.step = 1
            } else if (this.step === 1) {
                this.uploadPicture()
                this.step = 2
            } else if (this.step === 2) {
                if (await this.updateLogin() === false) {
                    return
                }
                this.step = 3
			}
        },
        handleDoubleAuth: async function () { // Recover qrcode en secret code for double auth
            const res = await fetch(`http://localhost:3000/auth/2fa/generate/${this.usersStore.currentUserId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                },
                body: JSON.stringify({ email: this.email })
            })
            if (res.status === 201) {
                const data = await res.json()
                this.qrcode = data.qrCode
                this.secret = data.otpauth.secret
                this.b_doubleAuth = true
                this.buttonEnableDoubleAuth = false
            }
        },
        enableDoubleAuth: async function () {
            this.error[1] = ''
            if (!this.googleCode) {
                this.error[1] = 'The code must not be empty.'
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
                this.error[1] = 'Wrong authentication code.'
                return
            }
            toast.success('Double authentication is now enabled !', {
                position: POSITION.TOP_RIGHT
            })
            this.b_doubleAuth = false
            this.buttonEnableDoubleAuth = false
        },
        searchUsers: async function () {
            const res = await fetch(`http://localhost:3000/users/search-users?login=${this.query}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                }
            })
            if (res.status === 401) { // Unauthorize
                router.push('/unauthorized')
                return
            }
            this.searchResults = await res.json()
			this.requestSent = Array(this.searchResults.length).fill(false)
        },
		redirectToLink: function (item: any) {
		    this.$router.push({path: '/profile/' })
		},
		sendRequest: async function (index: number, id: string) {
            const res = await fetch('http://localhost:3000/friends/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                },
                body: JSON.stringify({ userAId: this.usersStore.currentUserId, userBId: id })
            })
            if (res.status === 401) { // Unauthorize
                router.push('/unauthorized')
                return
            } else if (res.status === 409) { // CONFLICT
                const error = await res.json()
                const message = error.message
                toast.error(`${message}`, {
                    position: POSITION.TOP_RIGHT
                })
                return
            } else {
                this.socketNotifications.emit('sendFriendRequest', { requesterId: this.usersStore.currentUserId, recipientId: id })
			    this.requestSent.splice(index, 1, true)
            }
        },
    }
})
</script>

<template>
    <!-- First Step -->
    <div v-if="step === 0" class="content">
        <h1 class="modal-card-title">Welcome {{ data.login }} to Transcendence!</h1>
        <section class="modal-card-body">
            <h2>Before you start playing with your friends, you can complete your profile</h2>
            <img src="../assets/logo42.png">
        </section>
        <div class="footerModal">
            <button class="button is-large is-responsive is-success" @click="handleSubmit()">Let's go</button>
        </div>
    </div>

    <!-- Second Step -->
    <div v-else-if="step === 1" class="content">
        <h1 class="modal-card-title">You can change your profile picture!</h1>
        <figure>
            <img class="imgProfile" alt="Profile picture" :src="(imageUrl ? imageUrl : data.avatar)" />
        </figure>
        <div class="file has-name is-centered is-info">
            <label class="file-label">
                <input class="file-input" accept=".jpg, .jpeg, .png" type="file" name="resume" @change="updateSelectedFileName($event)">
                <span class="file-cta">
                    <span class="file-icon">
                        <font-awesome-icon icon="fas fa-upload" />
                    </span>
                    <span class="file-label">
                        Choose a picture (.jpg, .jpeg, .png)…
                    </span>
                </span>
                <span class="file-name" style="color: black;">
                    {{ selectedFileName ? selectedFileName : "No file selected..." }}
                </span>
            </label>
        </div>
        <div style="text-align: center; margin: 0.5em;">
            <button class="button is-focused is-medium is-responsive is-success" @click="handleSubmit()">
                <span>Save & Next</span>
                <span class="icon is-small">
                    <font-awesome-icon icon="fa-solid fa-arrow-right" />
                </span>
            </button>
        </div>
        <p class="step">(Step 1 of 3)</p>
    </div>

    <!-- Third Step -->
    <div v-else-if="step === 2" class="content">
        <h1 class="modal-card-title">Do you want to activate the double authentication?</h1>
        <div class="field">
            <button v-if="buttonEnableDoubleAuth" class="button is-medium is-success" @click="handleDoubleAuth()">
                <span>Enable double authentication</span>
            </button>
            <div v-if="b_doubleAuth" style="margin-top: 20px;">
                <p style="color: gray;">Please keep this secret code: <strong>{{ secret }}</strong></p>
                <br />
                <img :src="qrcode" />
                <p style="color: gray;">If you are unable to scan the QR code in the google authentificator application , please enter this code manually into the app.</p>
                <div class="field">
                    <label class="label" style="text-align:left;">To finish security verification and enable Google Authenticator, please enter the 6 digit code from Google Authenticator</label>
                    <div class="control has-icons-left has-icon-right" >
                        <input class="input is-input is-small" :class="{'is-danger': error[1] }" type="googlecode" v-model="googleCode">
                        <span class="icon is-small is-left">
                            <font-awesome-icon icon="fas fa-solid fa-lock" />
                        </span>
                    </div>
                </div>
                <p v-if="error[1]" class="help" style="text-align: left !important; color: #ff3860;">{{ error[1] }}</p>
                <br/>
                <button class="button is-primary is-medium" @click="enableDoubleAuth()">
                    <span>Activate double authentication</span>
                </button>
            </div>
        </div>
        <div class="field" v-if="(data.id42 != -1)">
            <label class="label" style="text-align: left !important;">Change your 42 Login</label>
            <div class="columns">
                <div class="column is-three-quarters">
                    <div class="control has-icons-left has-icons-right">
                        <input class="input is-input" :class="{'is-danger': error[0], 'is-success': success}" type="text" v-model="newLogin" placeholder="Your new Login" >
                        <span class="icon is-small is-left">
                            <font-awesome-icon icon="fas fa-user" />
                        </span>
                        <span v-if="success" class="icon is-small is-right">
                            <font-awesome-icon icon="fas fa-check" />
                        </span>
                        <span v-else-if="error[0]" class="icon is-small is-right">
                            <font-awesome-icon icon="fas fa-xmark" />
                        </span>
                    </div>
                </div>
                <div class="column">
                    <a class="button is-success" @click="checkLogin()">Check login</a>
                </div>
            </div>
            <p v-if="error[0]" class="help" style="text-align: left !important; color: #ff3860;">{{ error[0] }}</p>
            <p v-else-if="success" class="help is-success" style="text-align: left !important; color: #23d160;">{{ success }}<!-- This username is available --></p>
        </div>
        <div style="text-align: center; margin: 0.5em;">
            <button class="button is-focused is-medium is-responsive is-success" @click="handleSubmit()">
                <span>Save & Next</span>
                <span class="icon is-small">
                    <font-awesome-icon icon="fa-solid fa-arrow-right" />
                </span>
            </button>
        </div>
        <p class="step">(Step 2 of 3)</p>
    </div>

    <!-- Fourth step -->
    <div v-else-if="step === 3" class="content">
        <h1 class="modal-card-title">Add your friends who are already registered on Transcendence!</h1>
		<input class="searchBar" type="text" v-model="query" @input="searchUsers" placeholder="search your friends">
		<ul v-if="searchResults.length">
            <li v-for="(result, $index) in searchResults" style="color: black;">
				<div class="container" v-if="result.login !== data.login">
					<img class="img" :src="result.avatar" />
						<p style="margin-top: 12.5px; margin-bottom: 12.5px;">
							{{ result.login }}
						</p>
					<button id="button2" class="button is-pulled-right is-rounded" :disabled="requestSent[$index]" v-on:click="sendRequest($index, result.id)">{{ requestSent[$index] ? 'Request Sent' : 'Add Friend' }}</button>
				</div>	
			</li>
        </ul>
        <div class="columns is-centered" style="margin-top: 20px;">
            <button class="button is-success is-large" @click="modal.hideModal()">
                <span>Finish</span>
                <span class="icon is-small">
                    <font-awesome-icon icon=" fas fa-solid fa-check" style="color: white;" />
                </span>
            </button>
        </div>
    </div>
</template>

<style scoped>

button {
    margin-top: 20px;
}
.container {
	width: 400px;
	height: 50px;
	display: flex;
	align-items: center;
}

.img {
    border-radius: 50%;
    object-fit: cover;
    width: 50px;
    height: 50px;
	margin-right: 15px;
}

#button2 {
	width: 100px;
	margin-left: auto;
}

ul, li {
	list-style-type: none;
}

.searchBar {
	margin-bottom: 10px;
	margin-top: 30px;
	border: none;
	background-color: rgba(128,128,128,0.1);
	padding: 10px;
	border-radius: 10px;
}

.searchBar::placeholder {
	margin-bottom: 10px;
}

.fa-check {
    color: #23d160;
}

.fa-xmark {
    color: #ff3860;
}

.content {
	background: white;
	padding: 30px;
	margin-top: 60px;
	flex-direction: column;
	justify-content: center;
	align-items: center;
    text-align: center;
}

.footerModal {
    align-items: flex-start;
}

.step {
    color: black;
}

.imgProfile {
    border-radius: 50%;
    object-fit: cover;
    width: 350px;
    height: 350px;
    border: 2px solid gray;
}
</style>