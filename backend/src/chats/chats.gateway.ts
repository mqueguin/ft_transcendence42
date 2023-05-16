import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ChatsService } from './chats.service';

@WebSocketGateway(4444, {cors: {
    origin: 'http://localhost:8080',
    credentials: true
}})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor() {}

    @WebSocketServer()
    server: Server

    private userIdsBySocketId: Map<string, string> = new Map()
    private socketIdsByUserId: Map<string, string> = new Map()
    // Connection to socket function
    handleConnection(socket: Socket) {
        let { userId } = socket.handshake.query
        userId = userId.toString()
        this.socketIdsByUserId.set(userId, socket.id)
        this.userIdsBySocketId.set(socket.id, userId)
    }

    // When a user quit the socket
    handleDisconnect(socket: Socket) {

        const userId = this.userIdsBySocketId.get(socket.id)
        this.userIdsBySocketId.delete(socket.id)
        this.socketIdsByUserId.delete(userId)
    }

    @SubscribeMessage('joinRoom')
    async joinRoom(socket: Socket, data: any) {
        const userId = this.userIdsBySocketId.get(socket.id)
        try {
            this.forceUserToLeaveRooms(socket.id);
            if (!this.isUserInRoom(this.server, socket, data.channelId)) {
                socket.join(data.channelId)
                this.server.to(data.channelId).emit('reloadUserList')
            }
        } catch (err) {
            console.error('An error occured while joining the room:', err)
        }
    }

    @SubscribeMessage('leftRoom')
    async leftRoom(socket: Socket, data: any) {
        const userId = this.userIdsBySocketId.get(socket.id)
        try {
            if (this.isUserInRoom(this.server, socket, data.channelId)) {
                socket.leave(data.channelId)
                this.server.to(data.channelId).emit('reloadUserList')
            }
        } catch (err) {
            console.error('An error occured while leaving the room:', err)
        }
    }

    forceUserToLeaveRooms(socketId: string) {
        const client = this.server.sockets.sockets.get(socketId);
        
        if (!client) {
            return;
        }
        
        const roomIds = Array.from(client.rooms.keys());

        // Parcourir le tableau des room IDs et quitter chacune d'elles
        for (const roomId of roomIds) {
            if (roomId !== socketId) {
                client.leave(roomId);
            }
        }
    }

    isUserInRoom(server: Server, client: Socket, room: string): boolean {
        const adapter = server.sockets.adapter;
        const clientsInRoom = adapter.rooms.get(room);
      
        if (clientsInRoom) {
          return clientsInRoom.has(client.id);
        } else {
          return false;
        }
    }

    @SubscribeMessage('sendMessage')
    async sendMessage(socket: Socket, data: any) {
        try {
            this.server.to(data.channelId).emit('newMessage', { message: data.message, senderLogin: data.senderLogin, msgStatus: data.msgStatus })
        } catch (err) {
            console.error('Error during sending message with the socket:', err)
        }
    }

    @SubscribeMessage('reloadChatPage')
    async reloadChatPage(socket: Socket, data: any) {
        try {
            this.server.emit('reloadPage', data.data)
        } catch (err) {
            console.error(err)
        }
    }

    @SubscribeMessage('reloadChannelList')
    async reloadChannelList(socket: Socket, data: any) {
        try {
            this.server.emit('reloadChannelListPage', data.data)
        } catch (err) {
            console.error(err)
        }
    }

    @SubscribeMessage('reloadCurrentChannel')
    async reloadCurrentChannel(socket: Socket, data: any) {
        try {
            this.server.emit('reloadCurrentChannelPage')
        } catch (err) {
            console.error(err)
        }
    }

    @SubscribeMessage('changeAdmin')
    async newAdmin(socket: Socket, data: any) {
        try {
            this.server.to(data.channelId).emit('changeAdminMessage', { login: data.senderLogin, newAdmin: data.newAdmin })
        } catch (err) {
            console.error(err)
        }
    }

    @SubscribeMessage('muteUser')
    async muteUser(socket: Socket, data: any) {
        try {
            const socketId = this.socketIdsByUserId.get(data.id.toString())
            this.server.to(socketId).emit('youAreMuted', { channelId: data.channelId, name: data.name })
        } catch (err) {
            console.error(err)
        }
    }

    @SubscribeMessage('banUser')
    async banUser(socket: Socket, data: any) {
        try {
            const socketId = this.socketIdsByUserId.get(data.id.toString())
            this.server.to(socketId).emit('youAreBanned', { channelId: data.channelId, name: data.name })
        } catch (err) {
            console.error(err)
        }
    }

    @SubscribeMessage('kickUser')
    async kickUser(socket: Socket, data: any) {
        try {
            const socketId = this.socketIdsByUserId.get(data.userId.toString())
            this.server.to(socketId).emit('youAreKicked', { channelId: data.channelId, name : data.name })
            this.server.to(data.channelId).emit('aUserWasKicked', { userId: data.userId })
        } catch (err) {
            console.error(err)
        }
    }
}