const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fs = require('fs');
const Sharp = require('sharp');

exports.lambdaHandler = async(event, context) => {
    console.log(JSON.stringify(event));

    const images = [...Array(event.numberOfImages).keys()].map((x, y) => { return { key: event.imagePrefix + (y + 1) + ".png", file: "/tmp/" + (y + 1) + ".png", isInverted: event.invertedPageResults[y] } });
    console.log(images);
    await images.map(async c => s3download(process.env['ImagesBucket'], c.key, c.file));


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
