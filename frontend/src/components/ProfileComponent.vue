<script lang="ts">
import { defineComponent } from 'vue'
import { useUsers } from '@/stores/users'
import { useCookies } from 'vue3-cookies'
import { router } from '@/router';
import { useToast, POSITION } from 'vue-toastification'

const { cookies } = useCookies()
const toast = useToast()

export default defineComponent({
    name: 'ProfileComponent',
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
			isBlocked: false,
			matchesHistory: null,
			firstVictory: '',
			fifthVictory: '',
			tenthVictory: '',
			bigDefeat: '0',
			bigVictory: '0'
        }
    },
    created: async function () {
		if (!this.profileLogin) {
        	await this.getData()
			await this.getFriends(this.usersStore.currentUserId)
			await this.getMatchesHistory(this.usersStore.currentUserId)
		} else {
			await this.getDataUser()
			await this.getFriends(this.data.id)
			await this.userIsBlocked()
			this.getMatchesHistory(this.data.id.toString())
		}
		this.getProgressToString()
    },
	mounted: function () {
		/* Catch friend request accepted */
		this.socketNotifications.on('notifFriendRequestAccepted', async (recipientId: string) => {
      		const res = await fetch(`http://localhost:3000/users/get-user-login/${recipientId}`, {
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
      		const data = await res.json()
			if (this.data.id.toString() != this.usersStore.currentUserId) {
				this.getDataUser(this.data.login)
				this.getFriends(this.data.id.toString())
				this.getMatchesHistory(this.data.id.toString())
			} else {
				this.getData()
				this.getFriends(this.usersStore.currentUserId)
				this.getMatchesHistory(this.usersStore.currentUserId)
			}
			this.getProgressToString()
    	})
		this.socketNotifications.on('userChangeStatus', (data: any) => {
			for (let i = 0; this.friends[i]; i++) {
				if (this.friends[i].id == data.id) {
					this.friends[i].isOnline = data.status
					break 
				}
			}
		})
		this.socketNotifications.on('userInGame', (data: any) => {
			for (let i = 0; this.friends[i]; i++) {
				if (this.friends[i].id == parseInt(data.userId)) {
					this.friends[i].isOnline = 'INGAME'
					break 
				}
			}
		})
		this.socketNotifications.on('userNotInGame', (data: any) => {
			for (let i = 0; this.friends[i]; i++) {
				if (this.friends[i].id === parseInt(data.userId)) {
					this.friends[i].isOnline = 'ON'
					break
				}
			}
		})
	},
	watch: {
		'$route': function(to, from) {
      		if (to.fullPath === '/profile') {
       			this.getData() 
				this.getFriends(this.usersStore.currentUserId)
				this.getProgressToString()
				this.getMatchesHistory(this.usersStore.currentUserId)
      		}
    	}
	},
    methods: {
		getMatchesHistory: async function (userId: string) {
			const res = await fetch(`http://localhost:3000/games/get-matches-history/${userId}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				}
			})
			if (res.status === 401) {
				router.push('/unauthorized')
				return
			} else if (res.status === 400) {
				const error = await res.json()
				toast.error(`${error.message}`, {
					position: POSITION.TOP_RIGHT
				})
				return
			}
			this.matchesHistory = await res.json()
			if (this.matchesHistory.length === 0) {
				this.matchesHistory = null
			}
			this.replaceIdByLogin()
			return
		},
		replaceIdByLogin: async function () {
			if (this.matchesHistory !== null) {
				for (let i = 0; i < this.matchesHistory.length; i++) {
					this.matchesHistory[i].winner = await this.getLoginForHistory(this.matchesHistory[i].winner)
					this.matchesHistory[i].losser = await this.getLoginForHistory(this.matchesHistory[i].losser)
				}
			}
		},
		getLoginForHistory: async function (id: string): Promise<string> {
			const res = await fetch(`http://localhost:3000/users/get-user-login/${id}`, {
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
			const data = await res.json()
			return data.login
		},
		getDataUser: async function (friendLogin?: string) {
			let res
			if (this.profileLogin && friendLogin === undefined) {
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
                return ;
            } else if (res.status === 200) {
                const user = await res.json()
                this.data = user
                this.newLogin = user.login
                this.oldLogin = this.newLogin
            }
        },
		getFriends: async function (userId: string) {
			let res;
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
        settingsButton: function () {
            router.push('/settings')
        },
		goToProfileFriend: async function (friendId: string, friendLogin: string) {
			if (friendId === this.usersStore.currentUserId.toString()) {
				router.push('/profile')
				this.getData()
				this.getFriends(this.usersStore.currentUserId)
			} else {
				router.push(`/profile/${friendLogin}`)
				await this.getDataUser(friendLogin)
				await this.getFriends(friendId)
				this.userIsBlocked()
			}
		},
		isFriend: function () {
			for (let i = 0; i < this.friends.length; i++) {
				if (this.friends[i].id.toString() === this.usersStore.currentUserId.toString()) {
					return true;
				}
			}
			return false
		},
		addFriend: async function () {
			const res = await fetch('http://localhost:3000/friends/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cookies.get('jwt_token')}`
                },
                body: JSON.stringify({ userAId: this.usersStore.currentUserId, userBId: this.data.id.toString() })
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
                this.socketNotifications.emit('sendFriendRequest', { requesterId: this.usersStore.currentUserId, recipientId: this.data.id })
				toast.success(`The friend request for ${this.data.login} has been sent!`, {
					position: POSITION.TOP_RIGHT
				})
            }
		},
		removeFriend: async function () {
			const res = await fetch(`http://localhost:3000/friends/remove-friend`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				},
				body: JSON.stringify({ userAId: this.usersStore.currentUserId.toString(), userBId: this.data.id})
			})
			if (res.status === 401) {
				router.push('/unauthorized')
				return
			}
			const data = await res.json()
			if (data === true) { // Remove friend request success
				toast.success(`${this.data.login} has been removed from your friends list!`, {
					position: POSITION.TOP_RIGHT
				})
				this.getDataUser(this.data.login)
				this.getFriends(this.data.id.toString())
			}
		},
		sendMessage: function () {
			router.push(`/chat/privateMessage/${this.data.id}`)
			return 
		},
		userIsBlocked: async function () {
			const res = await fetch(`http://localhost:3000/users/is-blocked/${this.data.id}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				}
			})
			if (res.status === 401) {
				router.push('/unauthorized')
				return
			} else if (res.status === 400) {
				const error = await res.json()
				toast.error(`${error.message}`, {
					position: POSITION.TOP_RIGHT
				})
				return
			}
			this.isBlocked = await res.json()
			return
		},
		blockUser: async function () {
			const res = await fetch('http://localhost:3000/users/block-a-user', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				},
				body: JSON.stringify({ blockedUserId: this.data.id })
			})
			if (res.status === 401) {
				router.push('/unauthorized')
				return
			} else if (res.status === 400) {
				const error = await res.json()
				toast.error(`${error.message}`, {
					position: POSITION.TOP_RIGHT
				})
				return
			}
			this.isBlocked = true
			return
		},
		unblockUser: async function () {
			const res = await fetch('http://localhost:3000/users/unblock-a-user', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				},
				body: JSON.stringify({ blockedUserId: this.data.id })
			})
			if (res.status === 401) {
				router.push('/unauthorized')
				return
			} else if (res.status === 400) {
				const error = await res.json()
				toast.error(`${error.message}`, {
					position: POSITION.TOP_RIGHT
				})
				return
			}
			this.isBlocked = false
			return
		},
		getProgressToString: function () {
			if (this.data.wins <= 1) {
				this.firstVictory = (this.data.wins).toString()
				this.fifthVictory = (this.data.wins).toString()
				this.tenthVictory = (this.data.wins).toString()
				this.bigDefeat = (this.data.wins).toString()
				this.bigVictory = (this.data.wins).toString()
				return
			} else if (this.data.wins <= 10) {
				this.firstVictory = '1'
				this.fifthVictory = (this.data.wins).toString()
				this.tenthVictory = (this.data.wins).toString()
				this.bigDefeat = (this.data.wins).toString()
				this.bigVictory = (this.data.wins).toString()
			} else if (this.data.wins <= 50){
				this.firstVictory = '1'
				this.fifthVictory = '10'
				this.tenthVictory = (this.data.wins).toString()
				this.bigDefeat = (this.data.wins).toString()
				this.bigVictory = (this.data.wins).toString()
			} else if (this.data.wins <= 100) {
				this.firstVictory = '1'
				this.fifthVictory = '10'
				this.tenthVictory = '50'
				this.bigDefeat = (this.data.wins).toString()
				this.bigVictory = (this.data.wins).toString()
			} else if (this.data.wins <= 500) {
				this.firstVictory = '1'
				this.fifthVictory = '10'
				this.tenthVictory = '50'
				this.bigDefeat = '100'
				this.bigVictory = (this.data.wins).toString()
			}
			if (this.data.wins > 500) {
				this.firstVictory = '1'
				this.fifthVictory = '10'
				this.tenthVictory = '50'
				this.bigDefeat = '100'
				this.bigVictory = '500'
			}		
		},	
    }
})
</script>

<template>
	<div class="profileContainer">
		<div class="columns">
			<div class="column">
				<button v-if="!profileLogin" class="button is-pulled-right is-rounded" @click="settingsButton()">
					<span>
						Edit my profile
					</span>
					<span class="icon is-small">
						<font-awesome-icon icon="fa-solid fa-pen-to-square" />
					</span>
				</button>
				<div v-else-if="isFriend()">
					<button class="button is-pulled-right is-rounded" @click="removeFriend()">
						<span>
							Remove friend
						</span>
						<span class="icon is-small">
							<font-awesome-icon icon="fa-solid fa-user-minus"/>
						</span>
					</button>
					<button v-if="!isBlocked" style="margin-right: 10px;" class="button is-danger is-pulled-right is-rounded" @click="blockUser">
						<span>
							Block user
						</span>
						<span class="icon is-small">
							<font-awesome-icon icon="fas fa-solid fa-ban" />
						</span>
					</button>
					<button v-else-if="isBlocked" style="margin-right: 10px;" class="button is-danger is-pulled-right is-rounded" @click="unblockUser">
						<span>
							Unblock user
						</span>
						<span class="icon is-small">
							<font-awesome-icon icon="fas fa-solid fa-ban" />
						</span>
					</button>
					<button style="margin-right: 10px;" class="button is-pulled-right is-rounded" @click="sendMessage">
						<span>
							Send message
						</span>
						<span class="icon is-small">
							<font-awesome-icon icon="fas fa-solid fa-message" />
						</span>
					</button>
				</div>
				<div v-else>
					<button class="button is-pulled-right is-rounded" @click="addFriend()">
						<span>
							Add friend
						</span>
						<span class="icon is-small">
							<font-awesome-icon icon="fa-solid fa-plus" />
						</span>
					</button>
					<button v-if="!isBlocked" style="margin-right: 10px;" class="button is-danger is-pulled-right is-rounded" @click="blockUser">
						<span>
							Block user
						</span>
						<span class="icon is-small">
							<font-awesome-icon icon="fas fa-solid fa-ban" />
						</span>
					</button>
					<button v-else-if="isBlocked" style="margin-right: 10px;" class="button is-danger is-pulled-right is-rounded" @click="unblockUser">
						<span>
							Unblock user
						</span>
						<span class="icon is-small">
							<font-awesome-icon icon="fas fa-solid fa-ban" />
						</span>
					</button>
					<button class="button is-pulled-right is-rounded" style="margin-right: 10px;" @click="sendMessage">
						<span>
							Send message
						</span>
						<span class="icon is-small">
							<font-awesome-icon icon="fas fa-solid fa-message" />
						</span>
					</button>
				</div>
			</div>
		</div>
		<div class="columns">
			<div class="column">
  				<div class="pix-space">
    				<img class="imgProfile" :src="data.avatar">
   					<p class="loginTitle"><strong> {{ data.login }} </strong></p>
					<h3><strong>ELO: </strong> 
						<span style="font-size: 20px;">{{ data.elo }}</span>
					</h3>
  				</div>
			</div>
			<div class="column">
				<p class="titles">Match history</p>
				<div class="scrollable-column">
					<table class="table is-fullwidth is-striped is-narrow">
						<thead>
							<th class="table">Winner</th>
							<th class="table">Loser</th>
							<th class="table">Score</th>
							<th class="table">Result</th>
						</thead>
						<tbody>
							<tr v-if="matchesHistory" v-for="match of matchesHistory" class="has-text-centered">
								<td>{{ match.winner }}</td>
								<td>{{ match.losser }}</td>
								<td>{{ match.winnerScore }} - {{ match.losserScore }}</td>
								<td>{{ (match.winner === data.login ? 'V' : 'D') }}</td>
							</tr>
						</tbody>
					</table>
					<div v-if="matchesHistory === null">
						<p class="has-text-centered">No match history</p>
					</div>
				</div>
				
			</div>
			<div class="column">
				<p class="titles">Friends</p>
				<div class="scrollable-column">
					<table class="table is-fullwidth is-striped is-hoverable is-narrow">
						<thead>
							<th class="table">Avatar</th>
							<th class="table">Name</th>
							<th class="table">Status</th>
						</thead>
						<tbody>
							<tr v-if="friends" v-for="(friend, index) of friends" :key="index"   @click="goToProfileFriend(friend.id.toString(), friend.login)" style="cursor: pointer;">
								<td><img :src="friend.avatar" class="friendImg" /></td>
								<td><p style="font-weight: bold;">{{ friend.login }}</p></td>
								<td>
									<span v-if="friend.isOnline === 'ON'" class="tag is-success">Online</span>
									<span v-if="friend.isOnline === 'OFF'" class="tag is-danger">Offline</span>
									<span v-if="friend.isOnline === 'INGAME'" class="tag is-warning">In Game</span>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
		<div class="columns">
			<div class="column">
				<p class="titles" style="text-align: center;">Achievements</p>
				<div class="section">
					<div class="columns is-multiline">
						<div class="column is-half">
							<div class="box">
								<div class="columns">
									<div class="column is-half">
										<p style="font-weight: bold; text-align: center;">1st Victory</p>
										<progress class="progress is-small" :value="firstVictory" max="1"></progress>
									</div>
									<div class="column">
										<p style="margin-top: 15px;">{{ firstVictory }} / 1</p>
									</div>
									<div class="column">
										<img class="logoAchiev" src="../assets/1stVictory.png">
									</div>
								</div>
							</div>
						</div>
						<div class="column is-half">
							<div class="box">
								<div class="columns">
									<div class="column is-half">
										<p style="font-weight: bold; text-align: center;">Ten Victories</p>
										<progress class="progress is-small" :value="fifthVictory" max="10"></progress>
									</div>
									<div class="column">
										<p style="margin-top: 15px;">{{ fifthVictory }} / 10</p>
									</div>
									<div class="column">
										<img class="logoAchiev" src="../assets/5thVictory.png">
									</div>
								</div>
							</div>
						</div>
						<div class="column is-half">
							<div class="box">
								<div class="columns">
									<div class="column is-half">
										<p style="font-weight: bold; text-align: center;">Fifty Victories</p>
										<progress class="progress is-small" :value="tenthVictory" max="50"></progress>
									</div>
									<div class="column">
										<p style="margin-top: 15px;">{{ tenthVictory }} / 50</p>
									</div>
									<div class="column">
										<img class="logoAchiev" src="../assets/10thVictory.png">
									</div>
								</div>
							</div>
						</div>
						<div class="column is-half">
							<div class="box">
								<div class="columns">
									<div class="column is-half">
										<p style="font-weight: bold; text-align: center;">100 Victories !</p>
										<progress class="progress is-small" :value="bigDefeat" max="100"></progress>
									</div>
									<div class="column">
										<p style="margin-top: 15px;">{{ bigDefeat }} / 100</p>
									</div>
									<div class="column">
										<img class="logoAchiev" src="../assets/0-11Defeat.png">
									</div>
								</div>
							</div>
						</div>
						<div class="column is-three-fifths is-offset-one-fifth">
							<div class="box">
								<div class="columns">
									<div class="column is-half">
										<p style="font-weight: bold; text-align: center;">The Boss</p>
										<progress class="progress is-small" :value="bigVictory" max="500"></progress>
									</div>
									<div class="column">
										<p style="margin-top: 15px;">{{ bigVictory }} / 500</p>
									</div>
									<div class="column">
										<img class="logoAchiev" src="../assets/11-0Victory.png">
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	</template>
	

<style scoped>

.scrollable-column {
	height: 200px;
	overflow-y: auto;
	
}

.friendImg {
	width: 30px;
	height: 30px;
	border-radius: 50%;
}


.logoAchiev {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    object-fit: cover;
    margin: auto;
}

.titles {
	font-weight: bold;
	border-bottom: 1px solid black;
	text-align: center;
}
.pix-space {
	display:flex;
	flex-direction: column;
	align-items: center;
}

.loginTitle {
	margin-top: 15px;
	text-align: center;
}

.imgProfile {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    object-fit: cover;
    margin: auto;
}

</style>