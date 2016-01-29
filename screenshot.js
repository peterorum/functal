"use strict";

let webdriver = require('selenium-webdriver');

let Promise = require('bluebird');

let fs = Promise.promisifyAll(require("fs"));


var firefox = require('selenium-webdriver/firefox');

var profile = new firefox.Profile();
profile.setPreference('webgl.force-enabled', true);
profile.setPreference('dom.max_script_run_time', 0);

var options = new firefox.Options().setProfile(profile);
var driver = new firefox.Driver(options);


// let driver = new webdriver.Builder()
//     .forBrowser('firefox')
//     .build();

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

            return size.width === w ; // && size.height === h;
        });
    };
}

// no extension
let file = process.argv[2];

driver.manage().window().setSize(768, 1019);

driver.wait(forSizeToBe(768, 1019), 1000);

driver.get(`file://${file}.html`);

// driver.sleep(6000000);

driver.call(function* () {

    return saveScreenshot(yield driver.takeScreenshot(), `${file}.png`);
});

driver.quit();
