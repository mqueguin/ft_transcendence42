import { IsString, IsNotEmpty } from 'class-validator'

export class PasswordChannelDto {
	@IsNotEmpty()
	@IsString()
	password: string
}