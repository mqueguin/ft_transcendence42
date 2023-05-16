import { WebSocketGateway, MessageBody, ConnectedSocket, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets'
import { Socket, Server } from 'socket.io'
import { UsersService } from 'src/users/users.service'
import { GamesService } from './games.service'
  
@WebSocketGateway(4343, {cors: {
      origin: "http://localhost:8080",
      credentials: true,
      }
})
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly gamesService: GamesService,
              private readonly usersService: UsersService) {}

  @WebSocketServer()
  server: Server
  
  
  private socketIdsByUserId: Map<string, string> = new Map()
  private userIdsBySocketId: Map<string, string> = new Map()
  private matchmaking_id: string[] = []
  private matchmaking_nb: number = 0

  private matchmakingFunMode_id: string[] = []
  private matchmakingFunMode_nb: number = 0

  // State of players in game
  private readyPlayersByRoom: Map<string, { player1: boolean; player2: boolean }> = new Map()

  private spectatorsByRoom: Map<string, string[]> = new Map()
  
  handleConnection(socket: Socket) {
    try {
      let { userId } = socket.handshake.query;
      this.socketIdsByUserId.set(userId.toString(), socket.id)
      this.userIdsBySocketId.set(socket.id, userId.toString())
    } catch (err) {
      console.error(err)
    }
  }

  // Peut-etre un probleme dans cette fonction a voir plus tard
  async handleDisconnect(@ConnectedSocket() socket: Socket) {
    try {
      const userId = this.userIdsBySocketId.get(socket.id)

      let match
      if (userId) {
        match = await this.gamesService.findMatchByUserIdAndProgress(parseInt(userId))
      }

      if (match) {
        socket.leave(match.id.toString())
        await this.gamesService.deleteMatch(match.id)
        
        const opponentId = (match.players[0].id === parseInt(userId)) ? match.players[1].id : match.players[0].id
        const opponentSocketId = this.socketIdsByUserId.get(opponentId.toString())
        
        if (opponentSocketId) {
          this.server.to(match.id.toString()).emit('matchInterrupted')
        }
        this.server.sockets.sockets.get(opponentSocketId)?.leave(match.id.toString())
      }
      
      await this.usersService.setOnline(parseInt(userId))
      this.socketIdsByUserId.delete(userId.toString())
      this.userIdsBySocketId.delete(socket.id)
    } catch (err) {
      console.error(err)
    }
  }

  @SubscribeMessage('joinMatchmaking')
  async handleMatchmaking(@ConnectedSocket() socket: Socket, @MessageBody('gameMode') gameMode: string) {
    const userId = this.userIdsBySocketId.get(socket.id)
    if (userId) {
      if (this.matchmaking_id.indexOf(userId) === -1) {
        this.matchmaking_id.push(userId)
        this.matchmaking_nb += 1
        this.server.to(socket.id).emit('UserEnterInTheQueue', { gameMode: 'CLASSIC' })

        if (this.matchmaking_nb >= 2) {
          const player1Id = this.matchmaking_id.shift()
          const player2Id = this.matchmaking_id.shift()
          this.matchmaking_nb -= 2

          const match = await this.gamesService.createMatch({
            players: [player1Id, player2Id],
            gameMode: gameMode,
            gameStatus: 'WAITING'
          })

          const roomId = match.id.toString()

          const player1SocketId = this.socketIdsByUserId.get(player1Id)
          const player2SocketId = this.socketIdsByUserId.get(player2Id)
          const player1Socket = this.server.sockets.sockets.get(player1SocketId);
          const player2Socket = this.server.sockets.sockets.get(player2SocketId);

          // Faire rejoindre les joueurs à la room
          if (player1Socket) {
            player1Socket.join(roomId);
          }
          if (player2Socket) {
            player2Socket.join(roomId);
          }

          /* this.server.to(roomId).emit('gameReady', { roomId, player1Id, player2Id }) */
          this.server.to(player1SocketId).emit('matchFound', { opponent: match.player2, roomId: roomId, player: '1', role: 'sender', opponentId: player2Id, gameMode: 'CLASSIC' })
          this.server.to(player2SocketId).emit('matchFound', { opponent: match.player1, roomId: roomId, player: '2', role: 'receiver', opponentId: player1Id, gameMode: 'CLASSIC' })
          await this.gamesService.updateMatchInProgress(match.id)
        }
      } else {
        this.server.to(socket.id).emit('UserAlreadyInQueue')
      }
    }
  }
  
  @SubscribeMessage('quitMatchmaking')
  async handleQuitMatchmaking(@ConnectedSocket() socket: Socket, @MessageBody('gameMode') gameMode: string) {
    const userId = this.userIdsBySocketId.get(socket.id)
    if (userId) {
      // Permet de supprimer le user de la file d'attente
      const index = this.matchmaking_id.indexOf(userId, 0)
      if (index > -1) {
        this.matchmaking_id.splice(index, 1)
        this.matchmaking_nb -= 1
      }
    }
    const match = await this.gamesService.findMatchByUserId(userId, gameMode)
    if (match) {
      socket.leave(match.id.toString())
      await this.gamesService.deleteMatch(match.id)

      const opponentId = (match.players[0].id === parseInt(userId)) ? match.players[1].id : match.players[0].id
      const opponentSocketId = this.socketIdsByUserId.get(opponentId.toString())
      if (opponentSocketId) {
        this.server.to(opponentSocketId).emit('matchCancelled', { gameMode: gameMode })
      }

      this.server.sockets.sockets.get(opponentSocketId)?.leave(match.id.toString())
      this.server.socketsLeave(match.id.toString())
    }
  }

  @SubscribeMessage('playerReady')
  async handlePlayerReady(@ConnectedSocket() socket: Socket, @MessageBody() data: { player: string; roomId: string } ) {
    const { player, roomId } = data
    
    if (!this.readyPlayersByRoom.has(roomId)) {
      this.readyPlayersByRoom.set(roomId, { player1: false, player2: false })
    }

    const readyPlayers = this.readyPlayersByRoom.get(roomId)
    if (player === '1') {
      readyPlayers.player1 = true
    } else if (player === '2') {
      readyPlayers.player2 = true
    }

    this.readyPlayersByRoom.set(roomId, readyPlayers)

    // Check if users are ready
    if (readyPlayers.player1 && readyPlayers.player2) {
      this.server.to(roomId).emit('gameStart', { roomId: roomId })
    }
  }

  @SubscribeMessage('ballPosition')
  async handleBallPosition(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; ball: { x: number; y: number }, receiverPlayerId: string },
  ) {
    const { roomId, ball, receiverPlayerId } = data;


    // Transmettre la position de la balle aux autres clients dans la même salle
      this.server.to(roomId).emit('ballPositionUpdated', ball);
  }

  @SubscribeMessage('paddleLeftPosition')
  async handlePaddleLeftPosition(@ConnectedSocket() socket: Socket, @MessageBody() data: { roomId: string; paddleLeft: { x: number, y: number } }) {
    const { roomId, paddleLeft } = data
    
    this.server.to(roomId).emit('paddleLeftPositionUpdated', paddleLeft)
  }

  @SubscribeMessage('paddleRightPosition')
  async handlePaddleRightPosition(@ConnectedSocket() socket: Socket, @MessageBody() data: { roomId: string; paddleRight: { x: number, y: number } }) {
    const { roomId, paddleRight } = data

    this.server.to(roomId).emit('paddleRightPositionUpdated', paddleRight)
  }

  @SubscribeMessage('updateScore')
  async handleScore(@ConnectedSocket() socket: Socket, @MessageBody() data: { roomId: string, left: number, right: number, receiverId: string }) {
    const { roomId, left, right, receiverId } = data

      this.server.to(roomId).emit('scoreUpdated', { left: left, right: right})
  }

  @SubscribeMessage('gameFinish')
  async handleGameFinish(@ConnectedSocket() socket: Socket, @MessageBody() data: { opponentId: string, roomId: string, player1Score: number, player2Score: number }) {
    const { opponentId, roomId, player1Score, player2Score } = data

    const userId = this.userIdsBySocketId.get(socket.id)

    const res = await this.gamesService.matchFinishUpdate(parseInt(roomId), parseInt(userId), parseInt(opponentId), player1Score, player2Score)
    if (res >= 1 && res <= 5) {
      const winnerId = player1Score > player2Score ? userId : opponentId
      const winnerSocketId = this.socketIdsByUserId.get(winnerId)
      this.server.to(winnerSocketId).emit('newAchievment')
    }

    let opponentSocketId = this.socketIdsByUserId.get(opponentId)
    if (!opponentSocketId) {
      opponentSocketId = this.socketIdsByUserId.get(opponentId.toString())
    }
    
    this.server.to(roomId).emit('quitTheMatch')
    
    socket.leave(roomId)
    this.server.sockets.sockets.get(opponentSocketId)?.leave(roomId)
    this.server.socketsLeave(roomId)
  }

  @SubscribeMessage('joinAsSpectator')
  async handleJoinAsSpectator(@ConnectedSocket() socket: Socket, @MessageBody() data: { roomId: number }) {
    const roomId = data.roomId.toString()

    const userId = this.userIdsBySocketId.get(socket.id)

    if (!this.spectatorsByRoom.has(roomId)) {
      this.spectatorsByRoom.set(roomId, [])
    }
    this.spectatorsByRoom.get(roomId).push(userId)

    socket.join(roomId)
  }


  /* FUN MODE PART */
  @SubscribeMessage('joinMatchmakingFunMode')
  async handleMatchmakingFunMode(@ConnectedSocket() socket: Socket, @MessageBody('gameMode') gameMode: string) {
    const userId = this.userIdsBySocketId.get(socket.id)
    if (userId) {
      if (this.matchmakingFunMode_id.indexOf(userId) === -1) {
        this.matchmakingFunMode_id.push(userId)
        this.matchmakingFunMode_nb += 1
        this.server.to(socket.id).emit('UserEnterInTheQueue', { gameMode: 'FUNMODE' })

        if (this.matchmakingFunMode_nb >= 2) {
          const player1Id = this.matchmakingFunMode_id.shift()
          const player2Id = this.matchmakingFunMode_id.shift()
          this.matchmakingFunMode_nb -= 2

          const match = await this.gamesService.createMatch({
            players: [player1Id, player2Id],
            gameMode: gameMode,
            gameStatus: 'WAITING'
          })

          const roomId = match.id.toString()

          const player1SocketId = this.socketIdsByUserId.get(player1Id)
          const player2SocketId = this.socketIdsByUserId.get(player2Id)
          const player1Socket = this.server.sockets.sockets.get(player1SocketId);
          const player2Socket = this.server.sockets.sockets.get(player2SocketId);

          // Faire rejoindre les joueurs à la room
          if (player1Socket) {
            player1Socket.join(roomId);
          }
          if (player2Socket) {
            player2Socket.join(roomId);
          }

          /* this.server.to(roomId).emit('gameReady', { roomId, player1Id, player2Id }) */
          this.server.to(player1SocketId).emit('matchFound', { opponent: match.player2, roomId: roomId, player: '1', role: 'sender', opponentId: player2Id, gameMode: 'FUNMODE' })
          this.server.to(player2SocketId).emit('matchFound', { opponent: match.player1, roomId: roomId, player: '2', role: 'receiver', opponentId: player1Id, gameMode: 'FUNMODE' })
          await this.gamesService.updateMatchInProgress(match.id)
        }
      } else {
        this.server.to(socket.id).emit('UserAlreadyInQueue')
      }
    }
  }

  @SubscribeMessage('quitMatchmakingFunMode')
  async handleQuitMatchmakingFunMode(@ConnectedSocket() socket: Socket, @MessageBody('gameMode') gameMode: string) {
    const userId = this.userIdsBySocketId.get(socket.id)
    if (userId) {
      // Permet de supprimer le user de la file d'attente
      const index = this.matchmakingFunMode_id.indexOf(userId, 0)
      if (index > -1) {
        this.matchmakingFunMode_id.splice(index, 1)
        this.matchmakingFunMode_nb -= 1
      }
    }
    const match = await this.gamesService.findMatchByUserId(userId, 'FUNMODE')
    if (match) {
      socket.leave(match.id.toString())
      await this.gamesService.deleteMatch(match.id)

      const opponentId = (match.players[0].id === parseInt(userId)) ? match.players[1].id : match.players[0].id
      const opponentSocketId = this.socketIdsByUserId.get(opponentId.toString())
      if (opponentSocketId) {
        this.server.to(opponentSocketId).emit('matchCancelled', { gameMode: 'FUNMODE' })
      }
      this.server.sockets.sockets.get(opponentSocketId)?.leave(match.id.toString())
      this.server.socketsLeave(match.id.toString())
    }
  }

  @SubscribeMessage('joinPrivateMatch')
  async handleJoinPrivateMatch(@ConnectedSocket() socket: Socket, @MessageBody() data: { matchId: number, player: string, player2Login: string }) {
    const { matchId, player, player2Login } = data

    try {
      socket.join(matchId.toString())
      if (player === '2') {
        socket.to(matchId.toString()).emit('friendConnected', { opponentLogin: player2Login })
      }
      socket.emit('joinPrivateMatchResponse', true)
    } catch (err) {
      console.error(err)
      socket.emit('joinPrivateMatchResponse', false)
    }
  }

  @SubscribeMessage('preparePrivateGame')
  async preparePrivateGame(@ConnectedSocket() socket: Socket, @MessageBody() data: { roomId: string, player1Login: string, player2Login: string, opponentId: number, gameMode: string }) {
    const { roomId, player1Login, player2Login, opponentId, gameMode } = data

    try {
      const player1Id = this.userIdsBySocketId.get(socket.id.toString())
      const player2SocketId = this.socketIdsByUserId.get(opponentId.toString())
      this.server.to(socket.id).emit('matchFound', { opponent: player2Login, roomId: roomId, player: '1', role: 'sender', opponentId: opponentId, gameMode: gameMode })
      this.server.to(player2SocketId).emit('matchFound', { opponent: player1Login, roomId: roomId, player: '2', role: 'receiver', opponentId: player1Id, gameMode: gameMode })
      await this.gamesService.updateMatchInProgress(parseInt(roomId))
    } catch (err) {
      console.error(err)
    }
  }

  @SubscribeMessage('cancelPrivateMatch')
  async cancelPrivateMatch(@ConnectedSocket() socket: Socket, @MessageBody() data: { roomId: string, gameMode: string }) {
    const { roomId, gameMode } = data

    try {
      await this.gamesService.deleteMatch(parseInt(roomId))
      socket.to(roomId).emit('privateMatchCancelled')
      this.server.socketsLeave(roomId)
    } catch (err) {
      console.error('Error during match cancelled:', err)
    }
  }
}