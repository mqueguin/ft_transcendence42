import { Controller, HttpException, HttpStatus, Req, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { GamesService } from './games.service';
import { UsersService } from 'src/users/users.service';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService,
              private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('get-all-classic-matches')
  async getAllMatches() {
    return this.gamesService.getAllClassicMatches()
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-all-fun-matches')
  async getAllFunMatches() {
    return this.gamesService.getAllFunMatches()
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-matches-history/:userId')
  async getUserMatchesHistory(@Param() params: any) {
    const user = await this.usersService.findOneById(parseInt(params.userId))

    if (!user) {
      throw new HttpException('This user does not exist!', HttpStatus.BAD_REQUEST)
    }
    return this.gamesService.getMatchesHistory(parseInt(params.userId))
  }

  @UseGuards(JwtAuthGuard)
  @Post('create-match')
  async createMatch(@Req() req: any, @Body() body: { opponentId: string, gameMode: string, gameStatus: string }) {
    const { opponentId, gameMode, gameStatus } = body

    const user = await this.usersService.findOneById(parseInt(opponentId))
    if (!user) {
      throw new HttpException('This user does not exist!', HttpStatus.BAD_REQUEST)
    }

    return this.gamesService.createMatch({
      players: [req.user.id, parseInt(opponentId)],
      gameMode: gameMode,
      gameStatus: gameStatus
    })
   
  }
}
