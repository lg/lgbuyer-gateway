### LGBuyer Gateway

This container is used to create HTTP proxies from OpenVPN tunnels. It runs an instance of OpenVPN
for each .ovpn file in the /root/vpns directory. It then uses 3proxy to create an HTTP proxy that
listens on port 32000+ (incrementing port by 1 for each ovpn file) and sends traffic out via the
tunneled OpenVPN interface.

You must add NET_ADMIN capabilities to run this.

Current limitation is that only /24 prefixes are supported for OpenVPN networks. Also, it's strongly
recommended that you use the TCP protocol such that you avoid some MTU-related issues.

Deploy the Docker image to Github using:
`docker buildx build --platform linux/amd64 --push -t ghcr.io/lg/lgbuyer-gateway:ATAGHERE .`

Example of how to start two VPNs, with HTTP proxies on ports 32000 and 32001:
`docker run -it --rm --cap-add=NET_ADMIN --volume vpn1.ovpn:/root/vpns/vpn1.ovpn --volume vpn2.ovpn:/root/vpns/vpn2.ovpn --pull always ghcr.io/lg/lgbuyer-gateway:ATAGHERE`

Testing that everything works:
```
curl ifconfig.me
curl --interface tun0 ifconfig.me
curl --proxy 127.0.0.1:32000 ifconfig.me
curl --proxy 127.0.0.1:32000 https://ifconfig.me
```