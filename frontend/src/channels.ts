export interface NewChannel {
	name: string;
	owner: string;
	isPrivate: boolean;
	isProtected: boolean;
	password?: string;
}

export interface Channel extends NewChannel {
	id: string;
	members: string[];
}