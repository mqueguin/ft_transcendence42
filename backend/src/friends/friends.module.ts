import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { FriendsGateway } from './friends.gateway';
import { UsersModule } from "../users/users.module";

@Module({
  imports: [UsersModule],
  exports: [],
  controllers: [FriendsController],
  providers: [FriendsService, PrismaService, UsersService, FriendsGateway]
})
export class FriendsModule {}
