SourceBucket=documentssettextractsource
nvm install v10.15.3
nvm alias default 10.15.3
npm update -g
aws s3 mb s3://$SourceBucket

./run_all_npm.sh