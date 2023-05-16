<script lang="ts">
import { defineComponent } from 'vue'
import { useUsers } from '@/stores/users'
import { useCookies } from 'vue3-cookies'
import { router } from '@/router';
import io from 'socket.io-client'
import GameComponent from '@/components/Game.vue';
import { useToast, POSITION } from 'vue-toastification'

const { cookies } = useCookies()
const toast = useToast()

export default defineComponent({
	name: 'ProfileComponent',
	components: {
		GameComponent
	},
	props: ['profileLogin', 'socketNotifications'],
	data: function () {
		return {
			data: '',
			friends: {},
			usersStore: useUsers(),
			settings: false,
			newLogin: '',
			oldLogin: '',
			success: '',
			error: '',
			socket: {},
			isModalVisible: false,
			isModalFunModeVisible: false,
			isModalPrvVisible: false,
			isModalPrvFunVisible: false,
			opponent: null,
			isMatchFound: false,
			gameStarted: false,
			isFunMatch: false,
			player: '',
			userId: useUsers().currentUserId,
			roomId: '',
			role: '',
			opponentId: '',
			timeoutId: null,
			classicMatches: null,
			funMatches: null,
			isSpectator: false,
			noClassicMatches: false,
			noFunMatches: false,
		}
	},
	mounted: function () {
		// Check if user is enter in the matchmaking queue
		this.socket.on('UserEnterInTheQueue', (data: any) => {
			if (data.gameMode === 'CLASSIC') {
				this.isModalVisible = true
			} else if (data.gameMode === 'FUNMODE') {
				this.isModalFunModeVisible = true
			}
		})
		this.socket.on('matchFound', async (data: any) => {
			this.opponent = data.opponent
			this.isMatchFound = true
			this.player = data.player
			this.roomId = data.roomId
			this.role = data.role
			this.opponentId = data.opponentId
			if (data.gameMode === 'FUNMODE') {
				this.isFunMatch = true
			}

			const res = await fetch('http://localhost:3000/users/in-game', {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				}
			})
			this.socketNotifications.emit('inGame', { userId: this.usersStore.currentUserId })
			this.timeoutId = setTimeout(() => {
				this.gameStarted = true
				this.isModalVisible = false
				this.isModalFunModeVisible = false
				this.isModalPrvVisible = false
				this.isModalPrvFunVisible = false
				this.socketNotifications.emit('newMatch')
			}, 3000)
		})
		this.socket.on('matchCancelled', async (data: any) => {
			if (this.timeoutId !== null) {
				clearTimeout(this.timeoutId)
				this.timeoutId = null
			}
			const res = await fetch('http://localhost:3000/users/not-in-game', {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				}
			})
			this.socketNotifications.emit('notInGame', { userId: this.usersStore.currentUserId })
			if (data.gameMode === 'CLASSIC') {
				this.socket.emit('joinMatchmaking', { gameMode: 'CLASSIC', userId: this.usersStore.currentUserId })
			} else if (data.gameMode === 'FUNMODE') {
				this.socket.emit('joinMatchmakingFunMode', { gameMode: 'FUNMODE', userId: this.usersStore.currentUserId })
			}
			this.opponent = null
			this.isMatchFound = false
			this.isFunMatch = false
			this.gameStarted = false
			this.socketNotifications.emit('newMatch')
		})

		this.socket.on('privateMatchCancelled', async () => {
			if (this.timeoutId !== null) {
				clearTimeout(this.timeoutId)
				this.timeoutId = null
			}
			const res = await fetch('http://localhost:3000/users/not-in-game', {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				}
			})
			this.socketNotifications.emit('notInGame', { userId: this.usersStore.currentUserId })
			this.isModalPrvFunVisible = false
			this.isModalPrvVisible = false
			this.opponent = null
			this.isMatchFound = false
			this.isFunMatch = false
			this.gameStarted = false
		})

		this.socket.on('newAchievment', () => {
			toast.success('You have unlocked a new success!', {
				position: POSITION.TOP_CENTER
			})
		})

		if (this.socketNotifications !== null) {
			// For check with socket if the users are online or offline
			this.socketNotifications.on('userChangeStatus', (data: any) => {
				for (let i = 0; i < this.friends.length; i++) {
					if (this.friends[i].id === data.id) {
						this.friends[i].isOnline = data.status
						break;
					}
				}
			})
			this.socketNotifications.on('updateMatchInProgress', async () => {
				await this.getClassicMatches()
				await this.getFunMatches()
			})
		}
	},
	created: async function () {
		this.socket = io('http://localhost:4343', {
			query: {
				userId: this.usersStore.currentUserId
			},
			withCredentials: true,
		})
		this.socket.on('connect', () => {
			;
		})
		if (!this.profileLogin) {
			this.getData()
			this.getFriends(this.usersStore.currentUserId)
		} else {
			this.getDataUser()
		}
		await this.getClassicMatches()
		await this.getFunMatches()
		if (this.$route.params.id) {
			if (this.$route.name === 'PongClassic') {
				this.privateClassicGame(parseInt(this.$route.params.id))
			} else if (this.$route.name === 'PongFun') {
				this.privateFunGame(parseInt(this.$route.params.id));
			}
		} else if (this.$route.params.matchId) {
			if (this.$route.name === 'PongJoin') {
				this.joinPrivateGame(this.$route.params.matchId)
			} else if (this.$route.name === 'PongJoinFun') {
				this.joinPrivateFunGame(this.$route.params.matchId)
			}
		}
		router.replace('/')
	},
	beforeUnmount: async function () {
		this.socket.off('playerReady')
		if (this.data === 'INGAME') {
			const res = await fetch('http://localhost:3000/users/not-in-game', {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				}
			})
			if (res.status === 401) {
				router.push('/unauthorized')
				return
			}
			this.socketNotifications.emit('notInGame', { userId: this.usersStore.currentUserId })
		}
	},
	unmounted: function () {
		this.socketNotifications.emit('notInGame', { userId: this.usersStore.currentUserId })
		this.socket.disconnect()
	},
	watch: {
		'$route': function(to, from) {
			if (to.name === 'PongClassic') {
				this.privateClassicGame(parseInt(to.params.id))
			} else if (to.name === 'PongFun') {
				this.privateFunGame(parseInt(to.params.id));
			} else if (to.name === 'PongJoin') {
				this.joinPrivateGame(to.params.matchId)
			} else if (to.name === 'PongJoinFun') {
				this.joinPrivateFunGame(to.params.matchId)
			}
			router.replace('/')
    	}
	},
	methods: {
		joinPrivateGame: async function (matchId: string) {
			this.socket.emit('joinPrivateMatch', { matchId: matchId, player: '2', player2Login: this.data.login })
			this.socket.on('joinPrivateMatchResponse', (success) => {
				if (success) {
					this.isModalPrvVisible = true
				} else {
					this.isModalPrvVisible = false
				}
			})
		},
		joinPrivateFunGame: function (matchId: string) {
			this.socket.emit('joinPrivateMatch', { matchId: matchId, player: '2', player2Login: this.data.login })
			this.socket.on('joinPrivateMatchResponse', (success) => {
				if (success) {
					this.isModalPrvFunVisible = true
				} else {
					this.isModalPrvFunVisible = false
				}
			})
		},
		privateFunGame: async function (opponentId: number) {
			this.isModalPrvFunVisible = true
			const res = await fetch('http://localhost:3000/games/create-match', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				},
				body: JSON.stringify({ opponentId: opponentId, gameMode: 'FUNMODE', gameStatus: 'WAITING' })
			})
			if (res.status === 401) {
				router.push('/unauthorized')
				return
			} else if (res.status === 400) {
				const error = await res.json()
				toast.error(`${error.message}`, {
					position: POSITION.TOP_RIGHT
				})
				this.isModalPrvVisible = false
				return
			}
			const data = await res.json()
			const id = data.id
			this.socket.emit('joinPrivateMatch', { matchId: data.id, player: '1' })
			this.socket.on('joinPrivateMatchResponse', (success) => {
				if (success) {
					this.socketNotifications.emit('sendPongFunInvit', { requesterId: this.data.id, matchId: data.id, opponentLogin: this.data.login, userId: opponentId })
				} else {
					this.isModalPrvVisible = false
				}
			})
			this.socket.on('friendConnected', (data: any) => {
				this.socket.emit('preparePrivateGame', { roomId: id.toString(), player1Login: this.data.login, player2Login: data.opponentLogin, opponentId: opponentId, gameMode: 'FUNMODE' })
			})
		},
		privateClassicGame: async function (opponentId: number) {
			this.isModalPrvVisible = true
			const res = await fetch('http://localhost:3000/games/create-match', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				},
				body: JSON.stringify({ opponentId: opponentId, gameMode: 'CLASSIC', gameStatus: 'WAITING' })
			})
			if (res.status === 401) {
				router.push('/unauthorized')
				return
			} else if (res.status === 400){
				const error = await res.json()
				toast.error(`${error.message}`, {
					position: POSITION.TOP_RIGHT
				})
				this.isModalPrvVisible = false
				return
			}
			const data = await res.json()
			const id = data.id
			this.socket.emit('joinPrivateMatch', { matchId: data.id, player: '1' })
			this.socket.on('joinPrivateMatchResponse', (success) => {
				if (success) {
					this.socketNotifications.emit('sendPongClassicInvit', { requesterId: this.data.id, matchId: data.id, opponentLogin: this.data.login, userId: opponentId })
				} else {
					this.isModalPrvVisible = false
				}
			})
			this.socket.on('friendConnected', (data: any) => {
				this.socket.emit('preparePrivateGame', { roomId: id.toString(), player1Login: this.data.login, player2Login: data.opponentLogin, opponentId: opponentId, gameMode: 'CLASSIC' })
			})
				
		},
		getClassicMatches: async function () {
			const res = await fetch('http://localhost:3000/games/get-all-classic-matches', {
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
			this.classicMatches = await res.json()
			if (this.classicMatches.length === 0) {
				this.noClassicMatches = true
			}
			else {
				this.noClassicMatches = false
			}
			return
		},
		getFunMatches: async function () {
			const res = await fetch('http://localhost:3000/games/get-all-fun-matches', {
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
			this.funMatches = await res.json()
			if (this.funMatches.length === 0) {
				this.noFunMatches = true
			}
			else {
				this.noFunMatches = false
			}
			return
		},
		getDataUser: async function (friendLogin?: string) {
			let res
			if (this.profileLogin) {
				res = await fetch(`http://localhost:3000/users/find-by-login/${this.profileLogin}`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json'
					}
				})
			} else {
				res = await fetch(`http://localhost:3000/users/find-by-login/${friendLogin}`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json'
					}
				})
			}
			if (res.status === 404) {
				router.push(`/${this.profileLogin}`)
				return
			} else if (res.status === 200) {
				const user = await res.json()
				this.data = user
				this.newLogin = user.login
				this.oldLogin = this.newLogin
			}
		},
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
				return;
			} else if (res.status === 200) {
				const user = await res.json()
				this.data = user
				this.newLogin = user.login
				this.oldLogin = this.newLogin
			}
		},
		getFriends: async function (userId: string) {
			let res;
			if (userId != this.usersStore.currentUserId) {
				res = await fetch(`http://localhost:3000/users/find-by-login/${userId}`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
					}
				})
				const user = await res.json()
				userId = user.id
			}
			res = await fetch(`http://localhost:3000/friends/get-friends/${userId}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				}
			})
			if (res.status === 401) { // Unauthorized
				router.push('/unauthorized')
				return
			}
			const data = await res.json()
			this.friends = data
		},
		goToProfileFriend: function (friendLogin: string) {
			if (friendLogin === this.data.login) {
				router.push('/profile')
				this.getData()
				this.getFriends(this.data.login)
			} else {
				router.push(`/profile/${friendLogin}`)
				this.getDataUser(friendLogin)
				this.getFriends(friendLogin)
			}
		},
		matchmaking: function () {
			const userId = +this.usersStore.currentUserId
			this.socket.emit('joinMatchmaking', { gameMode: 'CLASSIC', userId: userId })
		},
		matchmakingFunMode: function () {
			const userId = +this.usersStore.currentUserId
			this.socket.emit('joinMatchmakingFunMode', { gameMode: 'FUNMODE', userId: userId })
		},
		setNotInGame: async function () {
			const res = await fetch('http://localhost:3000/users/not-in-game', {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				}
			})
			this.socketNotifications.emit('notInGame', { userId: this.usersStore.currentUserId })
		},
		closeModalClassic: function () {
			this.socket.emit('quitMatchmaking', { gameMode: 'CLASSIC' })
			this.isModalVisible = false
			this.opponent = null
			this.isMatchFound = false
			if (this.timeoutId !== null) {
				clearTimeout(this.timeoutId)
				this.timeoutId = null
			}
		},
		closeModalFun: function () {
			this.socket.emit('quitMatchmakingFunMode', { gameMode: 'FUNMODE' })
			this.isModalFunModeVisible = false
			this.opponent = null
			this.isMatchFound = false
			this.isFunMatch = false
			if (this.timeoutId !== null) {
				clearTimeout(this.timeoutId)
				this.timeoutId = null
			}
		},
		closeModalPrv: function (matchId: string) {
			this.socket.emit('cancelPrivateMatch', { roomId: matchId, gameMode: 'CLASSIC' })
			this.gameStarted = false
			this.isModalPrvVisible = false
			this.opponent = null
			this.isMatchFound = false
			this.setNotInGame()
			if (this.timeoutId !== null) {
				clearTimeout(this.timeoutId)
				this.timeoutId = null
			}
		},
		closeModalFunPrv: function (matchId: string) {
			this.socket.emit('cancelPrivateMatch', { roomId: matchId, gameMode: 'FUNMODE' })
			this.gameStarted = false
			this.isModalPrvFunVisible = false
			this.opponent = false
			this.isMatchFound = false
			this.isFunMatch = false
			this.setNotInGame()
			if (this.timeoutId !== null) {
				clearTimeout(this.timeoutId)
				this.timeoutId = null
			}
		},
		userDisconnect: async function () {
			this.gameStarted = false
			this.opponent = null
			this.isMatchFound = false
			this.isModalVisible = false
			this.isModalFunModeVisible = false
			this.isSpectator = false
			this.isFunMatch = false
			this.isModalPrvFunVisible = false
			this.isModalPrvVisible = false
			const res = await fetch('http://localhost:3000/users/not-in-game', {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				}
			})
			if (res.status === 401) {
				router.push('/unauthorized')
				return
			}
			this.socketNotifications.emit('notInGame', { userId: this.usersStore.currentUserId })
			if (!this.profileLogin) {
				this.getData()
				this.getFriends(this.usersStore.currentUserId)
			} else {
				this.getDataUser()
			}
			await this.getClassicMatches()
			await this.getFunMatches()
			this.socketNotifications.emit('refreshGames')
		},
		spectateClassicGame: function (roomId: number) {
			this.socket.emit('joinAsSpectator', { roomId })
			this.gameStarted = true
			this.isSpectator = true
			this.roomId = roomId.toString()
			this.player = '0'
			this.role = 'spec'
		},
		spectateFunGame: function (roomId: number) {
			this.socket.emit('joinAsSpectator', { roomId })
			this.gameStarted = true
			this.isSpectator = true
			this.isFunMatch = true
			this.roomId = roomId.toString()
			this.player = '0'
			this.role = 'spec'
		}
	},
})
</script>

<template>
	<div v-if="!gameStarted">
		<div class="section">
			<div class="container">
				<div class="box">
					<div class="section has-text-centered">
						<img src="../assets/imagePong.png">
						<div class="section has-text-centered">
							<h2 class="title" style="margin: 10px;"> Want to play ? </h2>
						</div>
						<div class="columns playButtons">
							<div class="column">
								<div class="play-button">
									<div class="container">
										<div class="center">
											<button class="btn-classic" @click="matchmaking()">
												<svg width="180px" height="60px" viewBox="0 0 180 60" class="border">
													<polyline points="179,1 179,59 1,59 1,1 179,1" class="bg-line" />
													<polyline points="179,1 179,59 1,59 1,1 179,1" class="hl-line" />
												</svg>
												<span>Classic game !</span>
											</button>
										</div>
									</div>
								</div>
							</div>
							<div class="column is-1">
								<h2 class="title">Or</h2>
							</div>
							<div class="column">
								<div class="play-button">
									<div class="container">
										<div class="center">
											<button class="btn-fun" @click="matchmakingFunMode()">
												<svg width="180px" height="60px" viewBox="0 0 180 60" class="border">
													<polyline points="179,1 179,59 1,59 1,1 179,1" class="bg-line" />
													<polyline points="179,1 179,59 1,59 1,1 179,1" class="hl-line" />
												</svg>
												<span>Fun game !</span>
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>
						<div class="section has-text-centered">
							<h3 class="subtitle" style="margin: 5px;"> Or </h3>
							<h3 class="title" style="margin: 5px;">Watch the games in progress:</h3>
						</div>
						<div class="columns has-text-centered is-vcentered">
							<div class="column is-half">
								<div class="box spectate" v-if="!noClassicMatches">
									<div class="scrollable-column">
										<span v-for="classicMatch of classicMatches">
											<p class="playersAndButton"><strong>{{ classicMatch.player1 }}</strong> vs
												<strong>{{
													classicMatch.player2 }}</strong>
												<button class="button is-primary is-small"
													@click="spectateClassicGame(classicMatch.id)">
													<span>Watch the game</span>
												</button>
											</p>
										</span>
									</div>
								</div>
								<div class="box is-half no-match" v-else> No Classic game to spectate</div>
							</div>
							<div class="column is-half">
									<div class="box" v-if="!noFunMatches">
										<div class="columns has-text-centered">
											<div class="column scrollable-column">
												<div v-for="funMatch of funMatches" class="box">
													<div class="column">
														<p><strong>{{ funMatch.player1 }}</strong> vs <strong>{{
															funMatch.player2 }}</strong></p>
													</div>
													<div class="column">
														<button class="button is-primary is-medium"
															@click="spectateFunGame(funMatch.id)">
															<span>Watch the game</span>
														</button>
													</div>
												</div>
											</div>
										</div>
									</div>
									<div class="box is-half no-match" v-else> No Fun game to spectate</div>
							</div>
						</div>
					</div>
					<div class="section has-text-centered" id="rules">
                        <h3 class="title" style="margin: 5px;">Rules</h3>
                        <ul>
                            <li>Use W to go up</li>
                            <li>Use S to go down</li>
                            <li>First to 11 points wins the game</li>
                            <li>-</li>
                            <li style="font-weight: bold;">If you are playing fun mode</li>
                            <li>Be careful at the walls !</li>
                        </ul>
                    </div>
					<div class="modal is-active" v-if="isModalVisible">
						<div class="modal-background"></div>
						<div class="modal-card">
							<header class="modal-card-head has-text-centered">
								<p class="modal-card-title">Matchmaking Classic</p>
							</header>
							<section class="modal-card-body">
								<div class="columns is-vcentered">
									<div class="column has-text-centered">
										<p class="loginMatchmaking">{{ data.login }}</p>
									</div>
									<div class="column has-text-centered">
										<p class="versus">VS</p>
									</div>
									<div v-if="isMatchFound" class="column has-text-centered is-5">
										<p class="loginMatchmaking">{{ opponent }}</p>
									</div>
									<div v-else class="column has-text-centered is-5">
										<span class="loader"></span>
										<p>Waiting for an opponent...</p>
									</div>
								</div>
							</section>
							<footer class="modal-card-foot">
								<button class="button is-danger" @click="closeModalClassic">Quit machmaking</button>
							</footer>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="modal is-active" v-if="isModalFunModeVisible">
			<div class="modal-background"></div>
			<div class="modal-card">
				<header class="modal-card-head has-text-centered">
					<p class="modal-card-title">Matchmaking Fun Mode</p>
				</header>
				<section class="modal-card-body">
					<div class="columns is-vcentered">
						<div class="column has-text-centered">
							<p class="loginMatchmaking">{{ data.login }}</p>
						</div>
						<div class="column has-text-centered">
							<p class="versus">VS</p>
						</div>
						<div v-if="isMatchFound" class="column has-text-centered is-5">
							<p class="loginMatchmaking">{{ opponent }}</p>
						</div>
						<div v-else class="column has-text-centered is-5">
							<span class="loader"></span>
							<p>Waiting for an opponent...</p>
						</div>
					</div>
				</section>
				<footer class="modal-card-foot">
					<button class="button is-danger" @click="closeModalFun">Quit machmaking</button>
				</footer>
			</div>
		</div>
		<div class="modal is-active" v-if="isModalPrvVisible">
			<div class="modal-background"></div>
			<div class="modal-card">
				<header class="modal-card-head has-text-centered">
					<p class="modal-card-title">Private Classic Game</p>
				</header>
				<section class="modal-card-body">
					<div class="columns is-vcentered">
						<div class="column has-text-centered">
							<p class="loginMatchmaking">{{ data.login }}</p>
						</div>
						<div class="column has-text-centered">
							<p class="versus">VS</p>
						</div>
						<div v-if="isMatchFound" class="column has-text-centered is-5">
							<p class="loginMatchmaking">{{ opponent }}</p>
						</div>
						<div v-else class="column has-text-centered is-5">
							<span class="loader"></span>
							<p>Waiting for your friend...</p>
						</div>
					</div>
				</section>
				<footer class="modal-card-foot">
					<button class="button is-danger" @click="closeModalPrv(roomId)">Quit</button>
				</footer>
			</div>
		</div>
		<div class="modal is-active" v-if="isModalPrvFunVisible">
			<div class="modal-background"></div>
			<div class="modal-card">
				<header class="modal-card-head has-text-centered">
					<p class="modal-card-title">Private Fun Game</p>
				</header>
				<section class="modal-card-body">
					<div class="columns is-vcentered">
						<div class="column has-text-centered">
							<p class="loginMatchmaking">{{ data.login }}</p>
						</div>
						<div class="column has-text-centered">
							<p class="versus">VS</p>
						</div>
						<div v-if="isMatchFound" class="column has-text-centered is-5">
							<p class="loginMatchmaking">{{ opponent }}</p>
						</div>
						<div v-else class="column has-text-centered is-5">
							<span class="loader"></span>
							<p>Waiting for your friend...</p>
						</div>
					</div>
				</section>
				<footer class="modal-card-foot">
					<button class="button is-danger" @click="closeModalFunPrv(roomId)">Quit</button>
				</footer>
			</div>
		</div>
	</div>
	<div v-else>
		<GameComponent @userDisconnect="userDisconnect" :socket="socket" :player="player" :roomId="roomId" :userId="userId"
			:role="role" :opponentId="opponentId" :isSpectator="isSpectator" :isFunMatch="isFunMatch" />
	</div>
</template>

<style scoped>
.spactate {
	height: 200px;
	padding: 0;
}

.no-match {
	height: 200px;
	display: flex;
	justify-content: center;
	align-items: center;
}

.playersAndButton {
	display: flex;
	justify-content: space-between;
	margin: 10px;
}

.loginMatchmaking {
	font-size: 40px;
	font-weight: bold;
}

.versus {
	font-size: 50px;
	font-weight: bold;
	color: black;
}

.box {
	overflow: hidden;
	padding: 0;
}

.scrollable-column {
	padding: 0;
	margin: 0;
	height: 200px;
	overflow-y: auto;
}

.linkFriend {
	cursor: pointer;
}

.friendImg {
	width: 40px;
	height: 40px;
	border-radius: 50%;
}

.btn-classic {
	width: 180px;
	height: 60px;
	cursor: pointer;
	background: transparent;
	background-color: orange;
	border: 1px solid orange;
	outline: none;
	transition: 1s ease-in-out;
}

.btn-fun {
	width: 180px;
	height: 60px;
	cursor: pointer;
	background: transparent;
	background-color: orange;
	border: 1px solid orange;
	outline: none;
	transition: 1s ease-in-out;
}

svg {
	position: absolute;
	left: 0;
	top: 0;
	fill: none;
	stroke-dasharray: 150 480;
	stroke-dashoffset: 150;
	transition: 1s ease-in-out;
}

.btn-classic:hover {
	transition: 1s ease-in-out;
	background: white;
}

.btn-classic:hover svg {
	stroke-dashoffset: -480;
}

.btn-classic span {
	color: black;
	font-size: 18px;
	font-weight: bold;
}

.btn-fun:hover {
	transition: 1s ease-in-out;
	background: white;
}

.btn-fun:hover svg {
	stroke-dashoffset: -480;
}

.btn-fun span {
	color: black;
	font-size: 18px;
	font-weight: bold;
}

.playButtons {

	align-items: center;
}

.challenge-friends {
	margin-top: 50px;
	width: 50%;
	height: 10%;
	background-color: #939393;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.challenge-friends h2 {
	font-size: 24px;
	margin-top: 20px;
}
</style>