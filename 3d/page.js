var page = require("webpage").create();

page.onConsoleMessage = function (msg) {
    console.log(msg);
};

page.open("index.html")
    .then(function(status) {
        if (status == "success") {
            console.log("The title of the page is: " + page.title);

            page.viewportSize = { width:768, height:1024 };
            page.render('screenshot.png')

        }
        else {
            console.log("Sorry, the page is not loaded");
        }

        page.close();

        slimer.exit();
    })
