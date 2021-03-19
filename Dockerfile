FROM node:alpine
WORKDIR /root

RUN apk --no-cache --update add openvpn curl

COPY entrypoint.sh ./

COPY *.ts package*.json tsconfig.json ./
RUN npm install
RUN npx tsc

CMD ["sh", "-c", "./entrypoint.sh"]