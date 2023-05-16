<script lang="ts">
import { router } from '@/router';
import { defineComponent } from 'vue';
import { useCookies } from 'vue3-cookies'

const { cookies } = useCookies()

export default defineComponent({
	name: 'Leaderboard',
	props: ['socketNotifications'],
	data: function () {
		return {
			playerBase: [],
			isLoading: false
		}
	},
	created: async function () {
		await this.playerBaseData()
	},
	mounted: function () {
		this.socketNotifications.on('userChangeStatus', (data: any) => {
			for (let i = 0; this.playerBase[i]; i++) {
				if (this.playerBase[i].id === data.id) {
					this.playerBase[i].isOnline = data.status
					break;
				}
			}
		})
		this.socketNotifications.on('userInGame', () => {
			this.playerBaseData()
		})
		this.socketNotifications.on('userNotInGame', () => {
			this.playerBaseData()
		})
	},
	methods: {
		playerBaseData: async function () {
			const data = await fetch('http://localhost:3000/users/find-all', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cookies.get('jwt_token')}`
				}
			})
			if (data.status === 401) {
				router.push('/unauthorized')
			}
			if (data.status === 200) {
				this.playerBase = await data.json()
				this.playerBase.sort((a, b) => b.elo - a.elo)
				var random = Math.random() * 2319;
				if (random > 3500)
					random = 3500
				else if (random < 1000)
					random = 1000
				await new Promise(resolve => setTimeout(resolve, random))
				this.isLoading = true
			}
		},

		redirectToLink(login: string) {
			this.$router.push({ path: `/profile/${login}` })
		}
	},
})
</script>

<template>
	<div class="section">
		<div class="container">
			<div class="box">
				<h1 style="margin-top: 10px; margin-bottom: 10px;">Leaderboard</h1>
				<table v-if="playerBase.length && isLoading" style="background-color: silver; border-radius: 25px;">
					<thead>
						<tr>
							<th>Rank</th>
							<th>Picture</th>
							<th>Name</th>
							<th>Elo</th>
							<th>Wins</th>
							<th>Loss</th>
							<th>Ratio (W/L)</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody class="tab-wrapper">
						<div class="tbody-wrapper"></div>
						<tr v-for="(player, index) in playerBase" :key="player.id">
							<td v-if="index + 1 == 1"><font-awesome-icon id="first" icon="fa-solid fa-crown" /></td>
							<td v-else-if="index + 1 == 2"><font-awesome-icon id="second" icon="fa-solid fa-crown" /></td>
							<td v-else-if="index + 1 == 3"><font-awesome-icon id="third" icon="fa-solid fa-crown" /></td>
							<td v-else>{{ index + 1 }}</td>
							<td class="img-wrapper">
								<a @click="redirectToLink(player.login)">
									<img class="imgProfile" :src="player.avatar" />
								</a>
							</td>
							<td>
								<a @click="redirectToLink(player.login)">
									{{ player.login }}
								</a>
							</td>
							<td>{{ player.elo }}</td>
							<td>{{ player.wins }}</td>
							<td>{{ player.losses }}</td>
							<td>{{ isNaN(player.wins / (player.losses + player.wins)) ? '0.00' : (player.wins / (player.losses + player.wins)).toFixed(2) }}</td>
							<td :class="{ 'green': player.isOnline === 'ON', 'red': player.isOnline === 'OFF', 'yellow': player.isOnline === 'INGAME' }">
								<div id="center-div">
									<div class="bubble"
										:class="{ 'bubble-red': player.isOnline === 'OFF', 'bubble-green': player.isOnline === 'ON', 'bubble-yellow': player.isOnline === 'INGAME' }">
										<span class="bubble-outer-dot">
											<span class="bubble-inner-dot"></span>
										</span>
									</div>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
				<div class="load" v-else-if="!isLoading">
					<span class="loader "></span>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
h1 {
	text-align: center;
	font-weight: bold;
	font-size: 5vw;
}

/*Center-div (Not part of the symbol)*/

#center-div {
	position: relative;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	margin: auto;
	width: 14px;
	height: 14px;
}



a {
	color: #101010;
	font-weight: bold;
	cursor: default;
}

a:hover {
	cursor: pointer;
}

a:active,
a:focus {
	outline: none;
}

tbody .tbody-wrapper {
	width: 100%;
	height: 100%;
	border-radius: 15px;
	background-color: #ece9e6;

}

.tab-wrapper {
	color: #101010;
}

tbody tr {
	z-index: 99;
}


/* Les couronnes premier/deuxieme/troisieme */

#first {
	color: gold;
	stroke: black;
	stroke-width: 25;
}

#second {
	color: silver;
	stroke: black;
	stroke-width: 25;
}

#third {
	color: #b08d57;
	stroke: black;
	stroke-width: 25;
}


.img-wrapper {
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
}

.imgProfile {
	border-radius: 50%;
	object-fit: cover;
	width: 30px;
	height: 30px;
}

table {
	margin: 30px auto;
	padding: 30px;
	text-align: center;
	width: 95%;
}

td,
th {
	vertical-align: middle;
	padding: 10px;
}
</style>