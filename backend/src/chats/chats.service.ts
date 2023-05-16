import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateChannelDto } from './dto/create-chat.dto';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt'
import { compare, hash } from 'bcrypt';
import { PasswordChannelDto } from './dto/passwordChannel';
import { updateChannelDto } from './dto/update-chat.dto';

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService
  ) {}

  async createChannel(channel: CreateChannelDto) {
    const user = await this.usersService.findOneByLogin(channel.owner)

    if (!user) {
      throw new HttpException('This user does not exist', HttpStatus.BAD_REQUEST)
    }

    const channelExist = await this.prisma.channel.findFirst({
      where: {
        name: channel.name
      }
    })

    if (channelExist) {
      throw new HttpException('A Channel with the same name already exist!', HttpStatus.CONFLICT)
    }
    if (channel.password) {
      channel.password = await hash(channel.password, 10)
    }
    let statusChannel
    if (channel.isProtected) {
      statusChannel = 'PROTECTED'
    } else if (channel.isPrivate) {
      statusChannel = 'PRIVATE'
    } else {
      statusChannel = 'PUBLIC'
    }
    const newChannel = await this.prisma.channel.create({
      data: {
        name: channel.name,
        isPrivate: channel.isPrivate,
        isProtected: channel.isProtected,
        password: channel.isProtected ? channel.password : '',
        ownerId: user.id,
        channelStatus: statusChannel
      }
    })

    await this.prisma.channelUser.create({
      data: {
        user: {
          connect: {
            id: user.id
          }
        },
        channel: {
          connect: {
            id: newChannel.id
          }
        },
        userRole: 'OWNER'
      }
    })
    return newChannel
  }

  async getChannels(userId: number) {
    let channels = await this.prisma.channelUser.findMany({
      where: {
        userId
      },
      select: {
        channel: true
      }
    })
    const allChannels = channels.map((cu) => cu.channel)
    for (let channel of allChannels) {
      delete channel.password
      delete channel.isPrivate
      delete channel.isProtected
    }
    return allChannels
  }

  async getAllUsersInChannel(channelId: number) {
    const usersInChannel = await this.prisma.channelUser.findMany({
      where: {
        channelId: channelId
      },
      select: {
        user: {
          select: {
            id: true,
            login: true,
            isOnline: true
          }
        },
        userRole: true
      }
    })

    return usersInChannel
  }

  async getAllPublicChannels(userId: number) {
    const publicChannels = await this.prisma.channel.findMany({
      where: {
        AND: [{
          isPrivate: false,
          isProtected: false,
          users: {
            none: {
              userId: userId
            }
          },
          channelStatus: 'PUBLIC'
        }]
      },
      select: {
        id: true,
        name: true
      }
    })
    return publicChannels
  }

  async getAllProtectedChannels(userId: number) {
    const protectedChannels = await this.prisma.channel.findMany({
      where: {
        AND: {
          isPrivate: false,
          isProtected: true,
          users: {
            none: {
              userId: userId
            }
          },
          channelStatus: 'PROTECTED'
        }
      },
      select: {
        id: true,
        name: true
      }
    })
    return protectedChannels
  }

  async joinPublicChannel(channelId: number, userId: number) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      },
      select: {
        isPrivate: true,
        isProtected: true,
        id: true,
        users: {
          where: {
            id: {
              not: userId
            }
          },
          select: {
            id: true
          }
        }
      }
    })
    if (!channel) {
      throw new HttpException("This channel doesn't exist!", HttpStatus.BAD_REQUEST)
    }
    if (channel.isPrivate) {
      throw new HttpException('Sorry, This channel is private!', HttpStatus.BAD_REQUEST)
    }
    if (channel.isProtected) {
      throw new HttpException('Sorry, this channel is protected!', HttpStatus.BAD_REQUEST)
    }

    // Check if user already exist in the channel
    const userExist = channel.users.some(user => user.id === userId)
    if (userExist) {
      throw new HttpException('You are already in this channel!', HttpStatus.BAD_REQUEST)
    }

    return this.prisma.channelUser.create({
      data: {
        user: {
          connect: {
            id: userId
          }
        },
        channel: {
          connect: {
            id: channel.id
          }
        },
        userRole: 'NORMAL'
      }
    })
  }

  async joinPrivateChannel(channelId: number, userId: number) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      },
      select: {
        isPrivate: true,
        isProtected: true,
        id: true,
        users: {
          where: {
            id: {
              not: userId
            }
          },
          select: {
            id: true
          }
        }
      }
    })
    if (!channel) {
      throw new HttpException("This channel doesn't exist!", HttpStatus.BAD_REQUEST)
    }
    if (!channel.isPrivate) {
      throw new HttpException('Sorry, This channel is not private!', HttpStatus.BAD_REQUEST)
    }
    if (channel.isProtected) {
      throw new HttpException('Sorry, this channel is protected!', HttpStatus.BAD_REQUEST)
    }

    // Check if user already exist in the channel
    const userExist = await this.prisma.channelUser.findFirst({
      where: {
        userId: userId,
        channelId: channelId
      }
    })
    if (userExist) {
      throw new HttpException('You are already in this channel!', HttpStatus.BAD_REQUEST)
    }

    await this.prisma.channelUser.create({
      data: {
        user: {
          connect: {
            id: userId
          }
        },
        channel: {
          connect: {
            id: channel.id
          }
        },
        userRole: 'NORMAL'
      }
    })

    const user = await this.usersService.findOneById(userId)

    await this.prisma.message.create({
      data: {
        sender: {
          connect: {
            id: userId
          }
        },
        chat: {
          connect: {
            id: channel.id
          }
        },
        content: `${user.login} has just arrived on the channel!`,
        msgStatus: 'JOIN'
      }
    })
  }

  async joinProtectedChannel(channelId: number, userId: number, password: string) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      }
    })
    if (!channel.password) {
      throw new HttpException('Sorry, this channel is not a protected channel!', HttpStatus.BAD_REQUEST)
    }
    const isMatch = await compare(password, channel.password)

    if (!isMatch) {
      throw new HttpException('Invalid password for this protected channel', HttpStatus.FORBIDDEN)
    }

    return this.prisma.channelUser.create({
      data: {
        user: {
          connect: {
            id: userId
          }
        },
        channel: {
          connect: {
            id: channel.id
          }
        },
        userRole: 'NORMAL'
      }
    })
  }

  async getAllMessages(channelId: number) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      }
    })
    if (!channel) {
      throw new HttpException('This channel does not exist!', HttpStatus.BAD_REQUEST)
    }
    const messages = await this.prisma.message.findMany({
      where: {
        channelId: channel.id
      },
      select: {
        senderId: true,
        content: true,
        createdAt: true,
        sender: {
          select: {
            login: true
          }
        },
        msgStatus: true
      }
    })
    return messages
  }

  async sendMessage(channelId: number, userId: number, message: string, msgStatus: string) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      }
    })
    if (!channel) {
      throw new HttpException('This channel does not exist!', HttpStatus.BAD_REQUEST)
    }

    if (msgStatus === 'NORMAL') {
      return this.prisma.message.create({
        data: {
          sender: {
            connect: {
              id: userId
            }
          },
          chat: {
            connect: {
              id: channel.id
            }
          },
          content: message,
          msgStatus: 'NORMAL'
        }
      })
    } else if (msgStatus === 'JOIN') {
      return this.prisma.message.create({
        data: {
          sender: {
            connect: {
              id: userId
            }
          },
          chat: {
            connect: {
              id: channel.id
            }
          },
          content: message,
          msgStatus: 'JOIN'
        }
      })
    } else if (msgStatus === 'QUIT') {
      return this.prisma.message.create({
        data: {
          sender: {
            connect: {
              id: userId
            }
          },
          chat: {
            connect: {
              id: channel.id
            }
          },
          content: message,
          msgStatus: 'QUIT'
        }
      })
    }
  }

  // Function for leave channel
  async leaveChannel(channelId: number, userId: number, login: string) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      }
    })
    if (!channel) {
      throw new HttpException('This channel does not exist!', HttpStatus.BAD_REQUEST)
    }

    const user = await this.prisma.channelUser.findFirst({
      where: {
        userId: userId,
        channelId: channelId
      },
      select: {
        userId: true,
        userRole: true
      }
    })
    if (!user) {
      throw new HttpException('This user does not belong to this channel!', HttpStatus.BAD_REQUEST)
    }
    if (user.userRole === 'NORMAL' || user.userRole === 'ADMIN') {
      return this.prisma.channelUser.delete({
        where: {
          userId_channelId: {
            userId: userId,
            channelId: channelId
          }
        }
      })
    } else if (user.userRole === 'OWNER') {
      const userList = await this.prisma.channelUser.findMany({
        where: {
          channelId: channelId
        }
      })
      await this.prisma.channelUser.delete({
        where: {
          userId_channelId: {
            userId: userId,
            channelId: channelId
          }
        }
      })
      if (userList.length === 1) {
        await this.prisma.message.deleteMany({
          where: {
            channelId: channelId
          }
        })
        return await this.prisma.channel.delete({
          where: {
            id: channelId
          }
        })
      } else {
        const newOwner = await this.prisma.channelUser.findFirst({
          where: {
            channelId: channelId
          },
          select: {
            id: true,
            userId: true
          }
        })
        await this.prisma.channelUser.update({
          where: {
            id: newOwner.id
          },
          data: {
            userRole: 'OWNER'
          }
        })
        return this.prisma.channel.update({
          where: {
            id: channelId
          },
          data: {
            ownerId: newOwner.userId
          }
        })
      }
    }
  }

  async getCurrentChannel(channelId: number) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      }
    })
    if (channel) {
      return channel
    }
    return false
  }

  async verifyPassword(channelId: number, password: PasswordChannelDto) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      },
      select: {
        password: true
      }
    })
    if (!channel) {
      throw new HttpException('This channel does not exist!', HttpStatus.BAD_REQUEST)
    }
    const isMatch = await compare(password.password, channel.password)

    if (!isMatch) {
      throw new HttpException('Invalid password for this protected channel', HttpStatus.FORBIDDEN)
    }
  }

  async updateChannelType(channelId: number, userId: number, newType: updateChannelDto) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      }
    })
    if (!channel) {
      throw new HttpException('This channel does not exist!', HttpStatus.BAD_REQUEST)
    }
    if (userId !== channel.ownerId) {
      throw new HttpException('You are not the owner of this channel!', HttpStatus.BAD_REQUEST)
    }
    if (newType.channelStatus === 'PUBLIC') {
      return this.prisma.channel.update({
        where: {
          id: channelId
        },
        data: {
          channelStatus: 'PUBLIC',
          isPrivate: false,
          isProtected: false,
          password: ''
        },
        select: {
          id: true,
          name: true,
          ownerId: true,
          channelStatus: true
        }
      })
    } else if (newType.channelStatus === 'PRIVATE') {
      return this.prisma.channel.update({
        where: {
          id: channelId
        },
        data: {
          channelStatus: 'PRIVATE',
          isPrivate: true,
          isProtected: false,
          password: ''
        },
        select: {
          id: true,
          name: true,
          ownerId: true,
          channelStatus: true
        }
      })
    } else if (newType.channelStatus === 'PROTECTED') {
      if (!newType.password) {
        throw new HttpException('Error, he must have a password for switch to protected channel!', HttpStatus.BAD_REQUEST)
      }
      const newPass = await hash(newType.password, 10)
      return this.prisma.channel.update({
        where: {
          id: channelId
        },
        data: {
          password: newPass,
          channelStatus: 'PROTECTED',
          isPrivate: false,
          isProtected: true
        },
        select: {
          id: true,
          name: true,
          ownerId: true,
          channelStatus: true
        }
      })
    } else {
      throw new HttpException('Error, The type of the channel is invalid!', HttpStatus.BAD_REQUEST)
    } 
  }

  async getUserRole(channelId: number, userId: number) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      }
    })
    if (!channel) {
      throw new HttpException('This channel does not exist!', HttpStatus.BAD_REQUEST)
    }
    return this.prisma.channelUser.findUnique({
      where: {
        userId_channelId: {
          userId: userId,
          channelId: channelId
        }
      },
      select: {
        userRole: true
      }
    })
  }

  async getConversationChannel(requesterId: number, RecipientId: number) {
    const channel = await this.prisma.channel.findFirst({
      where: {
        AND: [
          { channelStatus: 'PRIVATE_MSG' },
          {
            users: {
              every: {
                OR: [
                  { userId: requesterId },
                  { userId: RecipientId }
                ]
              }
            }
          }
        ]
      }
    })
    if (!channel) {
      return false
    }
    return channel
  }

  async createPrivateMessageChannel(requesterId: number, recipientId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: recipientId
      }
    })
    const user2 = await this.prisma.user.findUnique({
      where: {
        id: requesterId
      }
    })
    if (!user) {
      throw new HttpException('This user does not exist!', HttpStatus.BAD_REQUEST)
    }
    const newChannel = await this.prisma.channel.create({
      data: {
        name: user2.login + '_' + user.login,
        isPrivate: false,
        isProtected: false,
        password: '',
        ownerId: requesterId,
        channelStatus: 'PRIVATE_MSG'
      }
    })
    await this.prisma.channelUser.create({
      data: {
        user: {
          connect: {
            id: requesterId
          }
        },
        channel: {
          connect: {
            id: newChannel.id
          }
        },
        userRole: 'OWNER'
      }
    })
    await this.prisma.channelUser.create({
      data: {
        user: {
          connect: {
            id: recipientId
          }
        },
        channel: {
          connect: {
            id: newChannel.id
          }
        },
        userRole: 'NORMAL'
      }
    })
    return newChannel
  }

  async addAdmin(channelId: number, userId: number) {
    const channelUser = await this.prisma.channelUser.findFirst({
      where: {
        channelId: channelId,
        userId: userId
      }
    })
    if (!channelUser) {
      throw new HttpException('User is not a member of the channel!', HttpStatus.BAD_REQUEST)
    } else if (channelUser.userRole === 'ADMIN') {
      throw new HttpException('This user is already Admin in this channel!', HttpStatus.BAD_REQUEST)
    }
    await this.prisma.channelUser.update({
      where: {
        id: channelUser.id
      },
      data: {
        userRole: 'ADMIN'
      }
    })
  }

  async removeAdmin(channelId: number, userId: number) {
    const channelUser = await this.prisma.channelUser.findFirst({
      where: {
        channelId: channelId,
        userId: userId
      }
    })
    if (!channelUser) {
      throw new HttpException('User is not member of the channel!', HttpStatus.BAD_REQUEST)
    } else if (channelUser.userRole !== 'ADMIN') {
      throw new HttpException('This user is not Admin in this channel!', HttpStatus.BAD_REQUEST)
    }
    await this.prisma.channelUser.update({
      where: {
        id: channelUser.id
      },
      data: {
        userRole: 'NORMAL'
      }
    })
  }

  async muteAUser(channelId: number, userId: number, muteDurationSeconds: number) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      }
    })
    if (!channel) {
      throw new HttpException('This channel does not exist!', HttpStatus.BAD_REQUEST)
    }
    const channelUser = await this.prisma.channelUser.findFirst({
      where: {
        userId: userId,
        channelId: channelId
      }
    })
    if (!channelUser) {
      throw new HttpException('User not found in this channel!', HttpStatus.BAD_REQUEST)
    }
    if (channelUser.muteUntil && channelUser.muteUntil >= new Date()) {
      throw new HttpException('User is already muted!', HttpStatus.BAD_REQUEST)
    }

    const muteUntil = new Date()
    muteUntil.setSeconds(muteUntil.getSeconds() + muteDurationSeconds)

    await this.prisma.channelUser.update({
      where: {
        id: channelUser.id
      },
      data: {
        muteUntil
      }
    })
  }

  async banAUser(channelId: number, userId: number, banDurationSeconds: number) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      }
    })
    if (!channel) {
      throw new HttpException('This channel does not exist!', HttpStatus.BAD_REQUEST)
    }
    const channelUser = await this.prisma.channelUser.findFirst({
      where: {
        userId: userId,
        channelId: channelId
      }
    })
    if (!channelUser) {
      throw new HttpException('User not found in this channel!', HttpStatus.BAD_REQUEST)
    }

    if (channelUser.banUntil && channelUser.banUntil >= new Date()) {
      throw new HttpException('User is already banned!', HttpStatus.BAD_REQUEST)
    }

    const banUntil = new Date()
    banUntil.setSeconds(banUntil.getSeconds() + banDurationSeconds)

    await this.prisma.channelUser.update({
      where: {
        id: channelUser.id
      },
      data: {
        banUntil: banUntil
      }
    })
  }

  async getUserIsMute(channelId: number, userId: number) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      }
    })
    if (!channel) {
      throw new HttpException('This channel does not exist!', HttpStatus.BAD_REQUEST)
    }
    const channelUser = await this.prisma.channelUser.findFirst({
      where: {
        userId: userId,
        channelId: channelId
      },
      select: {
        muteUntil: true
      }
    })
    if (!channelUser) {
      throw new HttpException('This user in not in this channel', HttpStatus.BAD_REQUEST)
    }
    if (!channelUser.muteUntil) {
      return false
    }
    return channelUser.muteUntil
  }

  async getUserIsBan(channelId: number, userId: number) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      }
    })
    if (!channel) {
      throw new HttpException('This channel does not exist!', HttpStatus.BAD_REQUEST)
    }
    const channelUser = await this.prisma.channelUser.findFirst({
      where: {
        userId: userId,
        channelId: channelId
      },
      select: {
        banUntil: true
      }
    })
    if (!channelUser) {
      throw new HttpException('This user is not in this channel', HttpStatus.BAD_REQUEST)
    }
    if (!channelUser.banUntil) {
      return false
    }
    return channelUser.banUntil
  }

  async kickAUser(channelId: number, userId: number) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      }
    })
    if (!channel) {
      throw new HttpException('This channel does not exist!', HttpStatus.BAD_REQUEST)
    }
    const channelUser = await this.prisma.channelUser.findFirst({
      where: {
        userId: userId,
        channelId: channelId
      }
    })
    if (!channelUser) {
      throw new HttpException('User not found in this channel!', HttpStatus.BAD_REQUEST)
    }
    await this.prisma.channelUser.delete({
      where: {
        userId_channelId: {
          userId: userId,
          channelId: channelId
        }
      }
    })
    const user = await this.usersService.findOneById(userId)
    await this.prisma.message.create({
      data: {
        sender: {
          connect: {
            id: userId
          }
        },
        chat: {
          connect: {
            id: channel.id
          }
        },
        content: `${user.login} was kicked form this channel`,
        msgStatus: 'QUIT'
      }
    })
  }

  async userIsInChannel(channelId: number, userId) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      }
    })
    if (!channel) {
      throw new HttpException('This channel does not exist!', HttpStatus.BAD_REQUEST)
    }
    const channelUser = await this.prisma.channelUser.findFirst({
      where: {
        userId: userId,
        channelId: channelId
      }
    })
    if (!channelUser) {
      return false
    } else {
      return channel
    }
  }

  async updatePassProtectedChannel(channelId: number, oldPass: string, newPass: string) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId
      },
      select: {
        id: true,
        password: true
      }
    })
    if (!channel) {
      throw new HttpException('This channel does not exist!', HttpStatus.BAD_REQUEST)
    }
    const isMatch = await compare(oldPass, channel.password)

    if (!isMatch) {
      throw new HttpException('Invalid password for this protected channel', HttpStatus.FORBIDDEN)
    }
    const hashedPass = await hash(newPass, 10)
    const update = await this.prisma.channel.update({
      where: {
        id: channelId
      },
      data: {
        password: hashedPass
      }
    })
    return update
  }
}
