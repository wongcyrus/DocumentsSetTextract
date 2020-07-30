const AWS = require('aws-sdk');
const stepfunctions = new AWS.StepFunctions();
const moment = require('moment');
const crypto = require('crypto');

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
        name: moment().format('MMMM-Do-YYYY-h-mm-ss-a') + "-" + crypto.createHash('md5').update(key).digest("hex")
    };
    const result = await stepfunctions.startExecution(params).promise();

    return result;
};
