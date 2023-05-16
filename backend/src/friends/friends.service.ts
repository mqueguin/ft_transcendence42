import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FriendsGateway } from './friends.gateway';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService,
    private readonly friendsGateway: FriendsGateway
  ) {}

  async requestFriendship(userAId: number, userBId: number): Promise<void> {
    await this.prisma.userFriendship.create({
      data: {
        userA: {
          connect: {
            id: userAId
          }
        },
        userB: {
          connect: {
            id: userBId
          }
        },
        friendStatus: 'PENDING',
      }
    })
    //this.friendsGateway.handleSendFriendRequest(userAId, userBId)
  }

  async getAllFriendsRequest(userId: number) {
    const users = await this.prisma.user.findMany({
      include: {
        friendshipsFromMe: {
          where: {
            userBId: userId,
            friendStatus: 'PENDING'
          }
        }
      }
    })
    const friendRequests = users.filter(user => user.friendshipsFromMe.length > 0)
    return friendRequests
  }

  async acceptFriendRequest(requesterId: number, recipientId: number) {
    await this.prisma.userFriendship.updateMany({
      where: {
        AND: [
          { userAId: requesterId },
          { userBId: recipientId }
        ]
      },
      data: {
        friendStatus: 'ACCEPTED'
      }
    })
  }

  async refuseFriendRequest(requesterId: number,recipientId: number) {
    await this.prisma.userFriendship.updateMany({
      where: {
        AND: [
          { userAId: requesterId },
          { userBId: recipientId }
        ]
      },
      data: {
        friendStatus: 'REJECTED'
      }
    })
  }

  async checkFriendship(userAId: number, userBId: number) {
    let friendship = await this.prisma.userFriendship.findMany({
      where: {
        AND: [
          { userAId: userAId },
          { userBId: userBId }
        ]
      },
      select: {
        friendStatus: true
      }
    });
    if (!friendship.length) {
      friendship = await this.prisma.userFriendship.findMany({
        where: {
          AND: [
            { userAId: userBId },
            { userBId: userAId }
          ]
        },
        select: {
          friendStatus: true
        }
      });
    }
    const friendshipExists = friendship.find(f => f.friendStatus === ('PENDING') || f.friendStatus === ('ACCEPTED') || f.friendStatus === ('REJECTED'));
    return friendshipExists ? friendshipExists.friendStatus : null;
  }

  async getFriends(userId: number) {
    let friends = await this.prisma.userFriendship.findMany({
      where: {
        AND: [{
          OR: [
            { userAId: userId },
            { userBId: userId }
          ],
          friendStatus: 'ACCEPTED'
        }]
      },
    })
    for (let friend of friends) {
      if (friend.userAId === userId) {
        delete friend.userAId;
      }
      if (friend.userBId === userId) {
        delete friend.userBId;
      }
      delete friend.id
      delete friend.friendStatus
    }
    return friends;
  }

  async removeFriend(userAId: number, userBId: number) {
    let friendship = await this.prisma.userFriendship.findFirst({
      where: {
        OR: [{
          userAId: userAId,
          userBId: userBId
        }]
      }
    })
    if (!friendship) {
      friendship = await this.prisma.userFriendship.findFirst({
        where: {
          OR: [{
            userAId: userBId,
            userBId: userAId
          }]
        }
      })
    }
    if (friendship) {
      await this.prisma.userFriendship.delete({
        where: { id: friendship.id }
      })
      return true
    } else {
      return false
    }
  }
}
