SourceBucket=documentssettextractsource
nvm install v8.10
nvm alias default 8.10
aws s3 mb s3://$SourceBucket

cd analyze-document-images
npm install
cd ..
cd get-document-analysis
npm install
cd ..
cd pdf2images
npm install
cd ..
cd start-document-analysis
npm install
cd ..
cd start-document-state-machine
npm install
cd ..