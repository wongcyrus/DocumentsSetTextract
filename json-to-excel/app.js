const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const fs = require("fs");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);
const xl = require("excel4node");
const path = require("path");

exports.lambdaHandler = async (event, context) => {
  const key = event.keyValuePairJson;
  const filePath = "/tmp/" + key;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await s3download(process.env["TextractBucket"], key, filePath);

  const rawdata = fs.readFileSync(filePath);
  const keyValuePairJson = JSON.parse(rawdata);

  const wb = new xl.Workbook();
  const documentValueWorkSheet = wb.addWorksheet("DocumentValue");
  const documentConflidenceWorkSheet = wb.addWorksheet("DocumentConfidence");
  const pageValueWorkSheet = wb.addWorksheet("PageValue");
  const pageConflidenceWorkSheet = wb.addWorksheet("PageConfidence");

  const keys = Array.from(new Set(keyValuePairJson.map((c) => c.key))).sort();
  const pages = Array.from(new Set(keyValuePairJson.map((c) => c.page))).sort(
    (a, b) => a - b
  );
  // console.log(keys);
  // console.log(pages);
  // console.log(keyValuePairJson);

  popularPageSheet(
    pageValueWorkSheet,
    pageConflidenceWorkSheet,
    keys,
    pages,
    keyValuePairJson
  );
  popularDocumentSheet(
    documentValueWorkSheet,
    documentConflidenceWorkSheet,
    keys,
    pages,
    keyValuePairJson
  );

  const excelKey = event.resultKey.replace(".json", ".xlsx");
  const excelFilePath = "/tmp/" + excelKey;

  await writeExcel(wb, excelFilePath);

  const data = await readFile(excelFilePath);
  await s3
    .putObject({
      Bucket: process.env["TextractBucket"],
      Key: excelKey,
      Body: data,
      ContentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    .promise();
  event.resultBucket = process.env["TextractBucket"];
  event.excelKey = excelKey;

  event.resultUrl = s3.getSignedUrl("getObject", {
    Bucket: process.env["TextractBucket"],
    Key: excelKey,
    Expires: 86400, //7 days
  });
  event.resultPdfUrl = s3.getSignedUrl("getObject", {
    Bucket: process.env["ImagesBucket"],
    Key: event.key,
    Expires: 86400, //7 days
  });
  event.ImagesBucket = process.env["ImagesBucket"];

  const sourcePdf = await s3
    .getObjectTagging({
      Bucket: event.srcBucket,
      Key: event.resultKey.replace(".json", ".pdf"),
    })
    .promise();

  const tags = sourcePdf.TagSet.reduce(
    (dict, el, index) => ((dict[el.Key] = el.Value), dict),
    {}
  );
  if (
    tags["sender"] &&
    tags["receiver"] &&
    tags["subject"] &&
    tags["messageId"]
  ) {
    event.sender = tags["sender"];
    event.receiver = tags["receiver"];
    event.subject = tags["subject"];
    event.messageId = tags["messageId"];
  } else {
    event.sender = "";
    event.receiver = "";
    event.subject = "";
    event.messageId = "";
  }
  return event;
};

const getDocumentPairs = (keyValuePairJson, pages) => {
  let individualKeyValue = new Map();
  let individualConfidenceValue = new Map();
  let documentValuePairs = [];
  let documentConfidencePairs = [];
  for (let y = 0; y < pages.length; y++) {
    let kvs = keyValuePairJson.filter((c) => c.page === pages[y]);
    if (kvs.map((c) => c.key).some((key) => individualKeyValue.has(key))) {
      documentValuePairs.push(individualKeyValue);
      documentConfidencePairs.push(individualConfidenceValue);
      individualKeyValue = new Map();
      individualConfidenceValue = new Map();
    }
    kvs.map((c) => individualKeyValue.set(c.key, c.val));
    kvs.map((c) => individualConfidenceValue.set(c.key, c.valueConfidence));
  }
  documentValuePairs.push(individualKeyValue);
  documentConfidencePairs.push(individualConfidenceValue);
  return { documentValuePairs, documentConfidencePairs };
};

const popularPageSheet = (
  pageValueWorkSheet,
  pageConflidenceWorkSheet,
  keys,
  pages,
  keyValuePairJson
) => {
  for (let x = 0; x < keys.length; x++) {
    pageValueWorkSheet.cell(1, x + 1).string(keys[x]);
    pageConflidenceWorkSheet.cell(1, x + 1).string(keys[x]);
  }

  for (let x = 0; x < keys.length; x++)
    for (let y = 0; y < pages.length; y++) {
      let data = keyValuePairJson.filter(
        (c) => c.page === pages[y] && c.key === keys[x]
      );
      if (data.length === 1) {
        pageValueWorkSheet.cell(y + 2, x + 1).string(data[0].val);
        pageConflidenceWorkSheet
          .cell(y + 2, x + 1)
          .number(data[0].valueConfidence);
      }
    }
};

const popularDocumentSheet = (
  documentValueWorkSheet,
  documentConflidenceWorkSheet,
  keys,
  pages,
  keyValuePairJson
) => {
  let { documentValuePairs, documentConfidencePairs } = getDocumentPairs(
    keyValuePairJson,
    pages
  );
  for (let x = 0; x < keys.length; x++) {
    documentValueWorkSheet.cell(1, x + 1).string(keys[x]);
    documentConflidenceWorkSheet.cell(1, x + 1).string(keys[x]);
  }

  for (let x = 0; x < keys.length; x++)
    for (let y = 0; y < documentValuePairs.length; y++) {
      documentValueWorkSheet
        .cell(y + 2, x + 1)
        .string(documentValuePairs[y].get(keys[x]) || "");
      documentConflidenceWorkSheet
        .cell(y + 2, x + 1)
        .number(documentConfidencePairs[y].get(keys[x]) || 0);
    }
};

const writeExcel = (workbook, filePath) => {
  return new Promise((resolve, reject) => {
    workbook.write(filePath, (err, stats) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(stats); // Prints out an instance of a node.js fs.Stats object
      }
    });
  });
};

const s3download = (bucketName, keyName, localDest) => {
  if (typeof localDest == "undefined") {
    localDest = keyName;
  }
  let params = {
    Bucket: bucketName,
    Key: keyName,
  };
  let file = fs.createWriteStream(localDest);

  return new Promise((resolve, reject) => {
    s3.getObject(params)
      .createReadStream()
      .on("end", () => {
        return resolve();
      })
      .on("error", (error) => {
        return reject(error);
      })
      .pipe(file);
  });
};
