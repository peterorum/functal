"use strict";

let webdriver = require('selenium-webdriver');

let Promise = require('bluebird');

let fs = Promise.promisifyAll(require("fs"));

let driver = new webdriver.Builder()
    .forBrowser('chrome')
    .build();

function saveScreenshot(data, filename) {

    return fs.writeFileAsync(filename, data.replace(/^data:image\/png;base64,/, ""), 'base64')
        .then(function() {}, function(err) {
            console.log(err);
        });
}

function forSizeToBe(w, h) {
    return function() {
        return driver.manage().window().getSize().then(function(size) {

            // console.log(size.width, size.height);

            return size.width === w;// && size.height === h;
        });
    };
}

// no extension
let file = process.argv[2];

driver.manage().window().setSize(768, 1024);

driver.wait(forSizeToBe(768, 1024), 1000);

driver.get(`file://${file}.html`);

driver.call(function* () {

    return saveScreenshot(yield driver.takeScreenshot(), `${file}.png`);
});

driver.quit();
