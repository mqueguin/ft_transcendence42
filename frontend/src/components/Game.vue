<script lang="ts">
import { ref, onMounted, reactive, defineComponent } from "vue";
import { useCookies } from "vue3-cookies";

const { cookies } = useCookies();

export default defineComponent({
  name: "Pong",
  props: [
    "socket",
    "player",
    "roomId",
    "userId",
    "role",
    "opponentId",
    "isSpectator",
    "isFunMatch",
  ],
  emits: ["userDisconnect"],
  setup(props, { emit }) {
    const canvas = ref(null);
    const ctx = ref(null);
    const lastTime = ref(null);
    const frameDuration = 1000 / 60;
    const keys = reactive({});
    const gameStart = {
      player1: false,
      player2: false,
    };
    const state = reactive({
      ball: {
        x: 50,
        y: 50,
        vx: 3 * (Math.random() < 0.5 ? 1 : -1),
        vy: 3 * (Math.random() < 0.5 ? 1 : -1),
        size: 8,
		speed: 6
      },
      leftPaddle: {
        x: 10,
        y: 275,
        width: 10,
        height: 80,
        speed: 7,
        isMovingUp: false,
        isMovingDown: false,
        score: 0,
      },
      rightPaddle: {
        x: 980,
        y: 275,
        width: 10,
        height: 80,
        speed: 7,
        isMovingUp: false,
        isMovingDown: false,
        score: 0,
      },
      leftWall: {
        x: 450,
        y: 500,
        width: 10,
        height: 100,
        speed: 3,
        dir: "up",
      },
      rightWall: {
        x: 550,
        y: 0,
        width: 10,
        height: 100,
        speed: 3,
        dir: "down",
      },
      boardWidth: 1000,
      boardHeight: 600,
      gameOver: false,
      winner: "",
      userDeconnected: false,
    });

    function displayWinner(ctx, canvas, winner) {
      ctx.fillStyle = "#FFF";
      ctx.font = "bold 36px pixelFont";
      ctx.textAlign = "center";
      ctx.fillText(`${winner} wins!`, canvas.width / 2, canvas.height / 2);
    }

    function drawDottedLine(ctx, x, y, length, spacing) {
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.setLineDash([spacing]);
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + length);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawGameStarted(ctx, canvas) {
      ctx.fillStyle = "#FFF";
      ctx.font = "bold 22px pixelFont";
      if (props.player === "1") {
        ctx.textAlign = "left";
        ctx.fillText(
          "Press enter",
          canvas.width / 2 / 2 / 2,
          canvas.height / 2
        );
        ctx.fillText(
          "for start the game!",
          canvas.width / 2 / 2 / 2 / 2,
          canvas.height / 2 + 50
        );
      } else if (props.player === "2") {
        ctx.textAlign = "right";
        ctx.fillText(
          "Press enter",
          canvas.width / 2 + canvas.width / 2.7,
          canvas.height / 2
        );
        ctx.fillText(
          "for start the game!",
          canvas.width / 2 + canvas.width / 2.1,
          canvas.height / 2 + 50
        );
      }
    }

    function drawWaitingPlayer(ctx, canvas) {
      ctx.fillStyle = "#FFF";
      ctx.font = "bold 22px pixelFont";
      if (props.player === "1") {
        ctx.textAlign = "right";
        ctx.fillText(
          "Waiting",
          canvas.width / 2 + canvas.width / 3,
          canvas.height / 2
        );
        ctx.fillText(
          "the opponent...",
          canvas.width / 2 + canvas.width / 2.3,
          canvas.height / 2 + 50
        );
      } else if (props.player === "2") {
        ctx.textAlign = "left";
        ctx.fillText(
          "Waiting",
          canvas.width / 2 - canvas.width / 3,
          canvas.height / 2
        );
        ctx.fillText(
          "the opponent...",
          canvas.width / 2 - canvas.width / 2.4,
          canvas.height / 2 + 50
        );
      }
    }

    function drawRules(ctx, canvas) {
      ctx.fillStyle = "#FFF";
      ctx.font = "bold 16px pixelFont";
      if (props.player === "1") {
        ctx.textAlign = "left";
        ctx.fillText("Up: w Down: s", 0, canvas.height);
      } else if (props.player === "2") {
        ctx.textAlign = "right";
        ctx.fillText("Up: w Down: s", canvas.width, canvas.height);
      }
    }

    function drawDeconnectedMsg(ctx, canvas) {
      ctx.fill = "#FFF";
      ctx.font = "bold 24px pixelFont";
      ctx.textAlign = "center";
      ctx.fillText("Opponent Disconnect", canvas.width / 2, canvas.height / 2);
      ctx.font = "bold 16px";
      ctx.fillText(
        "You will be redirected in 3 seconds",
        canvas.width / 2,
        canvas.height / 2 + 40
      );
    }

    function drawDeconnectedMsgSpec(ctx, canvas) {
      ctx.fill = "#FFF";
      ctx.font = "bold 24px pixelFont";
      ctx.textAlign = "center";
      ctx.fillText(
        "Player was Disconnected",
        canvas.width / 2,
        canvas.height / 2
      );
      ctx.font = "bold 16px";
      ctx.fillText(
        "You will be redirected in 3 seconds",
        canvas.width / 2,
        canvas.height / 2 + 40
      );
    }

    let leftScored = false;
    let rightScored = false;
    let animationFrameIdPong;
    let animationFrameIdPhysics;
    const updatePhysics = () => {
      if (
        state.ball.y + state.ball.size >= state.boardHeight ||
        state.ball.y - state.ball.size <= 0
      ) {
        state.ball.vy *= -1;
      }

      let paddleCollision = false;
      if (
        state.ball.x - state.ball.size <=
          state.leftPaddle.x + state.leftPaddle.width &&
        state.ball.y >= state.leftPaddle.y &&
        state.ball.y <= state.leftPaddle.y + state.leftPaddle.height
      ) {
        paddleCollision = true;
        let collidePoint =
          state.ball.y - (state.leftPaddle.y + state.leftPaddle.height / 2);
        collidePoint = collidePoint / (state.leftPaddle.height / 2);

        const angleRad = (Math.PI / 4) * collidePoint;

        const direction =
          state.ball.x + state.ball.size < state.boardWidth / 2 ? 1 : -1;

        state.ball.vx = direction * state.ball.speed * Math.cos(angleRad);
        state.ball.vy = state.ball.speed * Math.sin(angleRad);
        state.ball.speed += 0.1;
      } else if (
        state.ball.x + state.ball.size >= state.rightPaddle.x &&
        state.ball.y >= state.rightPaddle.y &&
        state.ball.y <= state.rightPaddle.y + state.rightPaddle.height
      ) {
        paddleCollision = true;
        let collidePoint = state.ball.y - (state.rightPaddle.y + state.rightPaddle.height / 2);
        collidePoint = collidePoint / (state.rightPaddle.height / 2);

        const angleRad = (Math.PI / 4) * collidePoint

        const direction = state.ball.x + state.ball.size < state.boardWidth / 2 ? 1 : -1

        state.ball.vx = direction * state.ball.speed * Math.cos(angleRad)
        state.ball.vy = state.ball.speed * Math.sin(angleRad)
        state.ball.speed += 0.1
      }

      if (props.isFunMatch && !paddleCollision) {
        if (
          state.ball.x + state.ball.size >= state.leftWall.x &&
          state.ball.x - state.ball.size <=
            state.leftWall.x + state.leftWall.width &&
          state.ball.y >= state.leftWall.y &&
          state.ball.y <= state.leftWall.y + state.leftWall.height
        ) {
          state.ball.vx = -state.ball.vx;
        } else if (
          state.ball.x + state.ball.size >= state.rightWall.x &&
          state.ball.x - state.ball.size <=
            state.rightWall.x + state.rightWall.width &&
          state.ball.y >= state.rightWall.y &&
          state.ball.y <= state.rightWall.y + state.rightWall.height
        ) {
          state.ball.vx = -state.ball.vx;
        }
      }

      if (state.ball.x - state.ball.size <= 0) {
        if (!leftScored) {
          state.rightPaddle.score++;
          props.socket.emit("updateScore", {
            roomId: props.roomId,
            left: state.leftPaddle.score,
            right: state.rightPaddle.score,
            receiverId: props.opponentId,
          });
          leftScored = true;
          resetBall(2);
        }
      } else if (state.ball.x + state.ball.size >= state.boardWidth) {
        if (!rightScored) {
          state.leftPaddle.score++;
          props.socket.emit("updateScore", {
            roomId: props.roomId,
            left: state.leftPaddle.score,
            right: state.rightPaddle.score,
            receiverId: props.opponentId,
          });
          rightScored = true;
          resetBall(1);
        }
      } else {
        leftScored = false;
        rightScored = false;
      }
      state.ball.x += state.ball.vx;
      state.ball.y += state.ball.vy;
      if (props.role === "sender") {
        props.socket.emit("ballPosition", {
          ball: state.ball,
          roomId: props.roomId,
          receiverPlayerId: props.opponentId,
        });
      }
      if (state.userDeconnected === false) {
        animationFrameIdPhysics = requestAnimationFrame(updatePhysics);
      }
    };

    let matchIsFinish = false;
    const drawPong = (currentTime) => {
      if (!lastTime.value) {
        lastTime.value = currentTime;
      }
      const deltaTime = currentTime - lastTime.value;

      if (deltaTime >= frameDuration) {
        ctx.value.clearRect(0, 0, state.boardWidth, state.boardHeight);
        ctx.value.fillStyle = "#000";
        ctx.value.fillRect(0, 0, state.boardWidth, state.boardHeight);
        ctx.value.fillStyle = "#fff";

        ctx.value.fillRect(
          state.leftPaddle.x,
          state.leftPaddle.y,
          state.leftPaddle.width,
          state.leftPaddle.height
        );

        ctx.value.fillRect(
          state.rightPaddle.x,
          state.rightPaddle.y,
          state.rightPaddle.width,
          state.rightPaddle.height
        );

        drawDottedLine(
          ctx.value,
          state.boardWidth / 2,
          0,
          state.boardHeight,
          10
        );

        ctx.value.font = "bold 37px pixelFont";
        ctx.value.fillText(
          `${state.leftPaddle.score}`,
          state.boardWidth / 2 - 100,
          100
        );

        ctx.value.fillText(
          `${state.rightPaddle.score}`,
          state.boardWidth / 2 + 125,
          100
        );

        ctx.value.beginPath();
        ctx.value.arc(
          state.ball.x,
          state.ball.y,
          state.ball.size,
          0,
          Math.PI * 2,
          false
        );
        if (
          state.userDeconnected === true &&
          (props.player === "1" || props.player === "2")
        ) {
          drawDeconnectedMsg(ctx.value, canvas.value);
          requestAnimationFrame(drawPong);
          return;
        } else if (state.userDeconnected === true && props.player === "0") {
          drawDeconnectedMsgSpec(ctx.value, canvas.value);
          requestAnimationFrame(drawPong);
          return;
        }

        if (gameStart.player1 === false || gameStart.player2 === false) {
          if (
            (props.player === "1" && gameStart.player1 === false) ||
            (props.player === "2" && gameStart.player2 === false)
          ) {
            drawGameStarted(ctx.value, canvas.value);
          }
          if (
            (props.player === "2" && gameStart.player1 === false) ||
            (props.player === "1" && gameStart.player2 === false)
          ) {
            drawWaitingPlayer(ctx.value, canvas.value);
          }
          drawRules(ctx.value, canvas.value);
          if (props.isFunMatch) {
            ctx.value.fillRect(
              state.leftWall.x,
              state.leftWall.y,
              state.leftWall.width,
              state.leftWall.height
            );
            ctx.value.fillRect(
              state.rightWall.x,
              state.rightWall.y,
              state.rightWall.width,
              state.rightWall.height
            );
          }
          requestAnimationFrame(drawPong);
          return;
        }

        if (props.isFunMatch) {
          ctx.value.fillRect(
            state.leftWall.x,
            state.leftWall.y,
            state.leftWall.width,
            state.leftWall.height
          );
          ctx.value.fillRect(
            state.rightWall.x,
            state.rightWall.y,
            state.rightWall.width,
            state.rightWall.height
          );
        }
        ctx.value.closePath();
        ctx.value.fill();

        if (props.isFunMatch) {
          if (state.leftWall.dir === "up") {
            state.leftWall.y -=
              state.leftWall.speed * (deltaTime / frameDuration);
            if (state.leftWall.y < 0) {
              state.leftWall.y = 0;
              state.leftWall.dir = "down";
            }
          } else if (state.leftWall.dir === "down") {
            state.leftWall.y +=
              state.leftWall.speed * (deltaTime / frameDuration);
            if (state.leftWall.y > state.boardHeight - state.leftWall.height) {
              state.leftWall.y = state.boardHeight - state.leftWall.height;
              state.leftWall.dir = "up";
            }
          }
          if (state.rightWall.dir === "up") {
            state.rightWall.y -=
              state.rightWall.speed * (deltaTime / frameDuration);
            if (state.rightWall.y < 0) {
              state.rightWall.y = 0;
              state.rightWall.dir = "down";
            }
          } else if (state.rightWall.dir === "down") {
            state.rightWall.y +=
              state.rightWall.speed * (deltaTime / frameDuration);
            if (
              state.rightWall.y >
              state.boardHeight - state.rightWall.height
            ) {
              state.rightWall.y = state.boardHeight - state.rightWall.height;
              state.rightWall.dir = "up";
            }
          }
        }

        if (!props.isSpectator) {
          if (props.player === "1") {
            if (keys["KeyW"] && state.leftPaddle.y >= 0) {
              state.leftPaddle.y -=
                state.leftPaddle.speed * (deltaTime / frameDuration);
              if (state.leftPaddle.y < 0) {
                state.leftPaddle.y = 0;
              }
            } else if (
              keys["KeyS"] &&
              state.leftPaddle.y < state.boardHeight - state.leftPaddle.height
            ) {
              state.leftPaddle.y +=
                state.leftPaddle.speed * (deltaTime / frameDuration);
              if (
                state.leftPaddle.y >
                state.boardHeight - state.leftPaddle.height
              ) {
                state.leftPaddle.y =
                  state.boardHeight - state.leftPaddle.height;
              }
            }
          } else if (props.player === "2") {
            if (keys["KeyW"] && state.rightPaddle.y >= 0) {
              state.rightPaddle.y -=
                state.rightPaddle.speed * (deltaTime / frameDuration);
              if (state.rightPaddle.y < 0) {
                state.rightPaddle.y = 0;
              }
            } else if (
              keys["KeyS"] &&
              state.rightPaddle.y < state.boardHeight - state.rightPaddle.height
            ) {
              state.rightPaddle.y +=
                state.rightPaddle.speed * (deltaTime / frameDuration);
              if (
                state.rightPaddle.y >
                state.boardHeight - state.rightPaddle.height
              ) {
                state.rightPaddle.y =
                  state.boardHeight - state.rightPaddle.height;
              }
            }
          }
        }

        if (state.leftPaddle.score === 11 || state.rightPaddle.score === 11) {
          state.gameOver = true;
          state.ball.x = state.boardWidth / 2;
          state.ball.y = -50;

          if (state.leftPaddle.score == 11) {
            state.winner = "Player 1";
          } else if (state.rightPaddle.score == 11) {
            state.winner = "Player 2";
          }
          displayWinner(ctx.value, canvas.value, state.winner);
          if (!matchIsFinish && props.player === "1" && !props.isSpectator) {
            props.socket.emit("gameFinish", {
              opponentId: props.opponentId,
              roomId: props.roomId,
              player1Score: state.leftPaddle.score,
              player2Score: state.rightPaddle.score,
            });
            matchIsFinish = true;
          }
        }

        lastTime.value = currentTime;
      }
      if (!props.isSpectator) {
        if (props.player === "1") {
          props.socket.emit("paddleLeftPosition", {
            roomId: props.roomId,
            paddleLeft: state.leftPaddle,
          });
        } else if (props.player === "2") {
          props.socket.emit("paddleRightPosition", {
            roomId: props.roomId,
            paddleRight: state.rightPaddle,
          });
        }
      }

      animationFrameIdPong = requestAnimationFrame(drawPong);
    };

    const resetBall = (player?: number) => {
      state.ball.x = state.boardWidth / 2;
      state.ball.y = state.boardHeight / 2;
      if (player === 1) {
        state.ball.vx = 3 * 1;
        state.ball.vy = 3 * (Math.random() < 0.5 ? 1 : -1);
      } else if (player === 2) {
        state.ball.vx = 3 * -1;
        state.ball.vy = 3 * (Math.random() < 0.5 ? 1 : -1);
      } else {
        state.ball.vx = 3 * (Math.random() < 0.5 ? 1 : -1);
        state.ball.vy = 3 * (Math.random() < 0.5 ? 1 : -1);
      }
      state.ball.speed = 6
    };

    onMounted(() => {
      canvas.value = document.getElementById("myCanvas");
      ctx.value = canvas.value.getContext("2d");
      ctx.font = "40px pixelFont";
      resetBall();

      props.socket.on("gameStart", (data: any) => {
        if (props.roomId === data.roomId) {
          gameStart.player1 = true;
          gameStart.player2 = true;
          if (props.role === "sender") {
            updatePhysics();
          }
        }
      });

      if (props.role === "receiver" || props.isSpectator) {
        props.socket.on("ballPositionUpdated", (data: any) => {
          state.ball = data;
        });
        props.socket.on("scoreUpdated", (data: any) => {
          state.leftPaddle.score = data.left;
          state.rightPaddle.score = data.right;
        });
      }
      if (props.player === "1" || props.isSpectator) {
        props.socket.on("paddleRightPositionUpdated", (data: any) => {
          state.rightPaddle.x = data.x;
          state.rightPaddle.y = data.y;
        });
      }
      if (props.player === "2" || props.isSpectator) {
        props.socket.on("paddleLeftPositionUpdated", (data: any) => {
          state.leftPaddle.x = data.x;
          state.leftPaddle.y = data.y;
        });
      }

      props.socket.on("matchInterrupted", () => {
        state.userDeconnected = true;
        setTimeout(() => {
          cancelAnimationFrame(animationFrameIdPhysics);
          cancelAnimationFrame(animationFrameIdPong);
          props.socket.off("readyPlayer");
          emit("userDisconnect");
        }, 3000);
        return;
      });

      props.socket.on("quitTheMatch", () => {
        setTimeout(() => {
          cancelAnimationFrame(animationFrameIdPhysics);
          cancelAnimationFrame(animationFrameIdPong);
          props.socket.off("readyPlayer");
          emit("userDisconnect");
        }, 3000);
        return;
      });

      if (!props.isSpectator) {
        window.addEventListener("keydown", (event) => {
          if (event.code === "Enter") {
            if (props.player === "1") {
              gameStart.player1 = true;
              props.socket.emit("playerReady", {
                player: props.player,
                roomId: props.roomId,
              });
            } else if (props.player === "2") {
              gameStart.player2 = true;
              props.socket.emit("playerReady", {
                player: props.player,
                roomId: props.roomId,
              });
            }
          }
        });
        window.addEventListener("keydown", (event) => {
          if (event.code === "KeyW" || event.code === "KeyS") {
            keys[event.code] = true;
          }
        }),
          window.addEventListener("keyup", (event) => {
            if (event.code === "KeyW" || event.code === "KeyS") {
              keys[event.code] = false;
            }
          });
          window.addEventListener("blur", () => {
            keys["KeyW"] = false;
            keys["KeyS"] = false;
          });
      }

      drawPong(window.performance.now());
    });

    return { canvas, state };
  },
});
</script>

<template>
  <div id="canvas-container">
    <canvas ref="myCanvasRef" id="myCanvas" width="1000" height="600"></canvas>
  </div>
</template>

<style scoped>
@font-face {
  font-family: "pixelFont";
  src: url(../assets/fonts/PressStart2P-Regular.ttf);
}
#canvas-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
#myCanvas {
  border: 1px solid rgb(11, 6, 6);
}
/* 	Big screen */
@media screen and (min-width: 1401px) {
  #myCanvas {
    width: 70%;
    height: 50%;
  }
}
/*  Medium screen */
@media screen and (min-width: 801px) and (max-width: 1400px) {
  #myCanvas {
    width: 70%;
    height: 50%;
  }
}
/*  Little screen */
@media screen and (max-width: 800px) and (min-width: 451px) {
  #myCanvas {
    width: 70%;
    height: 50%;
  }
}
/*  Very little screen X */
@media screen and (max-width: 450px) {
  #myCanvas {
    width: 70%;
    height: 50%;
  }
}
</style>
