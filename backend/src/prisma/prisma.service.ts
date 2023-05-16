
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient {
	constructor () {
		super({
			datasources: {
				db: {
					url: 'postgresql://admin:123456@db:5432/transcendouille?schema=public'
				}
			}
		})
	}
}