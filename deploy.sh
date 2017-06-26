#!/bin/sh

while getopts e:g:b:h:n: option
do
 case "${option}"
 in
 e) EMAIL=${OPTARG};;
 g) GIT_URL=${OPTARG};;
 b) BRANCH_NAME=${OPTARG};;
 h) API_KEY=${OPTARG};;
 n) APP_NAME=${OPTARG};;
 u) UNIQUE_ID=${OPTARG};;
 esac
done

export HEROKU_API_KEY=$API_KEY

BASE=$(pwd)

mkdir -p temporary/$EMAIL/$UNIQUE_ID && cd $_

git clone --branch $BRANCH_NAME $GITURL app

cd app

curl http://nodejs.org/dist/v0.10.20/node-v0.10.20-linux-x64.tar.gz | tar xzv > /dev/null

cp $BASE/web.js .

cd ..

tar czfv slug.tgz ./app

heroku create $APP_NAME

Arr=($(curl -u ":$API_KEY" -X POST \
-H 'Content-Type:application/json' \
-H 'Accept: application/vnd.heroku+json; version=3' \
-d '{"process_types": {"web":"node-v0.10.20-linux-x64/bin/node web.js"}}' \
-n https://api.heroku.com/apps/ujjujjujj/slugs | \
python3 -c "import sys, json; obj=json.load(sys.stdin); print(obj['blob']['url'] + '\n' +obj['id'])"))

curl -X PUT \
-H "Content-Type:" \
--data-binary @slug.tgz \
"${Arr[0]}"

curl -u ":$API_KEY" -X POST \
-H "Accept: application/vnd.heroku+json; version=3" \
-H "Content-Type:application/json" \
-d '{"slug":"'${Arr[1]}'"}' \
-n https://api.heroku.com/apps/ujjujjujj/releases

heroku releases --app $APP_NAME
