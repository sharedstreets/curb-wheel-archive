# installs and configures tile server for gl vector tiles

# install sqlite3 dev libs for source build of node driver
sudo apt-get install libsqlite3-dev

# relax /usr/local permissions for global npm install 
sudo chmod -R 777 /usr/local/

# global install of tile server node module with sqlite driver from source
npm install --build-from-source --sqlite=/usr/local -g tileserver-gl-light