var page = require("webpage").create();

page.onConsoleMessage = function (msg) {
    console.log(msg);
};

page.open(phantom.args[0])
    .then(function(status) {

        console.log(status);

        page.close();

        phantom.exit();
    })
