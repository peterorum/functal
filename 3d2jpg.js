var page = require("webpage").create();

page.onConsoleMessage = function (msg) {
    console.log(msg);
};

page.open(phantom.args[0])
    .then(function(status) {
        if (status == "success") {
            page.viewportSize = { width:768, height:1024 };
            page.clipRect = { top: 0, left: 0, width: 768, height: 1024 };

            // screenshot
            page.render(phantom.args[0].replace(/\.html/, '-wgl001.jpg'))
        }
        else {
            console.log("Sorry, the page is not loaded.", status);
        }

        page.close();

        phantom.exit();
    })
