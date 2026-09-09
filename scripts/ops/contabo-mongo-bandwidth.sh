#!/usr/bin/env bash
# Pace MongoDB responses while preserving capacity for SSH and other services.
# Installed on 147 as /usr/local/sbin/contabo-mongo-bandwidth.
set -euo pipefail

IFACE=eth0
MONGO_MBIT=40
PORT_MBIT=1000
if [[ -r /etc/default/contabo-mongo-bandwidth ]]; then
  source /etc/default/contabo-mongo-bandwidth
fi
# The optional interface argument is used for an isolated dummy-device check.
IFACE=${2:-$IFACE}
TC=/usr/sbin/tc
[[ "$IFACE" =~ ^[a-zA-Z0-9_.:-]+$ ]]
exec 9>"/run/lock/contabo-mongo-bandwidth-${IFACE}.lock"
flock -x 9

root_kind() {
  "$TC" qdisc show dev "$IFACE" | awk '$0 ~ / root / { print $2 " " $3 }'
}

restore_default() {
  "$TC" qdisc replace dev "$IFACE" root handle f001: fq_codel \
    limit 10240 flows 1024 quantum 1514 target 5ms interval 100ms \
    memory_limit 33554432 ecn drop_batch 64
}

case "${1:-start}" in
  start)
    [[ "$MONGO_MBIT" =~ ^[0-9]+$ && "$PORT_MBIT" =~ ^[0-9]+$ ]]
    (( MONGO_MBIT > 0 && MONGO_MBIT < PORT_MBIT ))
    prior=$(root_kind)
    case "$prior" in
      'fq_codel 0:'|'fq_codel f001:'|'htb 1:'|'noqueue 0:') ;;
      *) echo "Refusing to replace unexpected qdisc on $IFACE: $prior" >&2; exit 1 ;;
    esac
    # If any installation step fails, preserve a usable unshaped interface.
    trap 'restore_default' ERR
    # Linux HTB does not implement changing the existing root qdisc itself.
    # Keep our root on reload; update its classes and filters below.
    if [[ "$prior" != 'htb 1:' ]]; then
      "$TC" qdisc replace dev "$IFACE" root handle 1: htb default 20
    fi
    "$TC" class replace dev "$IFACE" parent 1: classid 1:1 htb \
      rate "${PORT_MBIT}mbit" ceil "${PORT_MBIT}mbit" \
      burst 1mb cburst 1mb quantum 15140
    "$TC" class replace dev "$IFACE" parent 1:1 classid 1:10 htb \
      rate "${MONGO_MBIT}mbit" ceil "${MONGO_MBIT}mbit" \
      burst 128kb cburst 128kb quantum 1514 prio 1
    "$TC" class replace dev "$IFACE" parent 1:1 classid 1:20 htb \
      rate "$((PORT_MBIT - MONGO_MBIT))mbit" ceil "${PORT_MBIT}mbit" \
      burst 1mb cburst 1mb quantum 15140 prio 0
    "$TC" qdisc replace dev "$IFACE" parent 1:10 handle 10: fq_codel
    "$TC" qdisc replace dev "$IFACE" parent 1:20 handle 20: fq_codel
    "$TC" filter replace dev "$IFACE" parent 1: protocol ip pref 10 handle 10 \
      flower skip_hw ip_proto tcp src_port 27017 classid 1:10
    "$TC" filter replace dev "$IFACE" parent 1: protocol ipv6 pref 11 handle 11 \
      flower skip_hw ip_proto tcp src_port 27017 classid 1:10
    trap - ERR
    ;;
  stop)
    case "$(root_kind)" in
      'htb 1:') restore_default ;;
      'fq_codel 0:'|'fq_codel f001:'|'noqueue 0:') ;;
      *) echo "Refusing to remove an unrelated qdisc on $IFACE" >&2; exit 1 ;;
    esac
    ;;
  status)
    "$TC" -s class show dev "$IFACE"
    "$TC" filter show dev "$IFACE" parent 1:
    ;;
  *) echo "Usage: $0 {start|stop|status} [interface]" >&2; exit 2 ;;
esac
