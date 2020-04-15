#!/bin/sh
### BEGIN INIT INFO
# Provides:          wheelstart
# Required-Start:    $remote_fs $syslog
# Required-Stop:     $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Start wheel daemon at boot time
# Description:       Enable wheel service provided by daemon.
### END INIT INFO


cd /home/pi/curb-wheel/
npm start