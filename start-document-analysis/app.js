const AWS = require("aws-sdk");
const crypto = require("crypto");
const textract = new AWS.Textract();
const sqs = new AWS.SQS();
const documentClient = new AWS.DynamoDB.DocumentClient();

exports.lambdaHandler = async (event, context) => {
  console.log(event);
  const bucket = process.env["ImagesBucket"];

  const body = JSON.parse(event.Records[0].body);
  console.log(body);
  const key = body.Message.srcKey;
  const taskToken = body.TaskToken;
  console.log(taskToken);

  await sqs
    .deleteMessage({
      QueueUrl: process.env.AsynTextractQueue,
      ReceiptHandle: event.Records[0].receiptHandle,
    })
    .promise();

  const params = {
    DocumentLocation: {
      /* required */
      S3Object: {
        Bucket: bucket,
        Name: key,
      },
    },
    FeatureTypes: [
      /* required */
      "FORMS",
      /* more items */
    ],
    JobTag: crypto.createHash("md5").update(key).digest("hex"),
    NotificationChannel: {
      RoleArn: process.env["TextractExecutionRoleArn"],
      SNSTopicArn: process.env["TextractCompletedTopicArn"],
    },
  };

  console.log(params);
  const result = await textract.startDocumentAnalysis(params).promise();
  console.log(result);

  const session = {
    TableName: process.env.SessionTable,
    Item: {
      id: result.JobId,
      taskToken,
      srcBucket: body.Message.srcBucket,
      ttl: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    },
  };
  console.log(await documentClient.put(session).promise());

  result.key = key;
  result.srcBucket = event.srcBucket;
  return result;
};
