const AWS = require('aws-sdk');
const textract = new AWS.Textract();

exports.lambdaHandler = async(event, context) => {
    const bucket = process.env["ImagesBucket"];
    const key = event.srcKey;

    const params = {
        DocumentLocation: { /* required */
            S3Object: {
                Bucket: bucket,
                Name: key
            }
        },
        FeatureTypes: [ /* required */
            "FORMS",
            /* more items */
        ],
        JobTag: key.replace(/\s/g, ''),
        NotificationChannel: {
            RoleArn: process.env["TextractExecutionRoleArn"],
            /* required */
            SNSTopicArn: process.env["TextractCompletedTopicArn"] /* required */
        }
    };

    console.log(params);
    const result = await textract.startDocumentAnalysis(params).promise();
    console.log(result);
    result.key = key;
    result.srcBucket = event.srcBucket;
    return result;

};
