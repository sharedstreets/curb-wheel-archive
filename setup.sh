# curl https://raw.githubusercontent.com/sharedstreets/curb-wheel/master/setup.sh | sh

# UPDATE DEPENDENCIES
sudo apt update
sudo apt upgrade

# INSTALL NODE & NPM
sudo apt install nodejs npm

# SETUP AP MODE (production deployment)
sh setup-ap.sh

# SETUP LOCAL WIFI MODE (development deployment)
# sh setup-wifi.sh
