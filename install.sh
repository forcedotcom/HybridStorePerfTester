#!/bin/bash

if [ -d "./app" ]; then
    echo "Hybrid app already exists"
else
    echo "Generating hybrid app for iOS and Android"
    forcehybrid create --platform=ios,android --apptype=hybrid_local --appname=HybridStorePerfTester --packagename=com.salesforce.hybridstoreperftester --organization=Salesforce --outputdir=app
fi

echo "Copying www sources from ./www to ./app/platforms/ios/www/"
cp -r ./www/* ./app/platforms/ios/www/

echo "Copying www sources from ./www to ./app/platforms/android/app/src/main/assets/www/"
cp -r ./www/* ./app/platforms/android/app/src/main/assets/www/
