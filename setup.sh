# curl https://raw.githubusercontent.com/sharedstreets/curb-wheel/master/setup.sh | sh

# UPDATE DEPENDENCIES
sudo apt update
sudo apt upgrade

# INSTALL NODE & NPM
sudo apt install nodejs npm


# SETUP WIFI ACCESS POINT
# https://thepi.io/how-to-use-your-raspberry-pi-as-a-wireless-access-point/
# https://www.raspberrypi.org/documentation/configuration/wireless/access-point.md
sudo apt install hostapd
sudo apt install dnsmasq
sudo systemctl stop hostapd
sudo systemctl stop dnsmasq

echo "interface wlan0"  >> /etc/dhcpcd.conf
echo "static ip_address=192.168.0.10/24"  >> /etc/dhcpcd.conf
echo "denyinterfaces eth0"  >> /etc/dhcpcd.conf
echo "denyinterfaces wlan0"  >> /etc/dhcpcd.conf

echo "interface=wlan0" >> /etc/dnsmasq.conf
echo "  dhcp-range=192.168.0.11,192.168.0.30,255.255.255.0,24h" >> /etc/dnsmasq.conf

ssid="CURBWHEEL-$(openssl rand -base64 6)"
password=wheelie

echo "interface=wlan0" >> /etc/hostapd/hostapd.conf
echo "bridge=br0" >> /etc/hostapd/hostapd.conf
echo "hw_mode=g" >> /etc/hostapd/hostapd.conf
echo "channel=7" >> /etc/hostapd/hostapd.conf
echo "wmm_enabled=0" >> /etc/hostapd/hostapd.conf
echo "macaddr_acl=0" >> /etc/hostapd/hostapd.conf
echo "auth_algs=1" >> /etc/hostapd/hostapd.conf
echo "ignore_broadcast_ssid=0" >> /etc/hostapd/hostapd.conf
echo "wpa=2" >> /etc/hostapd/hostapd.conf
echo "wpa_key_mgmt=WPA-PSK" >> /etc/hostapd/hostapd.conf
echo "wpa_pairwise=TKIP" >> /etc/hostapd/hostapd.conf
echo "rsn_pairwise=CCMP" >> /etc/hostapd/hostapd.conf
echo "ssid=CURBWHEEL-$ssid" >> /etc/hostapd/hostapd.conf
echo "wpa_passphrase=$password" >> /etc/hostapd/hostapd.conf

echo "DAEMON_CONF=\"/etc/hostapd/hostapd.conf\"" >> /etc/default/hostapd

echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf

sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sudo sh -c "iptables-save > /etc/iptables.ipv4.nat"

echo "" > /etc/rc.local
echo "#!/bin/sh -e" >> /etc/rc.local
echo "iptables-restore < /etc/iptables.ipv4.nat" >> /etc/rc.local
echo "exit 0" >> /etc/rc.local

echo "---"
echo "WIFI: $ssid"
echo "PASSWORD: $password"
