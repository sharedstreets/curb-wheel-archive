#!/bin/sh

WHEEL_KEY=./wheel.key
if ! test -f "$WHEEL_KEY"; then
  ssh-keygen -t rsa -N '' -f wheel.key
  ssh-copy-id -i wheel.key pi@raspberrypi.local
fi

scp -i $WHEEL_KEY -r ./python  pi@raspberrypi.local:/home/pi/curb-wheel/
scp -i $WHEEL_KEY -r ./src pi@raspberrypi.local:/home/pi/curb-wheel/
scp -i $WHEEL_KEY -r ./static  pi@raspberrypi.local:/home/pi/curb-wheel/
scp -i $WHEEL_KEY -r ./templates  pi@raspberrypi.local:/home/pi/curb-wheel/
#scp -i $WHEEL_KEY -r ./test pi@raspberrypi.local:/home/pi/curb-wheel/
scp -i $WHEEL_KEY  *.sh pi@raspberrypi.local:/home/pi/curb-wheel/
