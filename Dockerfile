FROM alpine
WORKDIR /root

RUN apk --no-cache --update add openvpn curl
RUN echo "https://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories && apk --no-cache add 3proxy

COPY entrypoint.sh 3proxy.cfg ./


CMD ["sh", "-c", "./entrypoint.sh"]