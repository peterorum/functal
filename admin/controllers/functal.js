(
    function()
    {
        "use strict";

        angular.module('functalApp').controller('FunctalCtrl', ['$scope', '$http', '$window', '$interval',
            function($scope, $http, $window, $interval)
            {
                var getImages = function()
                {
                    $http.get('/getimages').then(function(result)
                    {
                        $scope.images = result.data.images;

                        if ($scope.isSortAsc)
                        {
                            $scope.images.reverse();
                        }
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

                $scope.gotoTop = function()
                {
                    $window.location.href = '#top';
                };
                $scope.showMore = function()
                {
                    console.log('showmore');

                    $scope.showCount += 4;
                };

                $scope.sortAsc = function(isAsc)
                {
                    $scope.isSortAsc = isAsc;

                    $scope.images.reverse();
                };

                $scope.showJson = function(image)
                {
                    var url = $scope.s3 + image.replace(/\.(png|jpg)$/, '.json');

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

                $scope.showCount = 10;

                $scope.isSortAsc = false;

                getImages();

            }
        ]);

    }()
);
