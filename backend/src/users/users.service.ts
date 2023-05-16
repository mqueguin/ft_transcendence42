import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateUserDto, LoginUserDto, UpdatePasswordDto } from './dto/users.user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { JwtPayload } from '../auth/jwt.strategy';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import UserId42NotFoundException from "../auth/exception/UserId42NotFoundException"

interface FormatLogin extends Partial<User> {
    login: string
}

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    // Add new user in database
    async create(userDto: CreateUserDto): Promise<any> {
        // Check if user already exists in the db
        const userInDb = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { login: userDto.login },
                    { email: userDto.email }
                ]
            }
        })
        if (userInDb) {
            throw new HttpException('User already exists', HttpStatus.CONFLICT)
        }
    
        // Hash the password before saving to the db
        const hashedPassword = await hash(userDto.password, 10);
        if (userDto.id42 === undefined) {
            userDto.id42 = -1;
            let hashedEmail = await hash(userDto.email, 10)
            hashedEmail = 'https://gravatar.com/avatar/' + hashedEmail
            userDto.avatar = hashedEmail
        }
        // Create the user in the db
        return await this.prisma.user.create({
            data: {
                ...(userDto),
                password: hashedPassword,
            }
        });
    }
    

    // use by auth module to login user
    async login({ email, password }: LoginUserDto): Promise<FormatLogin> {
        const user = await this.prisma.user.findFirst({
            where: { email }
        })
        if (!user)
            throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED)
        
            // compare password
        const isMatch = await compare(password, user.password)

        if (!isMatch)
            throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED)
        const { password: p, ...rest } = user

        // Update isOnline variable in db
        await this.prisma.user.update({
            where: { id: user.id },
            data: { isOnline: 'ON'}
        })
        return rest
    }

    // use by auth module to get user in database
    async findByPayload({ login }: any): Promise<any> {
        return await this.prisma.user.findFirst({
            where: { login }
        })
    }

    // For search user by email
    async findOneByEmail(email: string): Promise<any> {
        return await this.prisma.user.findFirst({
            where: { email }
        })
    }

    // For search user by login
    async findOneByLogin(login: string): Promise<any> {
        return await this.prisma.user.findFirst({
            where: { login }
        })
    }

    // Function for exclude a or many fields of the data base
    exclude<User, Key extends keyof User>(
        user: User,
        keys: Key[]
      ): Omit<User, Key> {
        for (let key of keys) {
          delete user[key]
        }
        return user
      }

    // Function for find a user by id but without password field
    async findOneById(id: number): Promise<any> {
        const user = await this.prisma.user.findUnique({
            where: { id:id }
        })
        const userWithoutPassword = this.exclude(user, ['password'])
        return userWithoutPassword
    }

    // Function for find a user by id42
    async findUserById42(id42: number): Promise<any> {
        const user = await this.prisma.user.findFirst({
            where: { id42 }
        })
        if (user) {
            return user
        } else {
            throw new UserId42NotFoundException(id42)
        }
    }

    // Function for set isOnline variable on OFF
    async setOffline(userId: number): Promise<any> {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { isOnline: 'OFF' }
        })
    }

    async setIsInGame(userId: number): Promise<any> {
        return await this.prisma.user.update({
            where: {
                id: userId
            },
            data: { isOnline: 'INGAME'}
        })
    }

    async setOnline(userId: number): Promise<any> {
        return this.prisma.user.update({
            where: {
                id: userId
            },
            data: {
                isOnline: 'ON'
            }
        })
    }

    async updatePicture(userId: number, filename: string): Promise<any> {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { avatar: filename }
        })
    }

    async setFalseFirstConn(userId: number): Promise<any> {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { firstConn: false }
        })
    }

    async checkLoginIsAvailable(login: string): Promise<any> {
        return await this.prisma.user.findFirst({
            where: { login: login }
        })
    }

    async updateEmail(userId: number, email: string): Promise<any> {
        const check = await this.findOneByEmail(email)

        if (check) {
            throw new HttpException('This email already exist', HttpStatus.CONFLICT)
        }
        
        return await this.prisma.user.update({
            where: { id: userId },
            data: { email: email }
        })
    }

    // Function to get 50 users
    async getAllUsers(limit: number, offset: number) {
        return await this.prisma.user.findMany({
            take: limit,
            skip: offset,
            select: {
                id: true,
                login: true,
                isOnline: true,
                losses: true,
                wins: true,
                avatar: true,
                elo: true
            }
        })
    }

    // Function for check password validity
    async checkPassword(userId: number, currentPass: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED)
        }

        const check = await compare(currentPass, user.password)

        if (!check) {
            return null
        }
        return {
            message: 'PASSWORD_VALIDATE'
        }
    }

    // Function for update password of user
    async updatePassword(userId: number, newPass: string) {

        const hashedPassword = await hash(newPass, 10);

        return await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        })
    }

    // Function for return profile picture of user
    async getPicture(userId: number) {
        return await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                avatar: true
            }
        })
    }

    // Function for storage twoAuthSecret key in db
    async setTwoAuthSecret(secret: string, userId: number) {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorAuthenticationSecret: secret }
        })
    }

    // Turn to true double Auth in db
    async turnOnTwoFactorAuth(userId: number) {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { twoFaAuth: true }
        })
    }

    async turnOffTwoFactorAuth(userId: number) {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { twoFaAuth: false }
        })
    }

    // Function for search users with login
    async findByloginStartingWith(loginSearch: string) {
        const users = await this.prisma.user.findMany({
            where: { login: { startsWith: loginSearch } },
            select: {
                id: true,
                login: true,
                avatar: true,
                isOnline: true
            }
        })
        return users
    }

    // Function to return the data of a user who sends a friend request
    async getUserSentFriendRequest(userId: number) {
        return await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                login: true,
                avatar: true
            }
        })
    }

    // Function for get login of user
    async getLoginOfUser(userId: number) {
        return await this.prisma.user.findUnique({
            where: { id:userId },
            select: {
                login: true
            }
        })
    }

    async blockAUser(userId: number, blockedUserId: number) {
        const existingBlock = await this.prisma.block.findFirst({
            where: {
                userId: userId,
                blockedUserId: blockedUserId
            }
        })
        if (existingBlock) {
            throw new HttpException('This user has already been blocked', HttpStatus.BAD_REQUEST)
        }

        const block = await this.prisma.block.create({
            data: {
                user: {
                    connect: { id: userId }
                },
                blockedUser: {
                    connect: { id: blockedUserId }
                }
            }
        })
        return block
    }

    async unblockAUser(userId: number, blockedUserId: number) {
        const existingBlock = await this.prisma.block.findFirst({
            where: {
                userId: userId,
                blockedUserId: blockedUserId,
            },
        })
        if (!existingBlock) {
            throw new HttpException('This user wa not blocked!', HttpStatus.BAD_REQUEST)
        }

        const unblock = await this.prisma.block.delete({
            where: {
                id: existingBlock.id
            },
        })
        return unblock
    }

    async isBlocked(userId: number, blockedUserId: number) {
        const existingBlock = await this.prisma.block.findFirst({
            where: {
                userId: userId,
                blockedUserId: blockedUserId,
            },
        })
        if (!existingBlock) {
            return false
        }
        return true
    }

    async getBlockedUsers(userId: number): Promise<{ id: number, login: string }[]> {
        const blockedUsers = await this.prisma.block.findMany({
            where: {
                userId: userId
            },
            select: {
                blockedUser: {
                    select: {
                        id: true,
                        login: true
                    }
                }
            }
        })
        return blockedUsers.map(block => ({ id: block.blockedUser.id, login: block.blockedUser.login }))
    }
}
