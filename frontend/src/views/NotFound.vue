<script lang="ts">
import { defineComponent } from 'vue'
import { useCookies } from 'vue3-cookies'

const { cookies } = useCookies()

export default defineComponent({
    emits: ['updateUser'], 
    created: function () {
        setTimeout(() => {
            // Redirige le user vers la page d'accueil au bout de 3s
            this.$router.push('/Pong')
        }, 3000)
    }
})
</script>

<template>
	<div class="section" >
        <div class="box error-box">
            <div class="title">
                <h1 class="401error" id="flame-title">NOT FOUND (404)</h1>
            </div>
            <div class="comment" id="flame-comment">
                <p>Page not found</p>
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

#flame-title {
    font-family: “Open Sans”, sans-serif;
    color: #f5f5f5;
    text-shadow: 0px -2px 4px #fff, 0px -2px 10px #FF3, 0px -10px 20px         #F90, 0px -20px 40px #C33;
    font-size: 75px;
    }

#flame-comment {
	font-family: “Open Sans”, sans-serif;
	color: #f5f5f5;
	text-shadow: 0px -2px 4px #fff, 0px -2px 10px #FF3, 0px -10px 20px         #F90, 0px -20px 40px #C33;
	font-size: 40px;
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
.comment {
    display: flex;
    align-items: center;
    justify-content: center;
}

</style>