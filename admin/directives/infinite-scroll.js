(
    function()
    {
        "use strict";

        // usage: add this at bottom of page
        // <div infinite-scroll="yourIncrementer()"></div>

        angular.module('functalApp')
            .directive('infiniteScroll', ["$window", "$document", function($window, $document)
            {
                return {
                    restrict: 'A',
                    scope:
                    {
                        infiniteScroll: "&"
                    },
                    template: '<div></div>',
                    link: function(scope, element)
                    {
                        $($window).on('scroll', function()
                        {
                            // fire event when top of div reaches bottom of visible page

                            if ($(element).position().top - $($window).scrollTop() - $($document)[0].body.clientHeight <= 0)
                            {
                                scope.infiniteScroll();
                                scope.$apply();
                            }
                        });
                    }
                };
            }]);
    }());
