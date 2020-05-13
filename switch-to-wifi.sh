
# 1. configure local wifi network in /etc/wpa_suplicant/wpa_suplicant.conf 
sudo cp /home/pi/curb-wheel/config/wpa_suplicant.conf /etc/wpa_suplicant/wpa_suplicant.conf 

# 2. swap in backup of original wifi DHCP config
sudo cp /etc/raspap/backups/dhcpcd.conf /etc/dhcpcd.conf
# 3. disable raspapd service 
sudo systemctl disable raspapd.service
