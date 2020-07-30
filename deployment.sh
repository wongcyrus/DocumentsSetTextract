SourceBucket=documentssettextractsource
sam package \
    --output-template-file packaged.yaml \
    --s3-bucket $SourceBucket
    
sam deploy \
    --template-file packaged.yaml \
    --stack-name documents-set-textract \
    --capabilities CAPABILITY_IAM