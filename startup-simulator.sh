sh setup-ramdisk-simulator.sh

TILESERVER_PID=./tileserver.pid
if test -f "$TILESERVER_PID"; then
    pkill -F $TILESERVER_PID
fi

echo "run tileserver"
tileserver-gl-light ./extract.mbtiles &
echo $! > $TILESERVER_PID


WHEEL_PID=./wheel.pid
if test -f "$WHEEL_PID"; then
    pkill -F $WHEEL_PID
fi


echo "0" > ram/counter.txt
python python/wheel-simulator.py &
echo $! > $WHEEL_PID
