
import { GameMode, GameStatus } from '../types/games.types';


export class GameDto {
    gameId: number;
    player1Score: number;
    player2Score: number;
    player1Id: number;
    player2Id: number;
    gameMode: GameMode;
    gameStatus: GameStatus;
}