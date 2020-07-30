const AWS = require('aws-sdk');
const stepfunctions = new AWS.StepFunctions();
const moment = require('moment');

exports.lambdaHandler = async(event, context) => {
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));

    const params = {
        stateMachineArn: process.env['StateMachineArn'],
        /* required */
        input: JSON.stringify({
            bucket,
            key
        }),
        name: moment().format('MMMM-Do-YYYY-h-mm-ss-a') + "-" + key.replace(/\s/g, '')
    };
    const result = await stepfunctions.startExecution(params).promise();

    return result;
};
