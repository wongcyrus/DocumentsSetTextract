const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fs = require('fs');

exports.lambdaHandler = async(event, context) => {
    console.log(JSON.stringify(event));
    const key = event[0].resultKey;
    const filePath = "/tmp/" + key;
    await s3download(process.env['TextractBucket'], key, filePath);
    
    const rawdata = fs.readFileSync(filePath);  
    const textractResults = JSON.parse(rawdata);  


    return event;
};

const s3download = (bucketName, keyName, localDest) => {
    if (typeof localDest == 'undefined') {
        localDest = keyName;
    }
    let params = {
        Bucket: bucketName,
        Key: keyName
    }
    let file = fs.createWriteStream(localDest)

    return new Promise((resolve, reject) => {
        s3.getObject(params).createReadStream()
            .on('end', () => {
                return resolve();
            })
            .on('error', (error) => {
                return reject(error);
            }).pipe(file)
    });
};
