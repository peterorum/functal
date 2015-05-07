(
    function()
    {
        "use strict";

        angular.module('functalApp').controller('FunctalCtrl', ['$scope', '$http', '$window', '$timeout',
            function($scope, $http, $window, $timeout)
            {
                var getImages = function()
                {
                    $http.get('/getimages').then(function(result)
                    {
                        $scope.images = result.data.images;
                    });
                };

                $scope.delete = function(key)
                {
                    $scope.images = R.filter(function(k)
                    {
                        return k !== key;
                    }, $scope.images);

                    $http(
                    {
                        method: 'POST',
                        url: '/delete',
                        data:
                        {
                            key: key
                        }
                    }).then(function(result)
                    {
                        if (result.error)
                        {
                            $window.alert(result.error);
                        }
                    });

                };

                $scope.showMore = function()
                {
                    console.log('showmore');

                    $scope.showCount += 4;
                };

                // reload

                $timeout(function()
                {
                    getImages();
                }, 5 * 60000);

                // init

                $scope.cdn = 'https://d1aienjtp63qx3.cloudfront.net/';

                $scope.showCount = 10;

                getImages();

            }
        ]);

    }()
);
