FROM node:19

RUN mkdir -p /backend/app

WORKDIR /backend/app

COPY package*.json ./

RUN npm install --loglevel silent

COPY . .

EXPOSE 3000

CMD [ "npm", "run", "start:migrate:dev" ]
