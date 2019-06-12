const AWS = require('aws-sdk');
const textract = new AWS.Textract();
const s3 = new AWS.S3();

exports.lambdaHandler = async(event, context) => {
    console.log(JSON.stringify(event));
    let params = {
        JobId: event.JobId,
        /* required */
        MaxResults: '1000'
    };
    let acc = [];
    await getDocumentAnalysis(params, acc);

    console.log(acc);
    if (acc[0].JobStatus === "SUCCEEDED") {
        event.iterator.continue = false;

        let result = {};
        result.DocumentMetadata = acc[0].DocumentMetadata;
        const reducer = (accumulator, currentValue) => accumulator.concat(currentValue);
        result.Blocks = acc.map(c => c.Blocks).reduce(reducer, []);

        const data = JSON.stringify(result);
        const resultKey = event.key.replace(".pdf", ".json");
        await s3.putObject({
            Bucket: process.env['TextractBucket'],
            Key: resultKey,
            Body: data,
            ContentType: "application/json"
        }).promise();
        event.resultKey = { resultKey };
    }
    return event;
};

const getDocumentAnalysis = async(params, acc) => {
    const result = await textract.getDocumentAnalysis(params).promise();
    console.log(result);
    acc.push(result);
    if (result.NextToken) {
        params.NextToken = result.NextToken;
        return await getDocumentAnalysis(params, acc);
    }
}
