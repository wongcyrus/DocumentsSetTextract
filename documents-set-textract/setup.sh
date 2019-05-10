SourceBucket=documentssettextractsource
nvm install v8.10
nvm alias default 8.10
aws s3 mb s3://$SourceBucket

./run_all_npm.sh