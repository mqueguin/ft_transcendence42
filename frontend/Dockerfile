FROM node:19

WORKDIR /frontend/app

COPY . .

EXPOSE 8080

RUN npm install --loglevel silent

CMD [ "npm", "run", "serve" ]