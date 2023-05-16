import { createRouter, createWebHistory } from 'vue-router'
import { useUsers } from "../stores/users";
import { useCookies } from 'vue3-cookies'

const { cookies } = useCookies()

export const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			name: 'Login',
			path: '/login',
			component: () => import('../views/Login.vue'),
			beforeEnter: userIsLog
		},
		{
			name: 'Home',
			path: '/',
			component: () => import('../views/Pong.vue'),
			beforeEnter: checkIsLog
		},
		{
			name: 'Profile',
			path: "/profile",
			component: () => import('../views/Profile.vue'),
			beforeEnter: checkIsLog
		},
		{
			name: 'ProfileUser',
			path: '/profile/:login',
			component: () => import('../views/Profile.vue'),
			beforeEnter: checkUserExist
		},
		{
			name: 'Settings',
			path: '/settings',
			component: () => import('../views/Settings.vue'),
			beforeEnter: checkIsLog
    	},
		{
			name: 'Leaderboard',
			path: '/leaderboard',
			component: () => import('../views/Leaderboard.vue'),
			beforeEnter: checkIsLog
		},
		{
			name: 'Pong',
			path: "/pong",
			component: () => import("../views/Pong.vue"),
			beforeEnter: checkIsLog
		},
		{
			name: 'PongClassic',
			path: '/pong/new-classic/:id',
			component: () => import('../views/Pong.vue'),
			beforeEnter: checkIsLog
		},
		{
			name: 'PongFun',
			path: '/pong/new-fun/:id',
			component: () => import('../views/Pong.vue'),
			beforeEnter: checkIsLog
		},
		{
			name: 'PongJoin',
			path: '/pong/join-game/:matchId',
			component: () => import('../views/Pong.vue'),
			beforeEnter: checkIsLog
		},
		{
			name: 'PongJoinFun',
			path: '/pong/join-fun-game/:matchId',
			component: () => import('../views/Pong.vue'),
			beforeEnter: checkIsLog
		},
		{
			name: 'Chat',
			path: "/chat",
			component: () => import("../views/Chat.vue"),
			beforeEnter: checkIsLog
		},
		{
			name: 'ChatPm',
			path: '/chat/privateMessage/:userId',
			component: () => import("../views/Chat.vue"),
			beforeEnter: checkIsLog
		},
		{
			name: 'ChatPrivate',
			path: '/chat/:channelId',
			component: () => import("../views/Chat.vue"),
			beforeEnter: checkIsLog
		},
		{
			name: 'Callback',
			path: "/authentificate/school42/callback",
			component: () => import("../views/Callback.vue")
		},
		{
			name: 'Unauthorized',
			path: '/unauthorized',
			component: () => import('../views/Unauthorized.vue'),
			beforeEnter: checkAuth
		},
		{
			name: 'NotFound',
			path: "/:catchAll(.*)",
			component: () => import('../views/NotFound.vue')
		}
	]
})

// Function for redirect user on /login page or /home page
function checkIsLog(to: any, from: any, next: any) {
	const usersStore = useUsers()

	if (usersStore.currentUserId != undefined) {
		next()
	} else {
		next({ name: 'Login' })
	}
}
// Function inverse
function userIsLog(to: any, from: any, next: any) {
	const usersStore = useUsers()

	if (usersStore.currentUserId === undefined) {
		next()
	} else {
		next({ name: 'Home' })
	}
}

// Function for check if a user has invalide jwt
async function checkAuth(to: any, from: any, next: any) {
	const usersStore = useUsers()

	if (usersStore.currentUserId === undefined || !cookies.isKey('jwt_token')) {
		return next()
	}

	// If user is connected
	try {
		const res = await fetch('http://localhost:3000/auth/check', {
			headers: {
				'Authorization': `Bearer ${cookies.get('jwt_token')}`
			}
		})
		if (res.status === 200) {
			const user = await fetch(`http://localhost:3000/users/${usersStore.currentUserId}`, {
				headers: {
					'Authorization': `Bearer ${cookies.get('jwt_token')}`,
					'Content-Type': 'application/json'
				}
			})
			if (user.status === 200) {
				return next({ name: 'Home' })
			} else {
				return next()
			}
		} else {
			return next()
		}
	} catch (error) {
		return next()
	}
}

// Function for check if user exist in database
async function checkUserExist(to: any, from: any, next: any) {
	const loginUser = to.params.login
	const usersStore = useUsers()
	const res = await fetch(`http://localhost:3000/users/${usersStore.currentUserId}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${cookies.get('jwt_token')}`
		}
	})
	if (res.status === 401) {
		return next({ name: 'Unauthorized' })
	}
	const user = await res.json()
	if (user.login === loginUser) {
		return next({ name: 'Profile' })
	}
	try {
		const res = await fetch(`http://localhost:3000/users/find-by-login/${loginUser}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		})
		if (res.status === 404) {
			return next( `/${loginUser}` )
		}
		return next()
	} catch (error) {
		return next()
	}
}