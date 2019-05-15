const AWS = require('/opt/node_modules/aws-sdk');
const textract = new AWS.Textract();
const s3 = new AWS.S3();

exports.lambdaHandler = async(event, context) => {
    console.log(JSON.stringify(event));

    const resultKeys = await processImages(event.images);

    event.resultKeys = resultKeys;
    return event;
};

const processImages = async images => {
    let keys = [];
    for (const key of images) {
        const params = {
            Document: { /* required */
                S3Object: {
                    Bucket: process.env['ImagesBucket'],
                    Name: key
                }
            },
            FeatureTypes: [ /* required */
                "FORMS"
            ]
        }
        const result = await textract.analyzeDocument(params).promise();
        const resultKey = key.replace(".png", ".json");
        await s3.putObject({ Bucket: process.env['TextractBucket'], Key: resultKey, Body: JSON.stringify(result) }).promise();
        keys.push(resultKey);
    }
    return keys;
}
