#!/bin/sh

if ! [ -e /dev/net/tun ]; then
  echo "*** Creating /dev/net/tun as it does not exist"
  mkdir -p /dev/net
  mknod /dev/net/tun c 10 200
  chmod 600 /dev/net/tun
fi

CUR_INTERFACE=-1
for FILE in vpns/*.ovpn; do
  let CUR_INTERFACE+=1
  let TABLE_NUM=CUR_INTERFACE+1
  let PORT=32000+CUR_INTERFACE
  echo "*** Starting VPN $FILE on tun$CUR_INTERFACE"

  openvpn --config $FILE --setenv UV_IPV6 no --dev tun$CUR_INTERFACE --route-nopull &
  LOOPS=0; until [ $LOOPS -eq 10 ] || ip addr show tun$CUR_INTERFACE 2>1 >/dev/null; do let LOOPS+=1; sleep 1; done
  if ! ip addr show tun$CUR_INTERFACE 2>1 >/dev/null; then echo "*** ABORTING: Failed to bring up openvpn interface"; exit 1; fi

  echo "*** Device tun$CUR_INTERFACE up, setting up routes and gateway commandline params"
  IP_START=$(ip -o addr show tun$CUR_INTERFACE | sed -n 's/.*inet \(\d\+\.\d\+\.\d\+\)\..*/\1/p')  # X.X.X
  IP=$(ip -o addr show tun$CUR_INTERFACE | sed -n 's/.*inet \(\d\+\.\d\+\.\d\+\.\d\+\)\/.*/\1/p')  # X.X.X.X

  # we're assuming the gateway is at .1 and we have a /24 prefix
  # method taken from here: https://github.com/dmegyesi/vpnproxy/blob/master/CLIENT/vpnconfig/README.routing
  set -o xtrace
  echo $TABLE_NUM VPN$PORT >> /etc/iproute2/rt_tables
  ip rule add from $IP_START.0/24 table VPN$PORT
  ip route add default via $IP_START.1 dev tun$CUR_INTERFACE table VPN$PORT
  ip rule add fwmark $PORT table VPN$PORT
  iptables -A OUTPUT -t mangle -s $IP -j MARK --set-mark $PORT
  echo "proxy -p$PORT -a -e$IP" >> 3proxy.cfg

  set +o xtrace
done

sleep 1
echo "****** Starting 3proxy"
exec 3proxy 3proxy.cfg