import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { FriendsService } from './friends.service';

@WebSocketGateway(4040, {cors: {
    origin: "http://localhost:8080",
    credentials: true
    }
})
export class FriendsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor() {}

    @WebSocketServer()
    server: Server

    private socketIdsByUserId: Map<string, string> = new Map()
    private userIdsBySocketId: Map<string, string> = new Map()

    @SubscribeMessage('sendFriendRequest')
    async handleSendFriendRequest(socket: Socket, data: any) {
        try {
            const recipientId: string = data.recipientId.toString()
            const requesterId: string = data.requesterId.toString()
            const recipientSocketId = this.socketIdsByUserId.get(recipientId)
            if (recipientSocketId) {
                socket.to(recipientSocketId).emit('friendRequestReceived', requesterId);
            }
        } catch (err) {
            console.error(err)
        }
    }

    @SubscribeMessage('friendRequestAccepted')
    async handleFriendRequestAccepted(socket: Socket, data: any) {
        try {
            const requesterId = data.toString()

            const requesterSocketId = this.socketIdsByUserId.get(requesterId)
            const recipientUserId = this.userIdsBySocketId.get(socket.id)
            if (requesterSocketId) {
                socket.to(requesterSocketId).emit('notifFriendRequestAccepted', recipientUserId)
            }
        } catch (err) {
            console.error(err)
        }
    }

    handleConnection(socket: Socket) {
        try {
            let { userId } = socket.handshake.query
            userId = userId.toString()
            this.socketIdsByUserId.set(userId, socket.id)
            this.userIdsBySocketId.set(socket.id, userId)
            this.server.emit('userChangeStatus', { id: parseInt(userId), status: 'ON' })
        } catch (err) {
            console.error(err)
        }
    }

    handleDisconnect(socket: Socket) {
        try {
            let { userId } = socket.handshake.query
            userId = userId.toString()
            this.socketIdsByUserId.delete(userId)
            this.userIdsBySocketId.delete(socket.id)
            this.server.emit('userChangeStatus', { id: parseInt(userId), status: 'OFF' })
            
        } catch (err) {
            console.error(err)
        }
    }

    @SubscribeMessage('sendInvitePrivateChannel')
    async sendInvitePrivateChannel(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
        try {
            const recipientSocketId = this.socketIdsByUserId.get(data.recipientId)
            this.server.to(recipientSocketId).emit('receiveInvitePrivateChannel', { requesterId: data.requesterId, channelId: data.channelId, name: data.name })
        } catch (err) {
            console.error('Error during send invite to private channel:', err)
        }
    }

    @SubscribeMessage('sendPongClassicInvit')
    async sendPongClassicInvit(@ConnectedSocket() socket: Socket, @MessageBody() data: { requesterId: number, matchId: number, opponentLogin: string, userId: number }) {
        const { requesterId, matchId, opponentLogin, userId } = data
        
        try {
            const recipientSocketId = this.socketIdsByUserId.get(userId.toString())
            this.server.to(recipientSocketId).emit('receiveInvitePongClassic', { matchId: matchId, opponentLogin: opponentLogin, requesterId: requesterId })
        } catch (err) {
            console.error('Error during send invite to play pong classic:', err)
        }
    }

    @SubscribeMessage('sendPongFunInvit')
    async sendPongFunInvit(@ConnectedSocket() socket: Socket, @MessageBody() data: { requesterId: number, matchId: number, opponentLogin: string, userId: number }) {
        const { requesterId, matchId, opponentLogin, userId } = data
        
        try {
            const recipientSocketId = this.socketIdsByUserId.get(userId.toString())
            this.server.to(recipientSocketId).emit('receiveInvitePongFun', { matchId: matchId, opponentLogin: opponentLogin, requesterId: requesterId })
        } catch (err) {
            console.error('Error during send invite to play pong fun:', err)
        }
    }

    @SubscribeMessage('newMatch')
    async newMatch(@ConnectedSocket() socket: Socket) {
        try {
            this.server.emit('updateMatchInProgress')
        } catch (err) {
            console.error(err)
        }
    }

    @SubscribeMessage('inGame')
    async inGame(@ConnectedSocket() socket: Socket, @MessageBody() data: { userId: string }) {
        try {
            const { userId } = data
            this.server.emit('userInGame', { userId: userId })
        } catch (err) {
            console.error(err)
        }
    }

    @SubscribeMessage('notInGame')
    async notInGame(@ConnectedSocket() socket: Socket, @MessageBody() data: { userId: string }) {
        try {
            const { userId } = data
            this.server.emit('userNotInGame', { userId: userId })
        } catch (err) {
            console.error(err)
        }
    }

    @SubscribeMessage('refreshGames')
    async refreshGames(@ConnectedSocket() socket: Socket) {
        try {
            this.server.emit('updateMatchInProgress')
        } catch (err) {
            console.error('Error during refresh games in progress...')
        }
    }
}