const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const parser = require('lambda-multipart-parser');
const str = require('@supercharge/strings');

const BUCKET_NAME = '<INSERT BUCKET NAME HERE>';
const APIKEY = '<INSERT API KEY HERE>';

module.exports.upload = async (event) => {
  const { apiKey } = event.queryStringParameters;

  const response = {
    statusCode: 200,
    body: JSON.stringify({ message: "Successfully uploaded file to S3" }),
  };

  if(apiKey === undefined || apiKey !== APIKEY) {
    response.statusCode = 403;
    response.body = JSON.stringify({ message: "API Key incorrect!"});

    return response;
  }

  const generatedName = str.random(6);
  var conflictFound = false;

  s3.headObject({Bucket: BUCKET_NAME, Key: generatedName}, function (err, metadata) {  
    if (err && err.name === 'NotFound') {  
      conflictFound = false;
    } else if (err) {
      conflictFound = true;
    }
  });

  try {
    if(conflictFound === true) {
      throw new Error('S3 upload failed');
    }

    const result = await parser.parse(event);

    const fileType = result.files[0].filename.split('.')[1];
    const params = {
        Bucket: BUCKET_NAME,
        Key: `${generatedName}.${fileType}`,
        Body: result.files[0].content,
        ContentType: result.files[0].contentType,
        ACL: 'public-read'
    };

    const uploadResult = await s3.upload(params).promise();
    console.log(uploadResult);
    
    response.body = JSON.stringify({ message: `https://${BUCKET_NAME}/${generatedName}.${fileType}`});
  } catch (e) {
    console.error(e);
    response.body = JSON.stringify({ message: "File failed to upload", errorMessage: e });
    response.statusCode = 500;
  }

  return response;
};
