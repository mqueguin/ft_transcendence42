import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from "../users/users.module";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./jwt.strategy";
import { AuthController } from './auth.controller';
import { UsersService } from "../users/users.service";
import { PrismaService } from "../prisma/prisma.service";
import { School42Strategy } from './oauth.strategy';
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [
    UsersModule,
    ConfigModule,
    PassportModule.register({
      defaultStrategy: 'jwt',
      property: 'user',
      session: false,
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: process.env.JWT_EXPIRATION,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersService, JwtStrategy, PrismaService, School42Strategy],
  exports: [
    PassportModule,
    JwtModule
  ],
})

export class AuthModule {
}
