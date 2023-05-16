<script lang="ts">
import { defineComponent } from 'vue'
import { useUsers } from '@/stores/users'
import { useCookies } from 'vue3-cookies'

const { cookies } = useCookies()

export default defineComponent({
    name: 'Unauthorized',
    emits: ['updateUser', 'userLogout'],
    props: ['socketNotifications'],
    data: function () {
        return {
            usersStore: useUsers()
        }
    },
    created: function () {
        cookies.remove('jwt_token')
        localStorage.removeItem('currentUserId')
        this.usersStore.currentUserId = undefined
        if (this.socketNotifications !== null) {
            this.socketNotifications.close()
        }
        this.$emit('userLogout')
        setTimeout(() => {
            // Redirige le user vers la page d'accueil au bout de 3s
            this.$router.push('/Pong')
        }, 7000)
    }
})
</script>

<template>
    <div class="section">
        <div class="box error-box">
            <div class="title">
                <h1 class="401error" id="flame">Unauthorized (401)</h1>
            </div>
            <div class="comment" id="flame">
                <p>No valid authentication credentials for the requested resource.</p>
            </div>
        </div>

    </div>
</template>

<style scoped>

.section {
    display: flex;
    align-items: center;
    justify-content: center;
}

.error-box {
    background-color: #000;
    border-radius: 10px;
    padding: 20px;
    width: 50%;
    height: 50%;
    align-items: center;
    justify-content: center;
}


#flame {
    font-family: “Open Sans”, sans-serif;
    color: #f5f5f5;
    text-shadow: 0px -2px 4px #fff, 0px -2px 10px #FF3, 0px -10px 20px #F90, 0px -20px 40px #C33;
    font-size: 100px;
}

.container {
    height: 100vh;
    width: 100vw;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
}

.title {
    display: flex;
    align-items: center;
    justify-content: center;
}

.title h1 {
    font-weight: bold;
    font-size: xx-large;
    color: rgb(38, 213, 38);
}

.comment {
    display: flex;
    align-items: center;
    justify-content: center;
}

p {
    font-weight: bold;
    color: white;
    font-size: x-large;
}
</style>