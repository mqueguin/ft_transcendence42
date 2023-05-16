export interface Status {
	valid: boolean;
	message?: string;
}

type Rule = (value: string, password?: string) => Status;

export const checkEmail: Rule = (value: string): Status => {
	if (typeof value !== 'string' || value.length === 0) {
		return {
		  valid: false,
		  message: undefined,
		};
	  }

	const result = Boolean(value.match(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/));

	return {
		valid: result,
		message: result ? undefined : 'Input must be a valid email.',
	}
}

export const  checkUsername: Rule = (value: string): Status => {
	if (typeof value !== 'string' || value.length === 0) {
		return {
		  valid: false,
		  message: undefined,
		};
	  }
	
	const result = Boolean(value.match(/^[a-zA-Z][a-zA-Z0-9._-]{3,14}$/));

	return {
		valid: result,
		message: result ? undefined : 'Username must contain between 4 and 15 letters, numbers or . _ -\nand must start with a letter.',
	}
}


export const checkPassword: Rule = (value: string): Status => {
	if (typeof value !== 'string' || value.length === 0) {
		return {
		  valid: false,
		  message: undefined,
		};
	  }
	
	const result = Boolean(value.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,15}$/));
	return {
		valid: result,
		message: result ? undefined : 'Password must contain between 8 and 15 characters.\n At least one lowercase and one uppercase letters,\none number and one special character.',
	}
}

export const checkConfirmPassword: Rule = (value: string, password?: string): Status => {
	if (typeof value !== 'string' || value.length === 0) {
		return {
		  valid: false,
		  message: undefined,
		};
	  }
	  
	const result = Boolean(value === password);
	return {
		valid: result,
		message: result ? undefined : 'This field must match the password.',
	}
}

export const checkGoogleCode: Rule = (value: string): Status => {
	if(typeof value !== 'string' || value.length === 0) {
		return {
			valid: false,
			message: undefined
		}
	}

	const result = Boolean(value.match(/^[0-9]{6,6}$/))
	return {
		valid: result,
		message: result ? undefined : 'Google code must contains only 6 digits.'
	}
}

export const checkChannelName: Rule = (value: string): Status => {
	if (typeof value !== 'string' || value.length === 0) {
		return {
		  valid: false,
		  message: undefined,
		};
	  }
	
	const result = Boolean(value.match(/^[a-zA-Z0-9]{3,12}$/));
	return {
		valid: result,
		message: result ? undefined : 'Channel name must contain between 3 and 12 characters.',
	}
}

export const checkChannelPassword: Rule = (value: string): Status => {
	if (typeof value !== 'string' || value.length === 0) {
		return {
		  valid: false,
		  message: undefined,
		};
	  }
	
	const result = Boolean(value.match(/^[a-zA-Z0-9]{3,12}$/));
	return {
		valid: result,
		message: result ? undefined : 'Channel password must contain between 3 and 12 characters.',
	}
}

export function validate(value: string, rules: Rule[], password?: string): Status {
	for (const rule of rules) {
		const result = ( password ? rule(value, password) : rule(value));
		if (!result.valid) {
			return result;
		}
	}
	return {
		valid: true,
	}
}
