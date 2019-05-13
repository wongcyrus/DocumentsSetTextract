const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const xl = require('excel4node');

exports.lambdaHandler = async(event, context) => {
    const key = event[0].keyValuePairJson;
    const filePath = "/tmp/" + key;
    await s3download(process.env['TextractBucket'], key, filePath);

    const rawdata = fs.readFileSync(filePath);
    const keyValuePairJson = JSON.parse(rawdata);

    const wb = new xl.Workbook();
    const valueWorkSheet = wb.addWorksheet('Value');
    const conflidenceWorkSheet = wb.addWorksheet('Confidence');

    const keys = Array.from(new Set(keyValuePairJson.map(c => c.key))).sort();
    const pages = Array.from(new Set(keyValuePairJson.map(c => c.page))).sort();
    console.log(keys);
    console.log(pages);

    for (let x = 0; x < keys.length; x++) {
        valueWorkSheet.cell(1, x + 1).string(keys[x]);
        conflidenceWorkSheet.cell(1, x + 1).string(keys[x]);
    }

    for (let x = 0; x < keys.length; x++)
        for (let y = 0; y < pages.length; y++) {
            let data = keyValuePairJson.filter(c => c.page == pages[y] && c.key === keys[x]);
            if (data.length === 1) {
                valueWorkSheet.cell(y + 2, x + 1).string(data[0].val);
                conflidenceWorkSheet.cell(y + 2, x + 1).number(data[0].valueConfidence);
            }
        }

    const excelKey = event[0].keyValuePairJson.replace(".json", ".xlsx");
    const excelFilePath = '/tmp/' + excelKey;
    await writeExcel(wb, excelFilePath);

    const data = await readFile(excelFilePath);
    await s3.putObject({
        Bucket: process.env['TextractBucket'],
        Key: excelKey,
        Body: data
    }).promise();
    event[0].excelKey = excelKey;
    return event;
};

const writeExcel = (workbook, filePath) => {
    return new Promise((resolve, reject) => {
        workbook.write(filePath, (err, stats) => {
            if (err) {
                return reject(err);
            }
            else {
                return resolve(stats); // Prints out an instance of a node.js fs.Stats object
            }
        });
    });
}

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
