#!/bin/bash
echo "starting ramdisk"
sudo mkdir -p ./ram
sudo mount -t tmpfs -o size=1m tmpfs ./ram