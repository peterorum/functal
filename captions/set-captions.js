"use strict";

// get captions from microsoft vision api

let request = require('request');

function getCaption(image) {

  return new Promise(function(resolve, reject) {
    request.post({
      uri: 'https://api.projectoxford.ai/vision/v1.0/analyze',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.ms_key1
      },
      json: true,
      body: {
        url: image
      },
      qs: {
        visualFeatures: 'Description'
      }
    }, (error, response, body) => {

      if (error) {
        reject(error);
      } else {
        let caption = body.description && body.description.captions && body.description.captions[0].text;
        resolve(caption);
      }
    });

  });

}

// let image = 'https://d1aienjtp63qx3.cloudfront.net/functal-20161125220335314.jpg';

// getCaption(image).then(caption => {
//   console.log('set-captions', caption);
// });

exports.getCaption = getCaption;
