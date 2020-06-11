
cd /home/pi/curb-wheel/

sh setup-ramdisk.sh

WHEEL_PID=./wheel.pid
if test -f "$WHEEL_PID"; then
    pkill -F $WHEEL_PID
fi

echo "0" > ram/counter.txt
python python/wheel.py &
echo $! > $WHEEL_PID

TILESERVER_PID=./tileserver.pid
if test -f "$TILESERVER_PID"; then
    pkill -F $TILESERVER_PID
fi

TILE_PATH=./extract.mbtiles
if test -f "$TILE_PATH"; then
    echo "run tileserver"
    tileserver-gl-light $TILE_PATH &
    echo $! > $TILESERVER_PID
fi

sudo modprobe ledtrig_heartbeat
sudo su root -c 'echo heartbeat >/sys/class/leds/led0/trigger'
