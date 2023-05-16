import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { UsersService } from "src/users/users.service";
import { Strategy } from "passport-oauth2";
import { PassportStrategy } from "@nestjs/passport";
import { default as Axios } from "axios"; // Obliger de mettre default car sinon la methode get de Axios n'est pas reconnu

@Injectable()
export class School42Strategy extends PassportStrategy(Strategy, 'school42') {
    constructor(private usersService: UsersService) {
        super({
            authorizationURL: 'https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-1ad6feb9ef51cb254dcccadbf40ee7f9b05ed88714bc6486078e902ede7cd5ce&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fplay&response_type=code',
            tokenURL: 'https://api.intra.42.fr/oauth/token',
            clientID: process.env.OAUTH_42_CLIENT_ID, 
            clientSecret: process.env.OAUTH_42_SECRET,
            callbackURL: 'http://localhost:8080/authentificate/school42/callback', 
            scope: 'public',
            proxy: true
        })
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: Function): Promise<any> {
        const { data } = await Axios.get('https://api.intra.42.fr/v2/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
        try {
            const user = await this.usersService.findUserById42(data.id)
            done(null, user)
        } catch (err) {
            for (var i = 0; i < 50; i++ && i > -1) {
                try {
                    if (i) {
                        data.login = data.login + i
                    }
                    const user = await this.usersService.create({
                        id42: data.id,
                        login: data.login,
                        email: data.email,
                        avatar: data.image.link,
                        password: '42Paris$'
                    })
                    user.password = undefined
                    done(null, user)
                    i = -1
                } catch (err) {
                    continue
                }
            }
        }
    }
}