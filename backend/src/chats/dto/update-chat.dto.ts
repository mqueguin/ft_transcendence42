import { IsString, IsNotEmpty } from 'class-validator'

export class updateChannelDto {
	@IsNotEmpty()
	@IsString()
	channelStatus: string

	@IsString()
	@IsNotEmpty()
	password?: string
}