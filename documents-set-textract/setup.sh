SourceBucket=documentssettextractsource
nvm install v8.10
nvm alias default 8.10
aws s3 mb s3://$SourceBucket
cd pdf2images
npm install
cd ..
cd start-document-state-machine
npm install
cd ..
cd analyze-document
npm install
cd ..
