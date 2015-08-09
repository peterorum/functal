(
    function()
    {
        "use strict";

        angular.module('functalApp').controller('FunctalCtrl', ['$scope', '$http', '$window', '$interval',
            function($scope, $http, $window, $interval)
            {
                var getImages = function()
                {
                    $http.jsonp('/getimages?callback=JSON_CALLBACK').then(function(result)
                    {
                        $scope.images = result.data.images;

                        if ($scope.isSortAsc)
                        {
                            $scope.images.reverse();
                        }
                    });
                };

                $scope.delete = function(image)
                {
                    var key = image.name;

                    $scope.images = R.filter(function(k)
                    {
                        return k.name !== key;
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

                $scope.gotoTop = function()
                {
                    $window.location.href = '#top';
                };

                $scope.showMore = function()
                {
                    $scope.showCount += 4;

                    console.log('showmore', $scope.showCount);
                };

                $scope.sortAsc = function(isAsc)
                {
                    $scope.isSortAsc = isAsc;

                    $scope.images.reverse();

                    $scope.showCount = 6;
                };

                $scope.showJson = function(image)
                {
                    var url = $scope.s3 + image.name.replace(/\.(png|jpg)$/, '.json');

                    $window.open(url);
                };

                // reload

                $interval(function()
                {
                    getImages();
                }, 5 * 60000);

                // init

                $scope.cdn = 'https://d1aienjtp63qx3.cloudfront.net/';
                $scope.s3 = 'https://s3.amazonaws.com/functal-json/';

                $scope.showCount = 6;

                $scope.isSortAsc = false;

                getImages();

            }
        ]);

    }()
);
