const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fs = require('fs');
const { promisify } = require('util');
const pdf2img = require('./pdf2img');

const readFile = promisify(fs.readFile);

exports.lambdaHandler = async(event, context) => {
    const srcBucket = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
    const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));

    const params = {
        Bucket: srcBucket,
        Key: srcKey
    };

    const destKeyPrefix = srcKey.replace(/\s/g, '_').replace(".pdf", "")
    const outputdir = "/tmp/" + destKeyPrefix;
    fs.existsSync(outputdir) || fs.mkdirSync(outputdir);
    const filePath = "/tmp/" + srcKey.replace(/\s/g, '_');
    await s3download(srcBucket, srcKey, filePath);

    const stats = fs.statSync(filePath);
    console.log('File Size in Bytes:- ' + stats.size);
    const results = await convert2images(filePath, outputdir);
    console.log(results);

    const s3Results = await Promise.all(results.message.map(async c => {
        console.log(c);
        let data = await readFile(c.path);
        let key = c.path.replace("/tmp/", "");
        return await s3.putObject({ Bucket: srcBucket, Key: key, Body: data }).promise();
    }));

    return s3Results;
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

const convert2images = (filePath, outputdir) => {
    pdf2img.setOptions({
        type: 'png', // png or jpg, default jpg
        density: 600, // default 600
        outputdir, // output folder, default null (if null given, then it will create folder name same as file name)
        outputname: 'p', // output file name, dafault null (if null given, then it will create image name same as input name)
    });
    return new Promise((resolve, reject) => {
        pdf2img.convert(filePath, (err, info) => {
            if (err) reject(err)
            else resolve(info);
        });
    })
};
