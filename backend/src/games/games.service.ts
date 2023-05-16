import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GameMode, GameStatus } from './types/games.types';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async createMatch(matchData: {
    players: string[],
    gameMode: string,
    gameStatus: string
  }): Promise<any> {
    const loginPlayer1 = await this.prisma.user.findUnique({
      where: {
        id: parseInt(matchData.players[0])
      },
      select: {
        login: true
      }
    })
    const loginPlayer2 = await this.prisma.user.findUnique({
      where: {
        id: parseInt(matchData.players[1])
      },
      select: {
        login: true
      }
    })
    const newMatch = await this.prisma.match.create({
      data: {
        player1: loginPlayer1.login,
        player2: loginPlayer2.login,
        players: {
          connect: matchData.players.map((playerId) => ({ id: parseInt(playerId) }))
        },
        gameType: (matchData.gameMode === 'CLASSIC' ? 'CLASSIC' : 'FUNMODE'),
        gameStatus: (matchData.gameStatus === 'WAITING'? 'WAITING' : 'INPROGRESS')
      }
    })
    return newMatch
  }

  async deleteMatch(matchId: number): Promise<any> {
    return this.prisma.match.delete({
      where: {
        id: matchId
      }
    })
  }

  async findMatchByUserId(userId: string, gameMode: string): Promise<any> {
    const match = await this.prisma.match.findFirst({
      where: {
        players: {
          some: {
            id: parseInt(userId)
          }
        },
        gameType: (gameMode === 'CLASSIC') ? 'CLASSIC' : 'FUNMODE',
        gameStatus: 'INPROGRESS'
      },
      include: {
        players: true
      }
    })
    return match
  }

  async findMatchByUserIdAndProgress(userId: number): Promise<any> {
    const match = await this.prisma.match.findFirst({
      where: {
        players: {
          some: {
            id: userId
          }
        },
        gameStatus: 'INPROGRESS',
      },
      select: {
        id: true,
        players: true
      }
    })
    return match 
  }

  async updateMatchInProgress(matchId: number) {
    return this.prisma.match.update({
      where: {
        id: matchId
      },
      data: {
        gameStatus: 'INPROGRESS'
      }
    })
  }

  async matchFinishUpdate(roomId: number, userId: number, opponentId, player1Score: number, player2Score: number) {
    const match = await this.prisma.match.findUnique({
      where: {
        id: roomId
      },
      select: {
        player1: true,
        player2: true,
        gameType: true
      }
    })

    const matchUpdate = await this.prisma.match.update({
      where: {
        id: roomId
      },
      data: {
        winnerScore: (player1Score > player2Score ? player1Score : player2Score),
        losserScore: (player1Score > player2Score ? player2Score : player1Score),
        winner: (player1Score > player2Score ? userId.toString() : opponentId.toString()),
        losser: (player1Score > player2Score ? opponentId.toString() : userId.toString()),
        gameStatus: 'FINISH'
      }
    })

    if (match.gameType === 'FUNMODE') {
      return matchUpdate
    }
    const winnerId = player1Score > player2Score ? userId : opponentId
    const loserId = player1Score > player2Score ? opponentId : userId

    const winnerUpdate = await this.prisma.user.update({
      where: {
        id: winnerId
      },
      data: {
        wins: {
          increment: 1
        },
        elo: {
          increment: 50
        },
        isOnline: 'ON'
      }
    })

    const loserUpdate = await this.prisma.user.update({
      where: {
        id: loserId
      },
      data: {
        losses: {
          increment: 1
        },
        elo: {
          decrement: 25
        },
        isOnline: 'ON'
      }
    })

    if (winnerUpdate.achievments[0] === false && winnerUpdate.wins === 1) {
      const winnerUpdate = await this.prisma.user.update({
        where: {
          id: winnerId
        },
        data: {
          achievments: [true, false, false, false, false]
        }
      })
      return 1
    } else if (winnerUpdate.achievments[1] === false && winnerUpdate.wins === 10) {
      const winnerUpdate = await this.prisma.user.update({
        where: {
          id: winnerId
        },
        data: {
          achievments: [true, true, false, false, false]
        }
      })
      return 2
    } else if (winnerUpdate.achievments[2] === false && winnerUpdate.wins === 50) {
      const winnerUpdate = await this.prisma.user.update({
        where: {
          id: winnerId
        },
        data: {
          achievments: [true, true, true, false, false]
        }
      })
      return 3
    } else if (winnerUpdate.achievments[3] === false && winnerUpdate.wins === 100) {
      const winnerUpdate = await this.prisma.user.update({
        where: {
          id: winnerId
        },
        data: {
          achievments: [true, true, true, true, false]
        }
      })
      return 4
    } else if (winnerUpdate.achievments[4] === false && winnerUpdate.wins === 500) {
      const winnerUpdate = await this.prisma.user.update({
        where: {
          id: winnerId
        },
        data: {
          achievments: [true, true, true, true, true]
        }
      })
      return 5
    }
    return matchUpdate
  }

  async getAllClassicMatches() {
    return this.prisma.match.findMany({
      where: {
        gameType: 'CLASSIC',
        gameStatus: 'INPROGRESS'
      }
    })
  }

  async getAllFunMatches() {
    return this.prisma.match.findMany({
      where: {
        gameType: 'FUNMODE',
        gameStatus: 'INPROGRESS'
      }
    })
  }

  async getMatchesHistory(userId: number) {
    const matches = await this.prisma.match.findMany({
      where: {
        players: {
          some: {
            id: userId
          }
        },
        gameType: 'CLASSIC',
        gameStatus: 'FINISH'
      },
      select: {
        createdAt: true,
        winner: true,
        losser: true,
        winnerScore: true,
        losserScore: true
      },
    })

    return matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}