sh setup-ramdisk-simulator.sh

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


WHEEL_PID=./wheel.pid
if test -f "$WHEEL_PID"; then
    pkill -F $WHEEL_PID
fi


echo "0" > ram/counter.txt
python2.7 python/wheel-simulator.py &
echo $! > $WHEEL_PID
