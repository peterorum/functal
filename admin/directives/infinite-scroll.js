(
    function()
    {
        "use strict";

        angular.module('functalApp')
            .directive('infiniteScroll', ["$window", "$document", function($window, $document)
            {
                return {
                    restrict: 'EA',
                    scope:
                    {
                        infiniteScroll: "&"
                    },
                    template: '<div></div>',
                    link: function(scope, element)
                    {
                        $($window).on('scroll', function()
                        {
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
