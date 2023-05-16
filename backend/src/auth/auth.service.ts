import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto, LoginUserDto } from '../users/dto/users.user.dto';
import { JwtPayload } from './jwt.strategy';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
//import qrcode from 'qrcode';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    async register(userDto: CreateUserDto): Promise<RegistrationStatus> {
        let status: RegistrationStatus = {
            success: true,
            message: 'ACCOUNT_CREATE_SUCCESS',
        }

        try {
            status.data = await this.usersService.create(userDto)
        } catch (err) {
            status = {
                success: false,
                message: err,
            }
        }
        return status
    }

    async login(loginUserDto: LoginUserDto): Promise<any> {
        // find user in the database
        const user = await this.usersService.login(loginUserDto)
        // Generate and sign token
        const token = this._createToken(user)

        return {
            ...token,
            data: user
        }
    }

    // Function for create a jwt token
    private _createToken({ login }): any {
        const user: JwtPayload = { login }
        const Authorization = this.jwtService.sign(user)
        return {
            expiresIn: process.env.JWT_EXPIRATION,
            Access_token: Authorization,
        }
    }

    async validateUser(payload: JwtPayload): Promise<any> {
        const user = await this.usersService.findByPayload(payload)
        if (!user) {
            throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED)
        }
        return user
    }

    async returnNewToken(login: string) {
        const token = this._createToken({ login })

        return {
            ...token
        }
    }

    // Function for update login of user and generate new token
    async updateLogin(userId: number, login: string) {

        const check = await this.usersService.checkLoginIsAvailable(login)

        if (check) {
            throw new HttpException('This login already exist', HttpStatus.CONFLICT)
        }
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { login: login }
        })
        const newToken = await this.returnNewToken(login)
        return {
            newToken,
            user
        }
    }


    /* GESTION DOUBLE AUTHENTIFICATION */

    public async generateTwoFactorAuthSecret(email: string, userId: number) {
        const secret = authenticator.generateSecret()
        const otpauthUrl = authenticator.keyuri(email, this.configService.get('TWO_FACTOR_AUTH_APP_NAME'), secret)
        await this.usersService.setTwoAuthSecret(secret, userId)
        return {
            secret,
            otpauthUrl
        }
    }

    // Create a qrcode with the secret for double auth
    public async pipeQrCodeStream(otpauthUrl: string) {
        const qrCode = await qrcode.toDataURL(otpauthUrl)
        return qrCode
    }

    public async isTwoFactorAuthCodeValid(code: string, userI: any) {
        const user = await this.usersService.findOneById(userI.id)
        authenticator.options = {
            window: 1,
        }
        return authenticator.verify({
            token: code,
            secret: user.twoFactorAuthenticationSecret
        })
    }
}

export interface RegistrationStatus {
    success: boolean
    message: string
    data?: PrismaClient
}

export interface RegistrationSeederStatus {
    success: boolean
    message: string
    data?: PrismaClient[]
}
