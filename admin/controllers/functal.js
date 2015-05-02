(
    function()
    {
        "use strict";

        angular.module('functalApp').controller('FunctalCtrl', ['$scope', '$http', function($scope, $http)
        {
            $scope.getImages = function()
            {
                $http.get('/images').then(function(result)
                {
                    $scope.images = result.data.images;
                });
            };

            // init

            $scope.cdn = 'https://d1aienjtp63qx3.cloudfront.net/';

            $scope.getImages();

        }]);

    }()
);
