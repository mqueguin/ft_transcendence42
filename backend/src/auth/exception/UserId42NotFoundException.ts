import { NotFoundException } from "@nestjs/common"

export default class UserId42NotFoundException extends NotFoundException {
    constructor(id42: number) {
        super(`User with id42 ${id42} not found`)
    }
}