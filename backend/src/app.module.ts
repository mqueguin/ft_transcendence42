import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FriendsModule } from './friends/friends.module';
import { GamesModule } from './games/games.module';
import { ChatsModule } from './chats/chats.module';


@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [AuthModule, UsersModule, FriendsModule, GamesModule, ChatsModule],
})
export class AppModule {}
