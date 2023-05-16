<script lang="ts">
import { useUsers } from '@/stores/users'
import { useCookies } from 'vue3-cookies'
import { defineComponent } from 'vue'
import { router } from '@/router'
import { useToast, POSITION } from 'vue-toastification'
import { useModal } from '@/composables/modal'

const { cookies } = useCookies()
const toast = useToast()

export default defineComponent({
    name: 'UpdatePicture',
    emits: ['updateNavbar'],
    data: function () {
        return {
            usersStore: useUsers(),
            modal: useModal(),
            avatar: '',
            imageUrl: '',
            selectedFileName: '',
            file: null
        }
    },
    created: function () {
        this.getPicture()
    },
    methods: {
        getPicture: async function () {
            const res = await fetch(`http://localhost:3000/users/get-picture/${this.usersStore.currentUserId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                },
            })
            if (res.status === 401) {
                router.push('/unauthorized')
                return
            } else {
                const data = await res.json()
                this.avatar = data.avatar
            }
        },
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
                router.push('/unauthorized')
                return
            } else {
                this.$emit('updateNavbar')
                toast.success('Your profile picture has been updated !', {
                    position: POSITION.TOP_CENTER
                })
            }
        }
    }
})
</script>

<template>
    <div class="content">
        <h1 class="modal-card-title">Update your profile picture !</h1>
        <figure>
            <img class="imgProfile" alt="Profile picture" :src="(imageUrl ? imageUrl : avatar)" />
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
        <div style="text-align: center; margin-top: 20px;">
            <button class="button is-focused is-medium is-responsive is-success" @click="uploadPicture()">
                <span>Update!</span>
                <span class="icon is-small">
                    <font-awesome-icon icon="fa-solid fa-check" />
                </span>
            </button>
        </div>
    </div>
</template>

<style scoped>
.content {
	background: white;
	padding: 30px;
	margin-top: 60px;
	flex-direction: column;
	justify-content: center;
	align-items: center;
    text-align: center;
}
.imgProfile {
    border-radius: 50%;
    object-fit: cover;
    width: 350px;
    height: 350px;
    border: 2px solid gray;
}
</style>