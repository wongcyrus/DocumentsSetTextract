const AWS = require('/opt/node_modules/aws-sdk');
const textract = new AWS.Textract();
const s3 = new AWS.S3();

exports.lambdaHandler = async(event, context) => {
    console.log(JSON.stringify(event));
    const params = {
        JobId: event.JobId,
        /* required */
        MaxResults: '1000'
    };
    const result = await textract.getDocumentAnalysis(params).promise();
    
    if(result.JobStatus === "SUCCEEDED")
        event.iterator.continue = false;
    console.log(result);
    return event;
};
