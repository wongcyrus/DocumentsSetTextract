const AWS = require('/opt/node_modules/aws-sdk');
const textract = new AWS.Textract();

exports.lambdaHandler = async(event, context) => {
    const bucket = event.bucket;
    const key = event.key;

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
    return result;

};
