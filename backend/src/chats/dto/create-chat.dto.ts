import { IsEmail, IsNotEmpty, IsString, IsNumber, IsBoolean } from 'class-validator';

export class CreateChannelDto {
    @IsString()
    @IsNotEmpty()
    name: string

    @IsNotEmpty()
    @IsBoolean()
    isPrivate: boolean

    @IsBoolean()
    @IsNotEmpty()
    isProtected: boolean

    @IsString()
    password?: string

    @IsNotEmpty()
    @IsString()
    owner: string
}