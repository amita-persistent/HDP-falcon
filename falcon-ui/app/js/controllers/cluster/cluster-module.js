/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function () {
  'use strict';

  /***
   * @ngdoc controller
   * @name app.controllers.feed.FeedController
   * @requires EntityModel the entity model to copy the feed entity from
   * @requires Falcon the falcon service to talk with the Falcon REST API
   */
  var clusterModule = angular.module('app.controllers.cluster', ['app.services']);

  clusterModule.controller('ClusterFormCtrl', ["$scope", "$interval", "Falcon", "EntityModel", "$state",
    "X2jsService", "ValidationService", "SpinnersFlag", "$timeout", "$rootScope", "$cookieStore",
    function ($scope, $interval, Falcon, EntityModel, $state,
              X2jsService, validationService, SpinnersFlag, $timeout, $rootScope, $cookieStore) {

      $scope.clusterEntity = EntityModel;
      $scope.xmlPreview = {edit: false};
      $scope.secondStep = false;

      function normalizeModel() {

        //------------INTERFACE-----------//
        var requiredInterfaceFields = ["readonly", "write", "execute", "workflow", "messaging", "registry"],
          requiredLocationFields = ["staging", "temp", "working", ""],
          modelInterfaceArray = $scope.clusterEntity.clusterModel.cluster.interfaces.interface,
          modelLocationsArray = $scope.clusterEntity.clusterModel.cluster.locations.location;

        $scope.readonlyPos = 0;
        $scope.writePos = 1;
        $scope.executePos = 2;
        $scope.workflowPos = 3;
        $scope.messagingPos = 4;
        $scope.registryPos = 5;

        $scope.stagingPos = 0;
        $scope.tempPos = 1;
        $scope.workingPos = 2;

        $scope.duplicatedLocationNames = {};

        modelInterfaceArray.forEach(function (element) {
          requiredInterfaceFields.forEach(function (requiredField) {
            if (element._type === requiredField) {
              requiredInterfaceFields.splice(requiredField, 1);
            }
          });
        });

        $scope.registry = {check: false};

        //--------------TAGS--------------//
        if ($scope.clusterEntity.clusterModel.cluster.tags === "" ||
          $scope.clusterEntity.clusterModel.cluster.tags === undefined) {
          $scope.clusterEntity.clusterModel.cluster.tags = "";
          $scope.tagsArray = [{key: null, value: null}];
        } else {
          $scope.splitTags();
        }

        //-------------ACL----------------//
        if (!$scope.clusterEntity.clusterModel.cluster.ACL) {
          angular.copy(EntityModel.defaultValues.cluster.cluster.ACL, $scope.clusterEntity.clusterModel.cluster.ACL);
          $scope.clusterEntity.clusterModel.cluster.ACL._owner = $cookieStore.get('userToken').user;
          /*$scope.clusterEntity.clusterModel.cluster.ACL = {
           _owner: "", _group: "", _permission: ""
           };*/
        }

        //------------Location------------//
        modelLocationsArray.forEach(function (element) {
          requiredLocationFields.forEach(function (requiredField) {
            if (element._name === requiredField) {
              requiredLocationFields.splice(requiredField, 1);
            }
          });
        });
        requiredLocationFields.forEach(function (fieldToPush) {
          var fieldObject = {_name: fieldToPush, _path: ""};
          modelLocationsArray.push(fieldObject);
        });

        //----------Properties -------------//
        if (!$scope.clusterEntity.clusterModel.cluster.properties) {
          $scope.clusterEntity.clusterModel.cluster.properties = {property: [{_name: "", _value: ""}]};
        }

      }

      function checkInterfacesPositions(){
        $scope.readonlyPos = -1;
        $scope.writePos = -1;
        $scope.executePos = -1;
        $scope.workflowPos = -1;
        $scope.messagingPos = -1;
        $scope.registryPos = -1;
        $scope.clusterEntity.clusterModel.cluster.interfaces.interface.forEach(function(interf, index){
          if(interf._type == "readonly"){
            $scope.readonlyPos = index;
          }else if(interf._type == "write"){
            $scope.writePos = index;
          }else if(interf._type == "execute"){
            $scope.executePos = index;
          }else if(interf._type == "workflow"){
            $scope.workflowPos = index;
          }else if(interf._type == "messaging"){
            $scope.messagingPos = index;
          }else if(interf._type == "registry"){
            $scope.registryPos = index;
          }
        });
      }

      function checkLocationsPositions(){
        $scope.stagingPos = -1;
        $scope.tempPos = -1;
        $scope.workingPos = -1;
        $scope.clusterEntity.clusterModel.cluster.locations.location.forEach(function(location, index){
          if(location._name == "staging"){
            $scope.stagingPos = index;
          }else if(location._name == "temp"){
            $scope.tempPos = index;
          }else if(location._name == "working"){
            $scope.workingPos = index;
          }
        });
      }

      $scope.transformRegistry = function () {
        if ($scope.registry.check) {
          $scope.clusterEntity.clusterModel.cluster.interfaces.interface.push({_type: "registry", _endpoint: "", _version: ""});
          checkInterfacesPositions();
        }else {
          $scope.clusterEntity.clusterModel.cluster.interfaces.interface.forEach(function(interf, index){
            if(interf._type == "registry"){
              $scope.clusterEntity.clusterModel.cluster.interfaces.interface.splice(index, 1);
            }
          });
        }
      };

      function cleanModel() {

        if (!$scope.clusterEntity.clusterModel.cluster._description) {
          $scope.clusterEntity.clusterModel.cluster._description = '';
        }

        //if registry check is false backups the object and removes it from array
        $scope.transformRegistry();

        checkLocationsPositions();

        if ($scope.clusterEntity.clusterModel.cluster.properties
          && $scope.clusterEntity.clusterModel.cluster.properties.property
          && $scope.clusterEntity.clusterModel.cluster.properties.property.length > 0) {
          var lastOne = $scope.clusterEntity.clusterModel.cluster.properties.property.length - 1;
          if (
            !$scope.clusterEntity.clusterModel.cluster.properties.property[lastOne]._name || !$scope.clusterEntity.clusterModel.cluster.properties.property[lastOne]._value
          ) {
            $scope.removeProperty(lastOne);
            if ($scope.clusterEntity.clusterModel.cluster.properties.property.length < 1) {
              delete $scope.clusterEntity.clusterModel.cluster.properties;
            }
          }
        } else {
          delete $scope.clusterEntity.clusterModel.cluster.properties;
        }

        if ($scope.clusterEntity.clusterModel.cluster.locations
          && $scope.clusterEntity.clusterModel.cluster.locations.location
          && $scope.clusterEntity.clusterModel.cluster.locations.location.length > 0) {
          var lastOne = $scope.clusterEntity.clusterModel.cluster.locations.location.length - 1;
          if (
            !$scope.clusterEntity.clusterModel.cluster.locations.location[lastOne]._name || !$scope.clusterEntity.clusterModel.cluster.locations.location[lastOne]._path
          ) {
            $scope.removeLocation(lastOne);
            if ($scope.clusterEntity.clusterModel.cluster.locations.location.length < 1) {
              delete $scope.clusterEntity.clusterModel.cluster.locations;
            }
          }
        } else {
          delete $scope.clusterEntity.clusterModel.cluster.locations;
        }

        //deletes ACL if empty
        /*if ($scope.clusterEntity.clusterModel.cluster.ACL &&
         $scope.clusterEntity.clusterModel.cluster.ACL._owner === "") {
         delete $scope.clusterEntity.clusterModel.cluster.ACL;
         }*/
        //deletes tags if empty
        if (!$scope.clusterEntity.clusterModel.cluster.tags) {
          delete $scope.clusterEntity.clusterModel.cluster.tags;
        }
        //moves properties to be the last element if acl exists
        $scope.arrangeFieldsOrder();
      }

      $scope.arrangeFieldsOrder = function (xmlObj) {

        var BK,
          orderedObj = {};

        if (xmlObj) {
          BK = xmlObj.cluster;
        } else {
          BK = $scope.clusterEntity.clusterModel.cluster;
        }

        orderedObj._xmlns = 'uri:falcon:cluster:0.1';
        orderedObj._name = BK._name;
        orderedObj._description = BK._description;
        orderedObj._colo = BK._colo;

        if (BK.tags) {
          orderedObj.tags = BK.tags;
        }
        if (BK.interfaces) {
          orderedObj.interfaces = BK.interfaces;
        }
        if (BK.locations) {
          orderedObj.locations = BK.locations;
        }
        if (BK.ACL) {
          orderedObj.ACL = BK.ACL;
        }
        if (BK.properties) {
          orderedObj.properties = BK.properties;
        }

        delete $scope.clusterEntity.clusterModel.cluster;
        $scope.clusterEntity.clusterModel.cluster = orderedObj;

      };
      //--------------TAGS------------------------//

      $scope.convertTags = function () {
        var result = [];
        $scope.tagsArray.forEach(function (element) {
          if (element.key && element.value) {
            result.push(element.key + "=" + element.value);
          }
        });
        result = result.join(",");
        $scope.clusterEntity.clusterModel.cluster.tags = result;
      };
      $scope.splitTags = function () {
        $scope.tagsArray = [];
        if ($scope.clusterEntity.clusterModel.cluster.tags) {
          $scope.clusterEntity.clusterModel.cluster.tags.split(",").forEach(function (fieldToSplit) {
            var splittedString = fieldToSplit.split("=");
            $scope.tagsArray.push({key: splittedString[0], value: splittedString[1]});
          });
        }

      };
      $scope.addTag = function () {
        $scope.tagsArray.push({key: null, value: null});
      };
      $scope.removeTag = function (index) {
        if (!isNaN(index) && index !== undefined && index !== null) {
          $scope.tagsArray.splice(index, 1);
          $scope.convertTags();
        }
      };

      //-------------------------------------//
      //----------LOCATION-------------------//
      $scope.validateLocations = function () {
        //validate staging, temp & working
        var stagingFounded = false;
        var tempFounded = false;
        var workingFounded = false;
        var stagingLoc;
        var workingLoc;
        $scope.clusterEntity.clusterModel.cluster.locations.location.forEach(function(location, index){
          if(location._name == "staging"){
            stagingFounded = true;
            stagingLoc = location._path;
          }
          if(location._name == "temp"){
            tempFounded = true;
          }
          if(location._name == "working"){
            workingFounded = true;
            workingLoc = location._path;
          }
        });
        if(!stagingFounded){
          $scope.clusterEntity.clusterModel.cluster.locations.location.push({_name: "staging", _path: ""});
        }
        if(!tempFounded){
          $scope.clusterEntity.clusterModel.cluster.locations.location.push({_name: "temp", _path: ""});
        }
        if(!workingFounded){
          $scope.clusterEntity.clusterModel.cluster.locations.location.push({_name: "working", _path: ""});
        }
        if (stagingLoc && workingLoc && stagingLoc == workingLoc) {
          $scope.locationsEqualError = true;
        } else {
          $scope.locationsEqualError = false;
        }
        //validate duplicates
        var duplicates = {};
        $scope.clusterEntity.clusterModel.cluster.locations.location.forEach(function(location, index){
          if(!duplicates[location._name]){
            duplicates[location._name] = 0;
          }
          duplicates[location._name]++;
        });
        $scope.duplicatedLocation = false;
        for(var location in duplicates) {
          if(duplicates[location] > 1){
            $scope.duplicatedLocation = true;
            $scope.duplicatedLocationNames[location] = true;
          }else{
            $scope.duplicatedLocationNames[location] = false;
          }
        }
      };

      $scope.addLocation = function () {
        var lastOneIndex = $scope.clusterEntity.clusterModel.cluster.locations.location.length - 1;
        var addedIndex = lastOneIndex+1;
        $scope.emptyNewLocation = false;

        $scope.validateLocations();

        if (!$scope.clusterEntity.clusterModel.cluster.locations.location[lastOneIndex]._name || !$scope.clusterEntity.clusterModel.cluster.locations.location[lastOneIndex]._path) {
          $scope.emptyNewLocation = true;
        } else if(!$scope.duplicatedLocation){
          $scope.clusterEntity.clusterModel.cluster.locations.location.push({_name: "", _path: ""});
        }

        //$scope.$watch("clusterEntity.clusterModel.cluster.locations.location["+addedIndex+"]._name",
        //  function( newValue, oldValue ) {
        //    $scope.validateLocations();
        //  }
        //);
      };

      $scope.removeLocation = function (index) {
        if (!isNaN(index) && index !== undefined && index !== null) {
          $scope.clusterEntity.clusterModel.cluster.locations.location.splice(index, 1);
          $scope.validateLocations();
        }
      };

      //-----------PROPERTIES----------------//
      $scope.addProperty = function () {
        var lastOne = $scope.clusterEntity.clusterModel.cluster.properties.property.length - 1;
        if ($scope.clusterEntity.clusterModel.cluster.properties.property[lastOne]._name && $scope.clusterEntity.clusterModel.cluster.properties.property[lastOne]._value) {
          $scope.clusterEntity.clusterModel.cluster.properties.property.push({_name: "", _value: ""});
          // $scope.tempPropModel = { _name: "", _value: ""};
        }
      };
      $scope.removeProperty = function (index) {
        if (index !== null && $scope.clusterEntity.clusterModel.cluster.properties.property[index]) {
          $scope.clusterEntity.clusterModel.cluster.properties.property.splice(index, 1);
        }
      };

      //--------------------------------------//
      $scope.goSummaryStep = function (formInvalid) {
        SpinnersFlag.show = true;
        $scope.validateLocations();
        if ($scope.locationsEqualError || $scope.duplicatedLocation) {
          SpinnersFlag.show = false;
          return;
        }
        if (!$scope.validations.nameAvailable || formInvalid) {
          validationService.displayValidations.show = true;
          validationService.displayValidations.nameShow = true;
          SpinnersFlag.show = false;
          return;
        }
        cleanModel();
        $scope.secondStep = true;
        $state.go("forms.cluster.summary");
        $timeout(function () {
          angular.element('.nextBtn').trigger('focus');
        }, 500);

      };
      $scope.goGeneralStep = function () {
        SpinnersFlag.backShow = true;
        $scope.secondStep = false;
        validationService.displayValidations.show = false;
        validationService.displayValidations.nameShow = false;
        $scope.validations.nameAvailable = true;
        if (!$scope.clusterEntity.clusterModel.cluster.tags) {
          $scope.clusterEntity.clusterModel.cluster.tags = "";
        }
        if (!$scope.clusterEntity.clusterModel.cluster.properties) {
          $scope.clusterEntity.clusterModel.cluster.properties = {property: [{_name: "", _value: ""}]};
        }
        var lastLocationIndex = $scope.clusterEntity.clusterModel.cluster.locations.location.length - 1;
        if ($scope.clusterEntity.clusterModel.cluster.locations.location[lastLocationIndex]._name !== "") {
          $scope.addLocation();
        }
      };
      $scope.saveCluster = function () {
        SpinnersFlag.show = true;
        $scope.saveModelBuffer();
        Falcon.logRequest();
        Falcon.postSubmitEntity($scope.jsonString, "cluster").success(function (response) {
          $scope.skipUndo = true;
          Falcon.logResponse('success', response, false);
          $state.go('main');
        }).error(function (err) {
          SpinnersFlag.show = false;
          Falcon.logResponse('error', err, false);
          angular.element('body, html').animate({scrollTop: 0}, 300);
        });
      };

      //--------------------------------------//
      //----------XML preview-----------------//

      $scope.xmlPreview.editXML = function () {
        $scope.xmlPreview.edit = !$scope.xmlPreview.edit;
      };

      $scope.showInPreview = function () {
        var xmlStr = X2jsService.json2xml_str(angular.copy($scope.clusterEntity.clusterModel));
        $scope.prettyXml = X2jsService.prettifyXml(xmlStr);
        $scope.xml = xmlStr;
      };

      $scope.transformBack = function () {
        try {
          var xmlObj = X2jsService.xml_str2json($scope.prettyXml);

          if (!xmlObj.cluster.ACL || !xmlObj.cluster.ACL._owner || !xmlObj.cluster.ACL._group || !xmlObj.cluster.ACL._permission) {
            xmlObj.cluster.ACL = angular.copy(EntityModel.defaultValues.cluster.cluster.ACL);
          }

          checkInterfacesPositions();
          if($scope.registryPos == -1 || !$scope.clusterEntity.clusterModel.cluster.interfaces.interface[$scope.registryPos]){
            $scope.registry.check = false;
          }else{
            $scope.registry.check = true;
          }

          checkLocationsPositions();
          $scope.validateLocations();

          $scope.arrangeFieldsOrder(xmlObj);

          if ($scope.clusterEntity.clusterModel.cluster.properties && $scope.clusterEntity.clusterModel.cluster.properties.property[0] === '') {
            $scope.clusterEntity.clusterModel.cluster.properties.property = [];
          }
        }
        catch (err) {
          console.log('xml malformed');
        }
      };

      $scope.saveModelBuffer = function () {
        $scope.jsonString = angular.toJson($scope.clusterEntity.clusterModel);
        //goes back to js to have x2js parse it correctly
        $scope.jsonString = JSON.parse($scope.jsonString);
        $scope.jsonString = X2jsService.json2xml_str($scope.jsonString);
      };

      function xmlPreviewCallback() {
        $scope.validateLocations();
        if ($state.current.name !== 'forms.cluster.general' && $state.current.name !== 'forms.cluster.summary') {
          $interval.cancel(refresher);
        }
        if (!$scope.xmlPreview.edit) {
          if ($scope.clusterEntity.clusterModel.cluster.tags !== undefined) {
            $scope.convertTags();
          }
          $scope.showInPreview();
        } else {
          $scope.splitTags();
          $scope.transformBack();
        }
      }

      var refresher = $interval(xmlPreviewCallback, 1000);

      $scope.skipUndo = false;
      $scope.$on('$destroy', function () {
        var model = angular.copy($scope.clusterEntity.clusterModel.cluster),
          defaultModel = angular.toJson(EntityModel.defaultValues.cluster.cluster);

        //model.interfaces.interface.forEach(function (item, index) {
        //  if (item._type === "registry" && item._endpoint === "" && item._version === "") {
        //    model.interfaces.interface.splice(index, 1);
        //  }
        //});

        model = angular.toJson(model);

        if (!$scope.skipUndo && !angular.equals(model, defaultModel)) {
          $interval.cancel(refresher);
          $scope.$parent.cancel('cluster', $rootScope.previousState);
        }
      });

      //------------init------------//
      normalizeModel();
    }
  ]);
})();




