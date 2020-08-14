const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const fs = require("fs");
const { promisify } = require("util");
const PDFDocument = require("/opt/node_modules/pdfkit");
const readFile = promisify(fs.readFile);
const path = require("path");

exports.lambdaHandler = async (event, context) => {
  console.log(JSON.stringify(event));
  const pdf = "/tmp/" + event.srcKey;
  rmDir(path.dirname(pdf));
  fs.mkdirSync(path.dirname(pdf), { recursive: true });
  const images = [...Array(event.numberOfImages).keys()].map((x, y) => {
    return {
      key: event.imagePrefix + (y + 1) + ".png",
      file: "/tmp/" + (y + 1) + ".png",
    };
  });

  await Promise.all(
    images.map((c) => s3download(process.env["ImagesBucket"], c.key, c.file))
  );

  await combineImagesToPdf(images, pdf);
  const stats = fs.statSync(pdf);
  console.log("File Size in Bytes:- " + stats.size);
  const data = await readFile(pdf);
  await s3
    .putObject({
      Bucket: process.env["ImagesBucket"],
      Key: event.srcKey,
      Body: data,
      ContentType: "application/pdf",
    })
    .promise();

  return event;
};

const combineImagesToPdf = (images, pdf) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const pdfStream = fs.createWriteStream(pdf);
    doc.pipe(pdfStream);
    console.log(images);
    for (let i = 0; i < images.length; i++) {
      let image = images[i];
      console.log(image.file);
      const stats = fs.statSync(image.file);
      console.log("Image Size in Bytes:- " + stats.size);
      console.log(doc.page.height, doc.page.width);

      if (i === 0) {
        doc.image(image.file, 0, 0, {
          width: doc.page.width,
          height: doc.page.height,
          align: "center",
          valign: "center",
        });
      } else {
        doc.addPage().image(image.file, 0, 0, {
          width: doc.page.width,
          height: doc.page.height,
          align: "center",
          valign: "center",
        });
      }
    }
    doc.end();
    pdfStream.addListener("finish", function () {
      resolve(pdf);
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

const rmDir = (dirPath) => {
  let files = [];
  try {
    files = fs.readdirSync(dirPath);
  } catch (e) {
    return;
  }
  if (files.length > 0)
    for (let i = 0; i < files.length; i++) {
      let filePath = dirPath + "/" + files[i];
      if (fs.statSync(filePath).isFile()) fs.unlinkSync(filePath);
      else rmDir(filePath);
    }
  if (dirPath !== "/tmp") fs.rmdirSync(dirPath);
};
