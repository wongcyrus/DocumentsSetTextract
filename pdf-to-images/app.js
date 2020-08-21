const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const fs = require("fs");
const { promisify } = require("util");
const pdf2img = require("./pdf2img");

const readFile = promisify(fs.readFile);

exports.lambdaHandler = async (event, context) => {
  console.log(JSON.stringify(event));
  const srcBucket = event.bucket;
  const srcKey = event.key;

  const destKeyPrefix = srcKey.replace(/\s/g, "_").replace(".pdf", "");
  const outputdir = "/tmp/" + destKeyPrefix;
  fs.existsSync(outputdir) || fs.mkdirSync(outputdir, { recursive: true });
  const filePath = "/tmp/" + srcKey.replace(/\s/g, "_");
  await s3download(srcBucket, srcKey, filePath);

  const stats = fs.statSync(filePath);
  console.log("File Size in Bytes:- " + stats.size);
  const results = await convert2images(filePath, outputdir);
  console.log(results);

  const s3Results = await Promise.all(
    results.map(async (c) => {
      console.log(c);
      let data = await readFile(c.path);
      let key = c.path.replace("/tmp/", "");
      return await s3
        .putObject({
          Bucket: process.env["ImagesBucket"],
          Key: key,
          Body: data,
          ContentType: "image/png",
        })
        .promise();
    })
  );
  console.log(s3Results);
  const images = results.map((c) => c.path.replace("/tmp/", ""));

  return {
    srcBucket,
    srcKey,
    imagePrefix: images[0].replace("1.png", ""),
    numberOfImages: images.length,
  };
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

const convert2images = async (filePath, outputdir) => {
  pdf2img.setOptions({
    type: "png", // png or jpg, default jpg
    density: 600, // default 600
    outputdir, // output folder, default null (if null given, then it will create folder name same as file name)
    outputname: "p", // output file name, dafault null (if null given, then it will create image name same as input name)
  });
  return await pdf2img.convert(filePath);
};
