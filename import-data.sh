# notify user what exactly is about to happen and have them confirm
echo "This will, inside the docker container, delete the existing vex database and import the data from the vex-data-export directory."
echo "Are you sure you want to continue? (y/n)"
read confirm
if [ "$confirm" != "y" ]; then
    echo "Aborting..."
    exit 1
fi

docker exec -it vex-mongodb rm -rf /tmp/vex
docker cp vex-data-export/vex vex-mongodb:/tmp/vex
docker exec -it vex-mongodb mongorestore /tmp/vex --db vex