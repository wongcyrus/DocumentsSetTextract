sourcebucket=cyruswong-sam-repo
sam package --template-file template.yaml --s3-bucket $sourcebucket --output-template-file packaged.yaml
sam publish --template packaged.yaml --region us-east-1