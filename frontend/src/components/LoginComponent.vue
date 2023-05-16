<script lang="ts">
import { defineComponent } from 'vue'
import { useModal } from '../composables/modal';

export default defineComponent({
	data: function () {
		return {
			modal: useModal()
		}
	}
})
</script>

<template>
<h1 class="title">Transcendence</h1>
<div class="field" style="text-align: center;">
	<div class="ping"></div>
	<div class="pong"></div>
	<div class="ball"></div>
</div>
	<div class="buttons">
		<button class="buttonSignin button is-rounded is-large is-hovered" @click="modal.showModal('signUp')">Sign Up</button>
		<button class="buttonSignup button is-rounded is-large is-hovered" @click="modal.showModal('signIn')">Log In</button>
	</div>


<teleport to="#modal">
		<component :is="modal.component" />
</teleport>
</template>

<style lang="scss" scoped>

$black: #000000;
$white: #ffffff;

.buttonSignup {
	right:20%;
	top: 70%;
}

.buttonSignin {
	left: 20%;
	top: 70%;
}

.buttonSignin, .buttonSignup {
	position: absolute;
	text-align: center;
	width: 25%;
	background-color: #3a332c;
	color: #f4f2f0;
	font-weight: bold;
}
.title {
	position: absolute;
    text-align: center;
    color: #2c6d69;
    left: 0;
	right: 0;
	margin: auto;
	top: 200px;
}

// Big screen
@media screen and (min-width: 1401px) {
	.title {
		top: 150px;
		font-size: 150px;
	}
	.buttonSignin, .buttonSignup {
		font-size: 30px;
	}
}

// Medium screen
@media screen and (min-width: 801px) and (max-width: 1400px) {
    .title {
        font-size: 100px;
    }
	.buttonSignin, .buttonSignup {
		font-size: 25px;
	}
}

// Little screen
@media screen and (max-width: 800px) and (min-width: 451px) {
    .title {
        font-size: 60px;
    }
	.buttonSignin, .buttonSignup {
		font-size: 20px;
	}
}

// Very little screen X)
@media screen and (max-width: 450px) {
	.title {
		font-size: 40px;
	}
	.buttonSignin, .buttonSignup {
		font-size: 15px;
	}
}

.field {
	width: 60%;
	height: 300px;
	position: absolute;
    top: 340px;
	left: 0;
	right: 0;
	margin: auto;
	
	.ping, .pong {
		width: 16px;
		height: 100px;
		
		position: absolute;
		
		background: $black;
	}
	
	.ping {
		left: 6%;
		animation: ping 6s infinite linear;
	}
	
	.pong {
		right: 6%;
		animation: pong 6s infinite linear;
	}
	
	.ball {
		width: 10px;
		height: 10px;
		
		position: absolute;
		background: $black;
		
		animation: ball 6s infinite linear;
	}
}

@keyframes ball {
	0% {
		top: 34%;
		left: 52%;
	}
	8.3% {
		top: 52%;
		left: 90%;
	}
	24.9% {
		top: 85%;
		left: 8%;
	}
	30% {
		top: 98%;
		left: 27%;
	}
	41.5% {
		top: 70%;
		left: 90%;
	}
	58.1% {
		top: 55%;
		left: 8%;
	}
	74.7% {
		top: 13%;
		left: 90%;
	}
	79% {
		top: 1%;
		left: 70%;
	}
	91.3% {
		top: 22%;
		left: 8%;
	}
	100% {
		top: 34%;
		left: 52%;
	}
}

@keyframes ping {
	0% {
		top: 10%;
	}
	5% {
		top: 10%;
	}
	9% {
		top: 24%;
	}
	13% {
		top: 17%;
	}
	24.9% {
		top: 82%;
	}
	47% {
		top: 37%;
	}
	52% {
		top: 41%;
	}
	56% {
		top: 64%;
	}
	58.1% {
		top: 54%;
	}
	70% {
		top: 74%;
	}
	84% {
		top: 12%;
	}
	91.3% {
		top: 18%;
	}
	100% {
		top: 10%;
	}
}

@keyframes pong {
	0% {
		top: 90%;
	}
	8.3% {
		top: 51%;
	}
	20% {
		top: 60%;
	}
	25% {
		top: 34%;
	}
	41.5% {
		top: 68%;
	}
	46% {
		top: 36%;
	}
	52% {
		top: 18%;
	}
	58.1% {
		top: 53%;
	}
	66% {
		top: 14%;
	}
	70% {
		top: 20%;
	}
	74.7% {
		top: 10%;
	}
	91.3% {
		top: 10%;
	}
	100% {
		top: 90%;
	}
}
</style>