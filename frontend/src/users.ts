export interface NewUser {
	email: string;
	login: string;
	password: string;
	code?: string
}

export interface User extends NewUser{
	id: string;
}

export interface chatUser extends User {
	isOwner: boolean;
	isAdmin: boolean;
}