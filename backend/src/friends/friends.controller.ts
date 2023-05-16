import { Controller, Get, UseGuards, HttpException, HttpStatus, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { UsersService } from 'src/users/users.service';


@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService,
              private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Post('request')
  async requestFrienship(@Body() users: any): Promise<void> {
    const userAId = parseInt(users.userAId)
    const userBId = parseInt(users.userBId)

    // Verifier si une relation d'amitier existe deja entre ces 2 utilisateurs
    const friendshipExists = await this.friendsService.checkFriendship(userAId, userBId)
    if (friendshipExists) {
      if (friendshipExists === 'ACCEPTED') {
        throw new HttpException('This user is already your friend!', HttpStatus.CONFLICT)
      } else if (friendshipExists === 'PENDING') {
        throw new HttpException('A friend request is already pending with this user!', HttpStatus.CONFLICT)
      } else {
        throw new HttpException('This user has already declined your friend request!', HttpStatus.CONFLICT)
      }
    }

    try {
      await this.friendsService.requestFriendship(userAId, userBId)
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-all-friends-request/:id')
  async getAllFriendsRequest(@Param() params, @Req() req): Promise<any> {
    if (parseInt(params.id) != req.user.id) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED)
    }
    return this.friendsService.getAllFriendsRequest(parseInt(params.id))
  }

  // Accept friend request
  @UseGuards(JwtAuthGuard)
  @Patch('accept-friend-request')
  async acceptFriendRequest(@Body() body): Promise<any> {
    const recipientId = body.recipientId
    const requesterId = body.requesterId
    try {
      await this.friendsService.acceptFriendRequest(parseInt(requesterId), parseInt(recipientId))
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }
  }

  // Refuse friend request
  @UseGuards(JwtAuthGuard)
  @Patch('refuse-friend-request')
  async refuseFriendRequest(@Body() body): Promise<any> {
    const recipientId = body.recipientId
    const requesterId = body.requesterId
    try {
      await this.friendsService.refuseFriendRequest(parseInt(requesterId), parseInt(recipientId))
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST)
    }
  }

  // Get all friends of an user
  @UseGuards(JwtAuthGuard)
  @Get('get-friends/:id')
  async getFriends(@Param() params): Promise<any> {
    const friendsId = await this.friendsService.getFriends(parseInt(params.id))

    // Request for get friends data
    let friends = []
    for (let friendId of friendsId) {
      friends.push(await this.usersService.findOneById((friendId.userAId ? friendId.userAId : friendId.userBId)))
    }
    // Boucle for erase unnecessary data
    for (let friend of friends) {
      friend = this.usersService.exclude(friend, ['twoFactorAuthenticationSecret', 'email', 'id42', 'twoFaAuth', 'firstConn'])
    }
    return friends
  }

  @UseGuards(JwtAuthGuard)
  @Delete('remove-friend')
  async removeFriend(@Body() body) {
    return this.friendsService.removeFriend(parseInt(body.userAId), parseInt(body.userBId))
  }
}
