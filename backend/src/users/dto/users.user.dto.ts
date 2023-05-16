import { IsEmail, IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsString()
  avatar?: string;

  @IsNumber()
  @IsNotEmpty()
  id42: number;

  code?: string;
}

export class LoginUserDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;
    
    @IsNotEmpty()
    password: string;
}

export class UpdatePasswordDto {
    @IsNotEmpty()
    new_password: string;

    @IsNotEmpty()
    old_password: string;
}