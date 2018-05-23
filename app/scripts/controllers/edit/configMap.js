'use strict';

/**
 * @ngdoc function
 * @name openshiftConsole.controller:EditConfigMapController
 * @description
 * # EditConfigMapController
 * Controller of the openshiftConsole
 */
angular.module('openshiftConsole')
  .controller('EditConfigMapController',
              function ($filter,
                        $routeParams,
                        $scope,
                        $window,
                        APIService,
                        DataService,
                        BreadcrumbsService,
                        Navigate,
                        NotificationsService,
                        ProjectsService) {
    var watches = [];
    $scope.forms = {};
    $scope.projectName = $routeParams.project;

    $scope.breadcrumbs = BreadcrumbsService.getBreadcrumbs({
      name: $routeParams.configMap,
      kind: 'ConfigMap',
      namespace: $routeParams.project,
      subpage: '编辑配置映射'
    });

    var getVersion = function(resource) {
      return _.get(resource, 'metadata.resourceVersion');
    };

    var hideErrorNotifications = function() {
      NotificationsService.hideNotification("edit-config-map-error");
    };

    var navigateBack = function() {
      $window.history.back();
    };
    $scope.cancel = navigateBack;

    var configMapsVersion = APIService.getPreferredVersion('configmaps');

    ProjectsService
      .get($routeParams.project)
      .then(_.spread(function(project, context) {
        DataService
          .get(configMapsVersion, $routeParams.configMap, context, { errorNotification: false })
          .then(function(configMap) {
            $scope.loaded = true;
            $scope.breadcrumbs = BreadcrumbsService.getBreadcrumbs({
              name: $routeParams.configMap,
              object: configMap,
              project: project,
              subpage: '编辑配置映射'
            });
            $scope.configMap = configMap;
            watches.push(DataService.watchObject(configMapsVersion, $routeParams.configMap, context, function(newValue, action) {
              $scope.resourceChanged = getVersion(newValue) !== getVersion($scope.configMap);
              $scope.resourceDeleted = action === "DELETED";
            }));
          }, function(e) {
            Navigate.toErrorPage("无法加载配置映射 " + $routeParams.configMap + ". " +
                                 $filter('getErrorDetails')(e));
          });

        $scope.updateConfigMap = function() {
          if ($scope.forms.editConfigMapForm.$valid) {
            hideErrorNotifications();
            $scope.disableInputs = true;

            DataService.update(configMapsVersion, $scope.configMap.metadata.name, $scope.configMap, context)
              .then(function() { // Success
                NotificationsService.addNotification({
                  type: "success",
                  message: "配置映射 " + $scope.configMap.metadata.name + " 更新成功。"
                });
                navigateBack();
              }, function(result) { // Failure
                $scope.disableInputs = false;
                NotificationsService.addNotification({
                  id: "edit-config-map-error",
                  type: "error",
                  message: "更新配置映射时出错。",
                  details: $filter('getErrorDetails')(result)
                });
              });
          }
        };

        $scope.$on('$destroy', function(){
          DataService.unwatchAll(watches);
          hideErrorNotifications();
        });
    }));
  });
