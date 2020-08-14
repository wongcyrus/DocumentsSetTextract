const AWS = require("aws-sdk");
const stepfunctions = new AWS.StepFunctions();
const documentClient = new AWS.DynamoDB.DocumentClient();
const textract = new AWS.Textract();
const s3 = new AWS.S3();

exports.lambdaHandler = async (event, context) => {
  console.log(event);
  const textractResult = JSON.parse(event.Records[0].Sns.Message);
  // "Message": "{\"JobId\":\"bd2847fd6c823644875ad02919ad83a636507b0ad9d3f31fd525421d078735ab\",\"Status\":\"SUCCEEDED\",\"API\":\"StartDocumentAnalysis\",\"JobTag\":\"19e6c81e0b2b8e394b00bca71df887ea\",\"Timestamp\":1597312949820,\"DocumentLocation\":{\"S3ObjectName\":\"DocumentsSetTextract Example v1.pdf\",\"S3Bucket\":\"documentssettextract-imagesbucket-wr4w8wybpmuh\"}}",

  const session = await documentClient
    .get({
      TableName: process.env.SessionTable,
      Key: { id: textractResult.JobId },
    })
    .promise();
  console.log(textractResult);
  console.log(session);

  if (textractResult.Status === "SUCCEEDED") {
    let params = {
      JobId: textractResult.JobId,
      /* required */
      MaxResults: "1000",
    };
    let acc = [];
    await getDocumentAnalysis(params, acc);

    let result = {};
    result.DocumentMetadata = acc[0].DocumentMetadata;
    const reducer = (accumulator, currentValue) =>
      accumulator.concat(currentValue);
    result.Blocks = acc.map((c) => c.Blocks).reduce(reducer, []);

    const data = JSON.stringify(result);
    const resultKey = textractResult.DocumentLocation.S3ObjectName.replace(
      ".pdf",
      ".json"
    );
    await s3
      .putObject({
        Bucket: process.env["TextractBucket"],
        Key: resultKey,
        Body: data,
        ContentType: "application/json",
      })
      .promise();
    const output = {
      resultKey,
      srcBucket: session.Item.srcBucket,
      key: textractResult.DocumentLocation.S3ObjectName,
    };
    params = {
      output: JSON.stringify(output) /* required */,
      taskToken: session.Item.taskToken /* required */,
    };
    console.log(params);
    const response = await stepfunctions.sendTaskSuccess(params).promise();
    console.log(response);
    return response;
  } else {
    let params = {
      cause: JSON.stringify(textractResult) /* required */,
      error: JSON.stringify(textractResult.err),
      taskToken: session.Item.taskToken /* required */,
    };
    const response = await stepfunctions.sendTaskFailure(params).promise();
    console.log(response);
    return response;
  }
};

const getDocumentAnalysis = async (params, acc) => {
  const result = await textract.getDocumentAnalysis(params).promise();
  console.log(result);
  acc.push(result);
  if (result.NextToken) {
    params.NextToken = result.NextToken;
    return await getDocumentAnalysis(params, acc);
  }
};
