import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Put, Param, Post, Req, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthService, RegistrationSeederStatus, RegistrationStatus } from './auth.service';
import { CreateUserDto, LoginUserDto/* , RenderSeederUser, SeedUserDto */ } from '../users/dto/users.user.dto';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly usersService: UsersService
    ) {}

    @Post('register')
    public async register(@Body() createUserDto: CreateUserDto): Promise<RegistrationStatus> {
        const result:RegistrationStatus = await this.authService.register(createUserDto)
        if (!result.success) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: result.message,
            }, HttpStatus.BAD_REQUEST)
        } // Pour l'instant pas besoins de ca. Ca empêche de voir les bons status codes
        return result
    }

    @Post('login')
    public async login(@Body() loginUserDto: LoginUserDto): Promise<any> {
        return await this.authService.login(loginUserDto)
    }

    @Get('school42/callback')
    @UseGuards(AuthGuard('school42'))
    @HttpCode(200)
    public async loginSchool42Callback(@Req() request: any, @Res() response: Response) {
        const { user } = request
        const userEntity: LoginUserDto = { email: user.email, password: '42Paris$' }
        const login = await this.authService.login(userEntity)
        if (!login) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: 'Invalid credentials',
            }, HttpStatus.BAD_REQUEST)
        }
        try {
            response.send(login)
        } catch (err) {
            response.redirect('http://localhost:8080')
        }
    }

    @Get('school42')
    @UseGuards(AuthGuard('school42'))
    @HttpCode(200)
    public async loginSchool42() {
    }

    @Get('check')
    @UseGuards(JwtAuthGuard)
    public async checkTokenValidity() {
        
    }

    // Function for update login of user
    @UseGuards(JwtAuthGuard)
    @Put('users/:id/update-login')
    public async updateLogin(@Param() params, @Body() body, @Req() req): Promise<any> {
        const id = parseInt(params.id)
        if (req.user.id != id) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
        }
        return await this.authService.updateLogin(id, body.login)
    }


    /* PARTI GESTION DOUBLE AUTHENTIFICATION */

    @UseGuards(JwtAuthGuard)
    @Post('2fa/generate/:id')
    async generate(@Param() params, @Body() body: any, @Req() req) {
        if (req.user.id != parseInt(params.id)) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
        }
        const otpauth = await this.authService.generateTwoFactorAuthSecret(body.email, parseInt(params.id))
    
        const qrCode = await this.authService.pipeQrCodeStream(otpauth.otpauthUrl)

        return (JSON.stringify({otpauth, qrCode})) 
    }

    @UseGuards(JwtAuthGuard)
    @Post('2fa/turn-on/:id')
    async setToOnTwoFactorAuthentication(@Param() params, @Body() body, @Req() req) {
        const id = parseInt(params.id)
        if (req.user.id != id) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
        }
        const codeIsValid = await this.authService.isTwoFactorAuthCodeValid(
            body.code, await this.usersService.findOneById(id)
        )
        if (!codeIsValid) {
            throw new HttpException('wrong authentication code', HttpStatus.FORBIDDEN)
        }
        await this.usersService.turnOnTwoFactorAuth(id)
    }

    @UseGuards(JwtAuthGuard)
    @Post('2fa/turn-off/:id')
    async setToOffFactorAuthentication(@Param() params, @Body() body, @Req() req) {
        const id = parseInt(params.id)
        if (id != req.user.id) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
        }
        const codeIsValid = await this.authService.isTwoFactorAuthCodeValid(
            body.code, await this.usersService.findOneById(id)
        )

        if (!codeIsValid) {
            throw new HttpException('wrong authentication code', HttpStatus.FORBIDDEN)
        }
        await this.usersService.turnOffTwoFactorAuth(id)
    }

    @Post('2fa/authenticate/:id')
    async authenticate(@Param() params, @Body() body, @Req() req) {
        const id = parseInt(params.id)
        const codeIsValid = await this.authService.isTwoFactorAuthCodeValid(
            body.code, await this.usersService.findOneById(id)
        )
        if (!codeIsValid) {
            throw new HttpException('wrong authentication code', HttpStatus.FORBIDDEN)
        }
    }
}