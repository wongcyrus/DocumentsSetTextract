"use strict";

const fs = require('fs');
const gm = require('gm').subClass({
    imageMagick: true
});
const gs = require('node-gs');
const path = require('path');
const async = require('async');

let options = {
    type: 'png',
    size: 1024,
    density: 600,
    outputdir: null,
    outputname: null,
    page: null
};

let Pdf2Img = function() {};

Pdf2Img.prototype.setOptions = opts => {
    options.type = opts.type || options.type;
    options.size = opts.size || options.size;
    options.density = opts.density || options.density;
    options.outputdir = opts.outputdir || options.outputdir;
    options.outputname = opts.outputname || options.outputname;
    options.page = opts.page || options.page;
};

Pdf2Img.prototype.convert = (input, callbackreturn) => {
    // Make sure it has correct extension
    if (path.extname(path.basename(input)) != '.pdf') {
        return callbackreturn({
            result: 'error',
            message: 'Unsupported file type.'
        });
    }

    // Check if input file exists
    if (!isFileExists(input)) {
        return callbackreturn({
            result: 'error',
            message: 'Input file not found.'
        });
    }

    let stdout = [];
    let output = path.basename(input, path.extname(path.basename(input)));

    // Set output dir
    if (options.outputdir) {
        options.outputdir = options.outputdir + path.sep;
    }
    else {
        options.outputdir = output + path.sep;
    }

    // Create output dir if it doesn't exists
    if (!isDirExists(options.outputdir)) {
        fs.mkdirSync(options.outputdir);
    }

    // Set output name
    if (options.outputname) {
        options.outputname = options.outputname;
    }
    else {
        options.outputname = output;
    }

    async.waterfall([
        // Get pages count
        callback => {
            gm(input).identify("%p ", function(err, value) {
                let pageCount = String(value).split(' ');
                if (!pageCount.length) {
                    callback({
                        result: 'error',
                        message: 'Invalid page number.'
                    }, null);
                }
                else {
                    // Convert selected page
                    if (options.page !== null) {
                        if (options.page < pageCount.length) {
                            callback(null, [options.page]);
                        }
                        else {
                            callback({
                                result: 'error',
                                message: 'Invalid page number.'
                            }, null);
                        }
                    }
                    else {
                        callback(null, pageCount);
                    }
                }

            })

        },


        // Convert pdf file
        (pages, callback) => {
            // Use eachSeries to make sure that conversion has done page by page
            async.eachSeries(pages, (page, callbackmap) => {
                let inputStream = fs.createReadStream(input);
                page = parseInt(page) + 1
                let outputFile = options.outputdir + options.outputname + '_' + page + '.' + options.type;

                convertPdf2Img(inputStream, outputFile, page, (error, result) => {
                    if (error) {
                        return callbackmap(error);
                    }

                    stdout.push(result);
                    return callbackmap(error, result);
                });
            }, (e) => {
                if (e) callback(e);

                return callback(null, {
                    result: 'success',
                    message: stdout
                });
            });
        }
    ], callbackreturn);
};

const convertPdf2Img = (input, output, page, callback) => {
    let filepath;
    if (input.path) {
        filepath = input.path;
    }
    else {
        return callback({
            result: 'error',
            message: 'Invalid input file path.'
        }, null);
    }
    console.log(`input:${filepath}, output:${output}, page: ${page}`);

    gs()
        .batch()
        .nopause()
        .option('-r' + options.density)
        // .option('-dDownScaleFactor=2')
        .option('-dFirstPage=' + page)
        .option('-dLastPage=' + page)
        .executablePath('/opt/gs')
        .device('png16m')
        .output(output)
        .input(filepath)
        .exec((err, stdout, stderr) => {
            console.log(stdout.toString('utf8'));
            if (stderr) console.log(stderr.toString('utf8'));
            if (err) {
                return callback({
                    result: 'error',
                    message: err
                }, null);
            }
            try {
                if (!(fs.statSync(output)['size'] / 1000)) {
                    return callback({
                        result: 'error',
                        message: 'Zero sized output image detected.'
                    }, null);
                }

                let results = {
                    page: page,
                    name: path.basename(output),
                    size: fs.statSync(output)['size'] / 1000.0,
                    path: output
                };

                return callback(null, results);
            }
            catch (e) {
                return callback(e);
            }
        });
};

// Check if directory is exists
const isDirExists = path => {
    try {
        return fs.statSync(path).isDirectory();
    }
    catch (e) {
        return false;
    }
}

// Check if file is exists
const isFileExists = path => {
    try {
        return fs.statSync(path).isFile();
    }
    catch (e) {
        return false;
    }
}

module.exports = new Pdf2Img;
