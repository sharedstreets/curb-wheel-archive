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

sh setup-ramdisk.sh

WHEEL_PID=./wheel.pid
if test -f "$WHEEL_PID"; then
    pkill -F $WHEEL_PID
fi

echo "0" > ram/counter.txt
python python/wheel.py &
echo $! > $WHEEL_PID

sudo modprobe ledtrig_heartbeat
sudo su root -c 'echo heartbeat >/sys/class/leds/led0/trigger'

npm start