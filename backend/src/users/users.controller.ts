import { Body, ClassSerializerInterceptor,
    Controller,
    Get,
    Req,
    Inject,
    Param,
    ParseIntPipe,
    Put,
    Post,
    Delete,
    Query,
    Request,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    HttpException,
    HttpStatus,
    Patch,
    HttpCode } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { UpdatePasswordDto } from './dto/users.user.dto';
import { I18nService } from 'i18n';
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import path = require('path')
import * as fs from'fs'
import { join } from 'path'

export const storage = {
    storage: diskStorage({
        destination: './src/uploads/',
        filename: (req, file, cb) => {
            const filename: string = path.parse(file.originalname).name.replace(/\s/g, '')
            const extension: string = path.parse(file.originalname).ext
            cb(null, `${filename}${extension}`)
        },
        limits: {
            fileSize: 1024 * 1024
        }
    })
}

@Controller('users')
export class UsersController {
    constructor(@Inject(UsersService) private usersService: UsersService) {}

    // Logout function
    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @HttpCode(200)
    public async logout(@Request() req) {
        await this.usersService.setOffline(req.user.id)
        return {
            message: 'LOGOUT_SUCCESS',
        }
    }

    @Get('find-by-email/:email')
    public async findOneByEmail(@Param() params): Promise<any> {
        return await this.usersService.findOneByEmail(params.email.toLowerCase())
    }from 
    
    @Get('find-by-login/:login')
    public async findOneByLogin(@Param() params): Promise<any> {
        const user = await this.usersService.findOneByLogin(params.login)

        if (!user) {
            throw new HttpException('Login not found', 404)
        }
        return user
    }

    @UseGuards(JwtAuthGuard)
    @Get('get-user-data/:id')
    async getUserData(@Param() params) {
        const user = this.usersService.findOneById(parseInt(params.id))
        if (!user) {
            throw new HttpException('This user does not exist!', HttpStatus.BAD_REQUEST)
        }
        return user
    }

    // Function for recover 50 users for leaderbord
    @UseGuards(JwtAuthGuard)
    @Get('find-all')
    public async getAllUsers(@Query('limit') limit = 50, @Query('offset') offset = 0) {
        return await this.usersService.getAllUsers(limit, offset)
    }

    @UseGuards(JwtAuthGuard)
    @Put(':id/update/picture')
    @UseInterceptors(FileInterceptor('file', storage))
    public async uploadProfilPicture(@Param() params, @UploadedFile() file, @Req() req): Promise<any> {
        const id = parseInt(params.id)
        if (id != req.user.id) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
        }
        const newPath = join(process.cwd(), '/' + file.path)
        const image = fs.readFileSync(newPath)
        let extension = path.parse(file.originalname).ext
        const ext = extension.slice(1)
        const imageUrl = `data:image/${ext};base64,` + image.toString('base64')
        await this.usersService.updatePicture(id, imageUrl)
        fs.unlink(newPath, (error) => {
            if (error) {
                console.error(error)
                return
            }
        })
        return {
            message: 'PROFIL_PICTURE_UPDATE_SUCCESS'
        }
    }

    // Function for set to false firstConn variable in db
    @UseGuards(JwtAuthGuard)
    @Put(':id/first_connection')
    public async setFalseFirstConn(@Param() params, @Req() req): Promise<any> {
        const id = parseInt(params.id)

        if (id != req.user.id) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
        }
        await this.usersService.setFalseFirstConn(id)
        return {
            message: 'FIRST_CONNECTION_UPDATE_SUCCESS'
        }
    }
    
    // Function for check if login already exist in db
    @Get('check-login-availability/:login')
    public async checkLoginIsAvailable(@Param() params): Promise<any> {
        const user = await this.usersService.checkLoginIsAvailable(params.login)

        if (user) {
            throw new HttpException('This login already exist', HttpStatus.CONFLICT)
        }
    }

    @UseGuards(JwtAuthGuard)
    @Patch('in-game')
    public async userIsInGame(@Req() req: any) {
        return this.usersService.setIsInGame(req.user.id)
    }

    @UseGuards(JwtAuthGuard)
    @Patch('not-in-game')
    public async userIsNotInGame(@Req() req: any) {
        return this.usersService.setOnline(req.user.id)
    }

    @UseGuards(JwtAuthGuard)
    @Put('update-email/:id')
    public async updateEmail(@Param() params, @Body() body, @Req() req): Promise<any> {
        const id = parseInt(params.id)
        if (id != req.user.id) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
        }
        return await this.usersService.updateEmail(id, body.email)
    }

    // Function check if password is valid
    @UseGuards(JwtAuthGuard)
    @Post('check-password/:id')
    public async checkPassword(@Param() params, @Body() body, @Req() req): Promise<any> {
        const id = parseInt(params.id)
        if (id != req.user.id) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
        }
        const check = await this.usersService.checkPassword(id, body.password)
    
        if (!check) {
            throw new HttpException('PASSWORD_NOT_VALID', HttpStatus.FORBIDDEN)
        }
        return
    }

    // Function for update password
    @UseGuards(JwtAuthGuard)
    @Put('update-password/:id')
    public async updatePassword(@Param() params, @Body() body, @Req() req): Promise<any> {
        const id = parseInt(params.id)
        if (id != req.user.id) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
        }
        return await this.usersService.updatePassword(id, body.password)
    }

    // Function for recover profile picture
    @UseGuards(JwtAuthGuard)
    @Get('get-picture/:id')
    public async getPicture(@Param() params, @Req() req): Promise<any> {
        const id = parseInt(params.id)
        if (id != req.user.id) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
        }
        return this.usersService.getPicture(id)
    }

    // Function search users
    @UseGuards(JwtAuthGuard)
    @Get('search-users')
    async findUsers(@Query('login') login: string) {
        return this.usersService.findByloginStartingWith(login)
    }

    // Function for get login of user by his id
    @UseGuards(JwtAuthGuard)
    @Get('get-user-login/:id')
    async getLoginOfUser(@Param() params) {
        return this.usersService.getLoginOfUser(parseInt(params.id))
    }

    @UseGuards(JwtAuthGuard)
    @Get('get-blocked-users')
    public async getBlockedUsers(@Req() req) {
        return this.usersService.getBlockedUsers(req.user.id)
    }

    // Function for get user data but without password field ;) (C est mieux parce que sinon niveau securite c'est pas ouf)
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    public async findOneById(@Param() params, @Req() req): Promise<any> {
        const id = parseInt(params.id)
        if (id != req.user.id) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
        } 
        return await this.usersService.findOneById(id)
    }

    @UseGuards(JwtAuthGuard)
    @Post('block-a-user')
    public async blockAUser(@Req() req, @Body() body) {
        const userExist = await this.usersService.findOneById(parseInt(body.blockedUserId))
        if (!userExist) {
            throw new HttpException('This user does not exist!', HttpStatus.BAD_REQUEST)
        }
        return this.usersService.blockAUser(req.user.id, parseInt(body.blockedUserId))
    }

    @UseGuards(JwtAuthGuard)
    @Delete('unblock-a-user')
    public async unblockAUser(@Req() req, @Body() body) {
        const userExist = await this.usersService.findOneById(parseInt(body.blockedUserId))
        if (!userExist) {
            throw new HttpException('This user does not exist!', HttpStatus.BAD_REQUEST)
        }
        return this.usersService.unblockAUser(req.user.id, parseInt(body.blockedUserId))
    }

    @UseGuards(JwtAuthGuard)
    @Get('is-blocked/:blockedUserId')
    public async isBlocked(@Req() req, @Param() params) {
        const userExist = await this.usersService.findOneById(parseInt(params.blockedUserId))
        if (!userExist) {
            throw new HttpException('This user does not exist!', HttpStatus.BAD_REQUEST)
        }
        return this.usersService.isBlocked(req.user.id, parseInt(params.blockedUserId))
    }
}
