const AWS = require('/opt/node_modules/aws-sdk');
const textract = new AWS.Textract();
const s3 = new AWS.S3();

exports.lambdaHandler = async(event, context) => {
    console.log(JSON.stringify(event));

    const getResult = JSON.parse(event.Records[0].Sns.Message);

    const params = {
        JobId: getResult.JobId,
        /* required */
        MaxResults: '1000'
    };
    const result = await textract.getDocumentAnalysis(params).promise();
    console.log(result);
    return event;
};
