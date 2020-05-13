# 1. configure local wifi network in /etc/wpa_suplicant/wpa_suplicant.conf 
sudo cp /home/pi/curb-wheel/config/wpa_suplicant.conf /etc/wpa_suplicant/wpa_suplicant.conf 

# 3. swap in backup of AP DHCP config
sudo cp /etc/raspap/backups/dhcpcd.conf.ap /etc/dhcpcd.conf
# 4. disable raspapd service 
sudo systemctl enable raspapd.service
