import { defineStore } from "pinia";
import { NewUser } from "../users";

export interface UserState {
	currentUserId?: string;
}

export const useUsers = defineStore("users", {
	state: () => ({
		currentUserId: localStorage.getItem('currentUserId') || undefined
	}),
	actions: {
		async authenticate(user?: any, id?: string) {
			if (user && user.data && user.data.id) {
				localStorage.setItem('currentUserId', user.data.id)
				this.currentUserId = user.data.id;
			} else if (id != undefined) {
				localStorage.setItem('currentUserId', id)
				this.currentUserId = id
			} else {
				localStorage.removeItem('currentUserId')
				this.currentUserId = undefined;
			}
		},

		async createUser(newUser: NewUser) {
			const body = JSON.stringify(newUser)
			const res = await fetch("http://localhost:3000/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body
			})
			if (res.status === 400) {
				return res
			}
		},
	}
});