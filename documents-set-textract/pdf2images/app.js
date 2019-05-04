// const axios = require('axios')
// const url = 'http://checkip.amazonaws.com/';
const AWS = require('aws-sdk');
const util = require('util');
const s3 = new AWS.S3();
const fs = require('fs');
const path = require('path');
const pdf2img = require('pdf2img');
const gs = require('gs');
// gs().executablePath(process.env['LAMBDA_TASK_ROOT']+'/GhostscriptLayer');

// process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT']+"/bin";

exports.lambdaHandler = async(event, context) => {
    console.log("Reading options from event:\n", util.inspect(event, { depth: 5 }));
    const srcBucket = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
    const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    
    const params = {
      Bucket: srcBucket,
      Key: srcKey
    };
    const file_data = await getObject(params);
    const filePath="/tmp/" + srcKey;
    fs.writeFileSync(filePath, file_data.toString())
    const stats = fs.statSync(filePath);
    console.log('File Size in Bytes:- ' + stats.size);
    const info = await convert2images(filePath);
    console.log(info);
        
    return { srcBucket, srcKey }
};

const getObject = (handle) => {
    return new Promise((resolve, reject) => {
      s3.getObject(handle, (err, data) => {
        if (err) reject(err)
        else resolve(data.Body)
      })
    })
};

const convert2images = (filePath) => {
    pdf2img.setOptions({
      type: 'jpg',                                // png or jpg, default jpg
      density: 600,                               // default 600
      outputdir: '/tmp/', // output folder, default null (if null given, then it will create folder name same as file name)
      outputname: 'test',                         // output file name, dafault null (if null given, then it will create image name same as input name)
    });
    return new Promise((resolve, reject) => {
        pdf2img.convert(filePath, (err, info) =>{
          if (err) reject(err)
          else resolve(info);
        });
    })
};
