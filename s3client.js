(function()
{
    "use strict";

    var Q = require('q');
    var s3 = require('s3');
    var R = require('ramda');

    //----------- s3

    var s3client = s3.createClient(
    {
        s3Options:
        {
            accessKeyId: process.env.s3Key,
            secretAccessKey: process.env.s3Secret
        },
    });

    //--------- list s3 bucket

    var s3list = function(bucket)
    {
        var deferred = Q.defer();

        var s3files = [];

        var lister = s3client.listObjects(
        {
            s3Params:
            {
                Bucket: bucket
            }
        });

        lister.on('error', function(err)
        {
            console.error("unable to list:", err.stack);
            deferred.reject();
        });

        lister.on('data', function(data)
        {
            // console.log('data', data);
            s3files.push(data.Contents);
        });

        lister.on('end', function()
        {
            var result = {
                count: lister.objectsFound,
                files: R.flatten(s3files)
            };

            deferred.resolve(result);
        });

        return deferred.promise;
    };

    //--------- upload to s3

    var s3upload = function(bucket, key, file)
    {
        var deferred = Q.defer();

        console.log('Sending to s3', bucket, key, file);

        var params = {
            localFile: file,

            s3Params:
            {
                Bucket: bucket,
                Key: key,
                ACL: 'public-read'
            },
        };

        var uploader = s3client.uploadFile(params);

        uploader.on('error', function(err)
        {
            console.error("unable to upload:", err.stack);
            deferred.reject();
        });

        uploader.on('progress', function()
        {
            // console.log("progress", uploader.progressMd5Amount, uploader.progressAmount, uploader.progressTotal);
        });

        uploader.on('end', function()
        {
            // console.log("done uploading");
            deferred.resolve();
        });

        uploader.on('fileOpened', function()
        {
            // console.log('file opened');
        });

        uploader.on('fileClosed', function()
        {
            // console.log('file closed');
        });

        return deferred.promise;
    };

    //----------- exports

    exports.list = s3list;
    exports.upload = s3upload;

}());
