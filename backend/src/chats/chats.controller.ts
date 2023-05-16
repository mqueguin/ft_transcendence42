import { HttpException, HttpStatus, Controller, Get, Post, Req, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { CreateChannelDto } from './dto/create-chat.dto';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from 'src/users/users.service';
import { PasswordChannelDto } from './dto/passwordChannel';
import { updateChannelDto } from './dto/update-chat.dto';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService,
              private readonly usersService: UsersService) {}

  // Function for create a channel
  @UseGuards(JwtAuthGuard)
  @Post('create-channel')
  async createChannel(@Body() body: CreateChannelDto): Promise<any> {
    return this.chatsService.createChannel(body)
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-channels')
  async getChannels(@Req() req) { // Faire entity IChannel
    return this.chatsService.getChannels(req.user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-all-users-in-channel/:id')
  async getAllUsersInChannel(@Param() params) {
    return this.chatsService.getAllUsersInChannel(parseInt(params.id))
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-all-public-channels')
  async getAllPublicChannels(@Req() req) {
    return this.chatsService.getAllPublicChannels(req.user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-all-protected-channels')
  async getAllProtectedChannels(@Req() req) {
    return this.chatsService.getAllProtectedChannels(req.user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Post('join-public-channel/:channelId') // channelId correspond a l id du channel
  async joinPublicChannel(@Param() params, @Req() req) {
    return this.chatsService.joinPublicChannel(parseInt(params.channelId), req.user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Post('join-private-channel/:channelId')
  async joinPrivateChannel(@Param() params, @Req() req) {
    return this.chatsService.joinPrivateChannel(parseInt(params.channelId), req.user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Post('join-protected-channel/:channelId')
  async joinProtectedChannel(@Param() params, @Req() req, @Body() body) {
    return this.chatsService.joinProtectedChannel(parseInt(params.channelId), req.user.id, body.password)
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-all-messages/:channelId')
  async getAllMessages(@Param() params) {
    return this.chatsService.getAllMessages(parseInt(params.channelId))
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-message/:channelId')
  async sendMessage(@Param() params, @Body() body, @Req() req) {
    return this.chatsService.sendMessage(parseInt(params.channelId), req.user.id, body.message, body.msgStatus)
  }

  @UseGuards(JwtAuthGuard)
  @Delete('leave-channel/:channelId')
  async leaveChannel(@Param() params, @Req() req) {
    return this.chatsService.leaveChannel(parseInt(params.channelId), req.user.id, req.user.login)
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-current-channel/:channelId')
  async getCurrentChannel(@Param() params) {
    return this.chatsService.getCurrentChannel(parseInt(params.channelId))
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-password-channel-protected/:channelId')
  async verifyPassword(@Param() params, @Body() body: PasswordChannelDto) {
    return this.chatsService.verifyPassword(parseInt(params.channelId), body)
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update-channel-type/:channelId')
  async updateChannelType(@Param() params, @Req() req, @Body() body: updateChannelDto) {
    return this.chatsService.updateChannelType(parseInt(params.channelId), req.user.id, body)
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update-password-protected-chan/:channelId')
  async updatePassProtectedChannel(@Param() params, @Body() body) {
    return this.chatsService.updatePassProtectedChannel(parseInt(params.channelId), body.oldPass, body.newPass)
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-user-role/:channelId')
  async getUserRole(@Param() params, @Req() req) {
    return this.chatsService.getUserRole(parseInt(params.channelId), req.user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mute-a-user/:channelId')
  async muteAUser(@Param() params, @Body() body) {
    return this.chatsService.muteAUser(parseInt(params.channelId), body.userId, body.muteDurationSeconds)
  }

  @UseGuards(JwtAuthGuard)
  @Patch('ban-a-user/:channelId')
  async banAUser(@Param() params, @Body() body) {
    return this.chatsService.banAUser(parseInt(params.channelId), body.userId, body.banDurationSeconds)
  }

  @UseGuards(JwtAuthGuard)
  @Post('get-conversation-channel')
  async getConversationChannel(@Req() req, @Body() body) {
    return this.chatsService.getConversationChannel(req.user.id, parseInt(body.userId))
  }

  @UseGuards(JwtAuthGuard)
  @Post('create-private-message-channel')
  async createPrivateMessageChannel(@Req() req, @Body() body) {
    return this.chatsService.createPrivateMessageChannel(req.user.id, parseInt(body.recipientId))
  }

  @UseGuards(JwtAuthGuard)
  @Patch('add-admin/:userId/:channelId')
  async addAdmin(@Param() params) {
    return this.chatsService.addAdmin(parseInt(params.channelId), parseInt(params.userId))
  }

  @UseGuards(JwtAuthGuard)
  @Patch('remove-admin/:userId/:channelId')
  async removeAdmin(@Param() params) {
    return this.chatsService.removeAdmin(parseInt(params.channelId), parseInt(params.userId))
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-user-is-mute/:channelId')
  async getUserIsMute(@Param() params, @Req() req) {
    return this.chatsService.getUserIsMute(parseInt(params.channelId), req.user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-user-is-ban/:channelId')
  async getUserIsBan(@Param() params, @Req() req) {
    return this.chatsService.getUserIsBan(parseInt(params.channelId), req.user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Delete('kick-a-user/:channelId')
  async kickAUser(@Param() params, @Body() body) {
    return this.chatsService.kickAUser(parseInt(params.channelId), body.userId)
  }

  @UseGuards(JwtAuthGuard)
  @Get('user-is-in-channel/:channelId')
  async userIsInChannel(@Param() params, @Req() req) {
    return this.chatsService.userIsInChannel(parseInt(params.channelId), req.user.id)
  }
}
