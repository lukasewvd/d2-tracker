/* global moment, angular, directive, dhis2, selection */

'use strict';

/* Directives */

var d2Directives = angular.module('d2Directives', [])


.directive('selectedOrgUnit', function ($timeout, $location) {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var orgUnitFromUrl;
            $("#orgUnitTree").one("ouwtLoaded", function (event, ids, names) {
                if (dhis2.tc && dhis2.tc.metaDataCached) {
                    $timeout(function () {
                        scope.treeLoaded = true;
                        scope.$apply();
                    });
                    selection.responseReceived();
                }
                else {
                    console.log('Finished loading orgunit tree');
                    orgUnitFromUrl = ($location.search()).ou;
                    $("#orgUnitTree").addClass("disable-clicks"); //Disable ou selection until meta-data has downloaded
                    $timeout(function () {
                        scope.treeLoaded = true;
                        scope.$apply();
                    });
                    downloadMetaData();
                }
            });

            //listen to user selection, and inform angular
            selection.setListenerFunction(setSelectedOu, true);
            function setSelectedOu(ids, names) {
                var ou = {id: ids[0], displayName: names[0]};
                if(orgUnitFromUrl && ou.id !== orgUnitFromUrl) {
                    selection.setOrgUnitFromURL(orgUnitFromUrl);
                    orgUnitFromUrl = null;
                } else {
                    $timeout(function () {
                        scope.selectedOrgUnit = ou;
                        scope.$apply();
                    });
                }
            }
        }
    };
})

.directive('d2SetFocus', function ($timeout) {

    return {
        scope: { trigger: '@d2SetFocus' },
        link: function(scope, element) {
            scope.$watch('trigger', function(value) {
                if(value === "true") {
                    $timeout(function() {
                        element[0].focus();
                    });
                }
            });
        }
    };
})

.directive('d2LeftBar', function () {

    return {
        restrict: 'E',
        templateUrl: 'views/left-bar.html',
        link: function (scope, element, attrs) {

            $("#searchIcon").click(function () {
                $("#searchSpan").toggle();
                $("#searchField").focus();
            });

            $("#searchField").autocomplete({
                source: "../dhis-web-commons/ouwt/getOrganisationUnitsByName.action",
                select: function (event, ui) {
                    $("#searchField").val(ui.item.value);
                    selection.findByName();
                }
            });
        }
    };
})

.directive('d2OnBlurChange', function ($parse) {
    return function (scope, element, attr) {
        var fn = $parse(attr['d2OnBlurChange']);
        var hasChanged = false;
        element.on('change', function (event) {
            hasChanged = true;
        });
        
        element.on('blur', function (event) {
            if (hasChanged) {
                scope.$apply(function () {
                    fn(scope, {$event: event});
                });
                hasChanged = false;
            }
        });
    };
})

.directive('d2OnEnterBlur', function() {  
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event) {
            if(event.which === 13) {
                element.blur();
                event.preventDefault();
            }
        });
    };
})

.directive('blurOrChange', function () {

    return function (scope, elem, attrs) {
        elem.calendarsPicker({
            onSelect: function () {
                scope.$apply(attrs.blurOrChange);
                $(this).change();
            }
        }).change(function () {
            scope.$apply(attrs.blurOrChange);
        });
    };
})

.directive('d2Enter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    scope.$eval(attrs.d2Enter);
                });
                event.preventDefault();
            }
        });
    };
})

.directive('d2PopOver', function ($compile, $templateCache, $translate) {

    return {
        restrict: 'EA',
        scope: {
            content: '=',
            program: '=',
            title: '@details',
            template: "@template",
            placement: "@placement",
            trigger: "@trigger"
        },
        link: function (scope, element) {
            var content, program;
            if (scope.content) {
                content = $templateCache.get(scope.template);
                content = $compile(content)(scope);
                if( scope.program ){
                    program = $templateCache.get(scope.template);
                    program = $compile(program)(scope);
                }
                var options = {
                    content: content,
                    program: program,
                    placement: scope.placement ? scope.placement : 'auto',
                    trigger: scope.trigger ? scope.trigger : 'hover',
                    html: true,
                    title: $translate.instant('_details')
                };
                element.popover(options);

                $('body').on('click', function (e) {
                    if (!element[0].contains(e.target)) {
                        element.popover('hide');
                    }
                });
            }
        }
    };
})

.directive('d2Sortable', function ($timeout) {

    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element.sortable({
                connectWith: ".connectedSortable",
                placeholder: "ui-state-highlight",
                tolerance: "pointer",
                handle: '.handle',
                change: function (event, ui) {
                    getSortedItems(ui);
                },
                receive: function (event, ui) {
                    getSortedItems(ui);
                }
            });

            var getSortedItems = function (ui) {
                var biggerWidgets = $("#biggerWidget").sortable("toArray");
                var smallerWidgets = $("#smallerWidget").sortable("toArray");
                var movedIsIdentifeid = false;

                //look for the moved item in the bigger block
                for (var i = 0; i < biggerWidgets.length && !movedIsIdentifeid; i++) {
                    if (biggerWidgets[i] === "") {
                        biggerWidgets[i] = ui.item[0].id;
                        movedIsIdentifeid = true;
                    }
                }

                //look for the moved item in the smaller block
                for (var i = 0; i < smallerWidgets.length && !movedIsIdentifeid; i++) {
                    if (smallerWidgets[i] === "") {
                        smallerWidgets[i] = ui.item[0].id;
                        movedIsIdentifeid = true;
                    }
                }
                var layout = {smallerWidgets: smallerWidgets, biggerWidgets: biggerWidgets};
                scope.applyWidgetsOrderChange( layout );
            };
        }
    };
})

.directive('serversidePaginator', function factory() {

    return {
        restrict: 'E',
        controller: function ($scope, Paginator) {
            $scope.paginator = Paginator;
        },
        templateUrl: './templates/serverside-pagination.html'
    };
})

.directive('d2CustomDataEntryForm', function ($compile) {
    return{
        restrict: 'E',
        link: function (scope, elm, attrs) {
            scope.$watch('customDataEntryForm', function () {
                if (angular.isObject(scope.customDataEntryForm)) {
                    elm.html(scope.customDataEntryForm.htmlCode);
                    $compile(elm.contents())(scope);
                }
            });
        }
    };
})

.directive('d2CustomRegistrationForm', function ($compile) {
    return{
        restrict: 'E',
        link: function (scope, elm, attrs) {
            scope.$watch('customRegistrationForm', function () {
                if (angular.isObject(scope.customRegistrationForm)) {
                    elm.html(scope.customRegistrationForm.htmlCode);
                    $compile(elm.contents())(scope);
                }
            });
        }
    };
})

/* TODO: this directive access an element #contextMenu somewhere in the document. Looks like it has to be rewritten */
.directive('d2ContextMenu', function () {

    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var contextMenu = $("#contextMenu");

            element.click(function (e) {
                var menuHeight = contextMenu.height();
                var menuWidth = contextMenu.width();
                var winHeight = $(window).height();
                var winWidth = $(window).width();

                var pageX = e.pageX;
                var pageY = e.pageY;

                contextMenu.show();

                if ((menuWidth + pageX) > winWidth) {
                    pageX -= menuWidth;
                }

                if ((menuHeight + pageY) > winHeight) {
                    pageY -= menuHeight;

                    if (pageY < 0) {
                        pageY = e.pageY;
                    }
                }

                contextMenu.css({
                    left: pageX,
                    top: pageY
                });

                return false;
            });

            contextMenu.on("click", "a", function () {
                contextMenu.hide();
            });

            $(document).click(function () {
                contextMenu.hide();
            });
        }
    };
})

.directive('d2Date', function (CalendarService, $parse) {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attrs, ctrl) {
            var calendarSetting = CalendarService.getSetting();
            var dateFormat = 'yyyy-mm-dd';
            if (calendarSetting.keyDateFormat === 'dd-MM-yyyy') {
                dateFormat = 'dd-mm-yyyy';
            }

            var minDate = $parse(attrs.minDate)(scope);
            var maxDate = $parse(attrs.maxDate)(scope);
            var calendar = $.calendars.instance(calendarSetting.keyCalendar);
            var pickerClass = attrs.pickerClass;

            var initializeDatePicker = function( sDate, eDate ){
                element.calendarsPicker({
                    pickerClass: pickerClass,
                    changeMonth: true,
                    dateFormat: dateFormat,
                    yearRange: '-120:+30',
                    minDate: sDate,
                    maxDate: eDate,
                    calendar: calendar,
                    duration: "fast",
                    showAnim: "",
                    renderer: $.calendars.picker.themeRollerRenderer,
                    onSelect: function () {
                        $(this).change();
                    },
                    onClose:function(){
                        $(this).blur();
                    }
                }).change(function () {
                    ctrl.$setViewValue(this.value);
                    this.focus();
                    scope.$apply();
                });
            };

            initializeDatePicker(minDate, maxDate);

            scope.$watch(attrs.minDate, function(value){
                element.calendarsPicker('destroy');
                initializeDatePicker( value, $parse(attrs.maxDate)(scope));
            });

            scope.$watch(attrs.maxDate, function(value){
                element.calendarsPicker('destroy');
                initializeDatePicker( $parse(attrs.minDate)(scope), value);
            });
        }
    };
})

.directive('d2FileInput', function($translate, DHIS2EventService, DHIS2EventFactory, FileService, NotificationService){

    return {
        restrict: "A",
        scope: {
            d2FileInputList: '=',
            d2FileInput: '=',
            d2FileInputName: '=',
            d2FileInputCurrentName: '=',
            d2FileInputPs: '='
        },
        link: function (scope, element, attrs) {

            var de = attrs.inputFieldId;

            var updateModel = function () {

                var update = scope.d2FileInput.event &&  scope.d2FileInput.event !== 'SINGLE_EVENT' ? true : false;

                FileService.upload(element[0].files[0]).then(function(data){

                    if(data && data.status === 'OK' && data.response && data.response.fileResource && data.response.fileResource.id && data.response.fileResource.name){
                        scope.d2FileInput[de] = data.response.fileResource.id;
                        scope.d2FileInputCurrentName[de] = data.response.fileResource.name;
                        if(!scope.d2FileInputName[scope.d2FileInput.event]){
                            scope.d2FileInputName[scope.d2FileInput.event] = {};
                        }
                        scope.d2FileInputName[scope.d2FileInput.event][de] = data.response.fileResource.name;
                        if( update ){
                            var updatedSingleValueEvent = {event: scope.d2FileInput.event, dataValues: [{value: data.response.fileResource.id, dataElement:  de}]};
                            var updatedFullValueEvent = DHIS2EventService.reconstructEvent(scope.d2FileInput, scope.d2FileInputPs.programStageDataElements);
                            DHIS2EventFactory.updateForSingleValue(updatedSingleValueEvent, updatedFullValueEvent).then(function(data){
                                scope.d2FileInputList = DHIS2EventService.refreshList(scope.d2FileInputList, scope.d2FileInput);
                            });
                        }
                    }
                    else{
                        NotificationService.showNotifcationDialog($translate.instant("error"),
                            $translate.instant("file_upload_failed"));
                    }

                });
            };
            element.bind('change', updateModel);
        }
    };
})

.directive('d2FileInputDelete', function($parse, $timeout, $translate, FileService, NotificationService){

    return {
        restrict: "A",
        link: function (scope, element, attrs) {
            var valueGetter = $parse(attrs.d2FileInputDelete);
            var nameGetter = $parse(attrs.d2FileInputName);
            var nameSetter = nameGetter.assign;

            if(valueGetter(scope)) {
                FileService.get(valueGetter(scope)).then(function(data){
                    if(data && data.name && data.id){
                        $timeout(function(){
                            nameSetter(scope, data.name);
                            scope.$apply();
                        });
                    }
                    else{
                        NotificationService.showNotifcationDialog($translate.instant("error"),
                            $translate.instant("file_missing"));
                    }
                });
            }
        }
    };
})

.directive('d2Audit', function (CurrentSelection, MetaDataFactory ) {
    return {
        restrict: 'E',
        template: '<span class="hideInPrint audit-icon" title="{{\'audit_history\' | translate}}" data-ng-click="showAuditHistory()">' +
        '<i class="glyphicon glyphicon-user""></i>' +
        '</span>',
        scope: {
            eventId: '@',
            type: '@',
            nameIdMap: '='
        },
        controller: function ($scope, $modal) {
            $scope.showAuditHistory = function () {

                var openModal = function( ops ){
                    $modal.open({
                        templateUrl: "./templates/audit-history.html",
                        controller: "AuditHistoryController",
                        resolve: {
                            eventId: function () {
                                return $scope.eventId;
                            },
                            dataType: function () {
                                return $scope.type;
                            },
                            nameIdMap: function () {
                                return $scope.nameIdMap;
                            },
                            optionSets: function(){
                                return ops;
                            }
                        }
                    });
                };

                var optionSets = CurrentSelection.getOptionSets();
                if(!optionSets){
                    optionSets = [];
                    MetaDataFactory.getAll('optionSets').then(function(optionSets){
                        angular.forEach(optionSets, function(optionSet){
                            optionSets[optionSet.id] = optionSet;
                        });
                        CurrentSelection.setOptionSets(optionSets);
                        openModal(optionSets);
                    });
                }
                else{
                    openModal(optionSets);
                }
            };
        }
    };
})

.directive('d2RadioButton', function (){
    return {
        restrict: 'E',
        templateUrl: './templates/radio-button.html',
        scope: {
            required: '=dhRequired',
            value: '=dhValue',
            disabled: '=dhDisabled',
            name: '@dhName',
            customOnClick: '&dhClick',
            currentElement: '=dhCurrentElement',
            event: '=dhEvent',
            id: '=dhId'
        },
        controller: [
            '$scope',
            '$element',
            '$attrs',
            '$q',
            'CommonUtils',
            function($scope, $element, $attrs, $q, CommonUtils){

                $scope.status = "";
                $scope.clickedButton = "";

                $scope.valueClicked = function (buttonValue){

                    $scope.clickedButton = buttonValue;

                    var originalValue = $scope.value;
                    var tempValue = buttonValue;
                    if($scope.value === buttonValue){
                        tempValue = "";
                    }

                    if(angular.isDefined($scope.customOnClick)){
                        var promise = $scope.customOnClick({value: tempValue});
                        if(angular.isDefined(promise) && angular.isDefined(promise.then)){
                            promise.then(function(status){
                                if(angular.isUndefined(status) || status !== "notSaved"){
                                    $scope.status = "saved";
                                }
                                $scope.value = tempValue;
                            }, function(){
                                $scope.status = "error";
                                $scope.value = originalValue;
                            });
                        }
                        else if(angular.isDefined(promise)){
                            if(promise === false){
                                $scope.value = originalValue;
                            }
                            else {
                                $scope.value = tempValue;
                            }
                        }
                        else{
                            $scope.value = tempValue;
                        }
                    }
                    else{
                        $scope.value = tempValue;
                    }
                };

                $scope.getDisabledValue = function(inValue){
                    return CommonUtils.displayBooleanAsYesNo(inValue);
                };

                $scope.getDisabledIcon = function(inValue){
                    if(inValue === true || inValue === "true"){
                        return "fa fa-check";
                    }
                    else if(inValue === false || inValue === "false"){
                        return "fa fa-times";
                    }
                    return '';
                }

            }],
        link: function (scope, element, attrs) {

            scope.radioButtonColor = function(buttonValue){

                if(scope.value !== ""){
                    if(scope.status === "saved"){
                        if(angular.isUndefined(scope.currentElement) || (scope.currentElement.id === scope.id && scope.currentElement.event === scope.event)){
                            if(scope.clickedButton === buttonValue){
                                return 'radio-save-success';
                            }
                        }
                        //different solution with text chosen
                        /*else if(scope.status === "error"){
                         if(scope.clickedButton === buttonValue){
                         return 'radio-save-error';
                         }
                         }*/
                    }
                }
                return 'radio-white';
            };

            scope.errorStatus = function(){

                if(scope.status === 'error'){
                    if(angular.isUndefined(scope.currentElement) || (scope.currentElement.id === scope.id && scope.currentElement.event === scope.event)){
                        return true;
                    }
                }
                return false;
            };

            scope.radioButtonImage = function(buttonValue){

                if(angular.isDefined(scope.value)){
                    if(scope.value === buttonValue && buttonValue === "true"){
                        return 'fa fa-stack-1x fa-check';
                    }
                    else if(scope.value === buttonValue && buttonValue === "false"){
                        return 'fa fa-stack-1x fa-times';
                    }
                }
                return 'fa fa-stack-1x';
            };
        }
    };
})

.directive('d2Radio', function(  DateUtils ){
    return {
        restrict: 'EA',            
        templateUrl: "./templates/radio-input.html",
        scope: {            
            id: '=',
            name: '@d2Name',
            d2Object: '=',
            d2ValueSaved: '=',
            d2Disabled: '=',
            d2Required: '=',
            d2Options: '=',
            d2CallbackFunction: '&d2Function'
        },
        link: function (scope, element, attrs) {
            
        },
        controller: function($scope){
            
            $scope.$watch('d2Object',function(newObj, oldObj){
                if( angular.isObject(newObj) ){
                    $scope.d2Object = newObj;
                    $scope.model = {radio: $scope.d2Object[$scope.id] ? $scope.d2Object[$scope.id] : null};
                }                
            });

            $scope.model = {radio: $scope.d2Object[$scope.id] ? $scope.d2Object[$scope.id] : null};
            
            $scope.saveValue = function( value ){
                $scope.model.radio = value;
                if( $scope.model.radio === $scope.d2Object[$scope.id] ){
                    $scope.model.radio = null;
                }
                
                $scope.d2Object[$scope.id] = $scope.model.radio;
                if( angular.isDefined( $scope.d2CallbackFunction ) ){
                    $scope.d2CallbackFunction({value: $scope.model.radio});
                }
            };
        }
    };
})

.directive('dhis2Deselect', function ($document) {
    return {
        restrict: 'A',
        scope: {
            onDeselected: '&dhOnDeselected',
            id: '@dhId',
            preSelected: '=dhPreSelected',
            abortDeselect: '&dhAbortDeselect'
        },
        controller: [
            '$scope',
            '$element',
            '$attrs',
            '$q',
            function($scope, $element, $attrs, $q){

                $scope.documentEventListenerSet = false;
                $scope.elementClicked = false;

                $element.on('click', function(event) {

                    $scope.elementClicked = true;
                    if($scope.documentEventListenerSet === false){
                        $document.on('click', $scope.documentClick);
                        $scope.documentEventListenerSet = true;
                    }
                });

                $scope.documentClick = function(event){
                    var modalPresent = $(".modal-backdrop").length > 0;
                    var calendarPresent = $(".calendars-popup").length > 0;
                    var calendarPresentInEvent = $(event.target).parents(".calendars-popup").length > 0;
                    if($scope.abortDeselect()){
                        $document.off('click', $scope.documentClick);
                        $scope.documentEventListenerSet = false;
                    }else if($scope.elementClicked === false &&
                        modalPresent === false &&
                        calendarPresent === false &&
                        calendarPresentInEvent === false){
                        $scope.onDeselected({id:$scope.id});
                        $scope.$apply();
                        $document.off('click', $scope.documentClick);
                        $scope.documentEventListenerSet = false;
                    }
                    $scope.elementClicked = false;
                };

                if(angular.isDefined($scope.preSelected) && $scope.preSelected === true){
                    $document.on('click', $scope.documentClick);
                    $scope.documentEventListenerSet = true;
                }

            }],
        link: function (scope, element, attrs) {
        }
    };
})

.directive('d2OrgUnitTree', function(OrgUnitFactory){
    return {
        restrict: 'EA',            
        templateUrl: "./templates/orgunit-input.html",
        scope: {            
            selectedOrgUnitId: '@',
            id: '@',
            d2Object: '=',
            d2Disabled: '=',
            d2Required: '=',
            d2CallbackFunction: '&d2Function',
            d2OrgunitNames: '='
        },
        link: function (scope, element, attrs) {
        },
        controller: function($scope, $modal){
            
            if( !$scope.d2OrgUnitNames ){
                $scope.d2OrgUnitNames = {};
            }

            $scope.$watch('d2Object',function(newObj, oldObj){
                if( angular.isObject(newObj) ){
                    $scope.d2Object = newObj;
                    fetchOu();
                }
            });
            
            function fetchOu(){
                if( $scope.id && $scope.d2Object[$scope.id] ){                
                    OrgUnitFactory.getFromStoreOrServer($scope.d2Object[$scope.id]).then(function (response) {
                        if(response && response.n) {
                            $scope.d2OrgunitNames[$scope.d2Object[$scope.id]] = response.n;
                        }
                    });
                }
            }
            
            fetchOu();

            $scope.showOrgUnitTree = function( dataElementId ){
                
                var modalInstance = $modal.open({
                    templateUrl: "./templates/orgunit-tree.html",
                    controller: 'OrgUnitTreeController',
                    resolve: {
                        orgUnitId: function(){
                            return $scope.d2Object[dataElementId] ? $scope.d2Object[dataElementId] : $scope.selectedOrgUnitId;
                        },
                        orgUnitNames: function(){
                            return $scope.d2OrgunitNames;
                        }
                    }
                });

                modalInstance.result.then(function ( res ) {
                    if( res && res.selected && res.selected.id ){
                        $scope.d2Object[dataElementId] = res.selected.id;
                        $scope.d2OrgunitNames = res.names;
                        if( angular.isDefined( $scope.d2CallbackFunction ) ){
                            $scope.d2CallbackFunction($scope.d2Object, dataElementId);
                        }                            
                    }                    
                }, function () {
                });
            };
            
            $scope.removeSelectedOrgUnit = function( dataElementId ){
                delete $scope.d2Object[dataElementId];
                if( angular.isDefined( $scope.d2CallbackFunction ) ){
                    $scope.d2CallbackFunction($scope.d2Object, dataElementId);
                }
            };
        }
        
    };
})

.directive('d2Map', function(){
    return {
        restrict: 'E',            
        templateUrl: "./templates/coordinate-input.html",
        scope: {
            id: '@',            
            d2Object: '=',            
            d2CallbackFunction: '&d2Function',
            d2CallbackFunctionParamText: '=d2FunctionParamText',
            d2CallbackFunctionParamCoordinate: '=d2FunctionParamCoordinate',
            d2Disabled: '=',
            d2Required: '=',
            d2LatSaved: '=',
            d2LngSaved: '=',
            d2CoordinateFormat: '='
        },
        controller: function($scope, $modal, $filter, $translate, DHIS2COORDINATESIZE, NotificationService){

            $scope.$watch('d2Object',function(newObj, oldObj){
                if( angular.isObject(newObj) ){
                    $scope.d2Object = newObj;
                    $scope.coordinateObject = angular.copy( $scope.d2Object );
                    processCoordinate();
                }
            });

            $scope.coordinateObject = angular.copy( $scope.d2Object );
            
            function processCoordinate(){
            	if( $scope.d2CoordinateFormat === 'TEXT' ){        
                    if( $scope.d2Object[$scope.id] && $scope.d2Object[$scope.id] !== ''){                        
                        var coordinatePattern = /^\[-?\d+\.?\d+\,-?\d+\.?\d+\]$/;
                        if( !coordinatePattern.test( $scope.d2Object[$scope.id] ) ){
                            NotificationService.showNotifcationDialog($translate.instant('error'), $translate.instant('invalid_coordinate_format') + ":  " + $scope.d2Object[$scope.id] );
                        }
                        
                    	var coordinates = $scope.d2Object[$scope.id].slice(1,-1).split( ",");                        
                    	if( !dhis2.validation.isNumber( coordinates[0] ) || !dhis2.validation.isNumber( coordinates[0] ) ){
                            NotificationService.showNotifcationDialog($translate.instant('error'), $translate.instant('invalid_coordinate_format') + ":  " + $scope.d2Object[$scope.id] );
                    	}
                        $scope.coordinateObject.coordinate = {latitude: parseFloat(coordinates[1]), longitude: parseFloat(coordinates[0])};
                    }
                    else{
                        $scope.coordinateObject.coordinate = {};
                    }
                }            
                if( !$scope.coordinateObject.coordinate ){
                    $scope.coordinateObject.coordinate = {};
                }
            };
            
            processCoordinate();
            
            $scope.showMap = function(){                
                
            	processCoordinate();            	
                            
                var modalInstance = $modal.open({
                    templateUrl: './templates/map.html',
                    controller: 'MapController',
                    windowClass: 'modal-map-window',
                    resolve: {
                        location: function () {
                            return {lat: $scope.coordinateObject.coordinate.latitude, lng:  $scope.coordinateObject.coordinate.longitude};
                        }
                    }
                });
                
                modalInstance.result.then(function (location) {                    
                    if(angular.isObject(location)){
                    	
                    	if( dhis2.validation.isNumber( location.lat ) ){
                    		location.lat = parseFloat( $filter('number')(location.lat, DHIS2COORDINATESIZE) );
                    	}
                    	
                    	if( dhis2.validation.isNumber( location.lng ) ){
                    		location.lng = parseFloat( $filter('number')(location.lng, DHIS2COORDINATESIZE) );
                    	}
                    	
                        $scope.coordinateObject.coordinate.latitude = location.lat;
                        $scope.coordinateObject.coordinate.longitude = location.lng;                        

                        if( $scope.d2CoordinateFormat === 'TEXT' ){                        
                            $scope.d2Object[$scope.id] = '[' + location.lng + ',' + location.lat + ']';
                            if( angular.isDefined( $scope.d2CallbackFunction ) ){
                                $scope.d2CallbackFunction( {arg1: $scope.d2CallbackFunctionParamText} );
                            }
                        }
                        else{
                            $scope.d2Object.coordinate.latitude = location.lat;
                            $scope.d2Object.coordinate.longitude = location.lng;
                            if( angular.isDefined( $scope.d2CallbackFunction ) ){
                                $scope.d2CallbackFunction( {arg1: $scope.d2CallbackFunctionParamCoordinate} );
                            }
                        }                                                
                    }
                }, function () {
                });
            };
            
            $scope.coordinateInteracted = function (field, form) {        
                var status = false;
                if (field) {
                    if(angular.isDefined(form)){
                        status = form.$submitted || field.$dirty;
                    }
                    else {
                        status = $scope.coordinateForm.$submitted || field.$dirty;
                    }            
                }
                return status;
            };
            
            $scope.saveD2Coordinate = function(){
                
                var saveCoordinate = function( format, param ){
                    if( !$scope.coordinateObject.coordinate.longitude && !$scope.coordinateObject.coordinate.latitude ){
                        if( format === 'COORDINATE' ){
                            $scope.d2Object.coordinate = {latitude: "", longitude: ""};
                        }
                        else{
                            $scope.d2Object[$scope.id] = '';
                        }
                        $scope.d2CallbackFunction( {arg1: param} );                            
                    }
                    else{
                        if( $scope.coordinateObject.coordinate.longitude && $scope.coordinateObject.coordinate.latitude ){
                            $scope.d2CallbackFunction( {arg1: param} );
                        }
                    }                    
                };
                
                if( angular.isDefined( $scope.d2CallbackFunction ) ){
                	
                	if( dhis2.validation.isNumber( $scope.coordinateObject.coordinate.latitude ) ){
                		$scope.coordinateObject.coordinate.latitude = parseFloat( $filter('number')($scope.coordinateObject.coordinate.latitude, DHIS2COORDINATESIZE) );
                	}
                	
                	if( dhis2.validation.isNumber( $scope.coordinateObject.coordinate.longitude ) ){
                		$scope.coordinateObject.coordinate.longitude = parseFloat( $filter('number')($scope.coordinateObject.coordinate.longitude, DHIS2COORDINATESIZE) );
                	}
                	
                    if( $scope.d2CoordinateFormat === 'TEXT' ){                    
                        $scope.d2Object[$scope.id] = '[' + $scope.coordinateObject.coordinate.longitude + ',' + $scope.coordinateObject.coordinate.latitude + ']';                        
                        saveCoordinate( 'TEXT',  $scope.prStDe);
                    }
                    else{
                        $scope.d2Object.coordinate.latitude = $scope.coordinateObject.coordinate.latitude;
                        $scope.d2Object.coordinate.longitude = $scope.coordinateObject.coordinate.longitude;
                        
                        saveCoordinate( 'COORDINATE',  $scope.d2CallbackFunctionParam );                        
                    }
                }
            };    
        },
        link: function (scope, element, attrs) {
            
        }
    };
})

.directive('d2DateTime', function() {
    return {
        restrict: 'E',            
        templateUrl: "./templates/date-time-input.html",       
        scope: {      
            datetimeModel: '=',      
            datetimeRequired: '=',
            datetimeDisabled: '=',
            datetimeDatePlaceholder: '@',
            datetimeModelId: '=',
            datetimeMaxDate: '@',
            datetimeSaveMethode: '&',
            datetimeSaveMethodeParameter1: '=',
            datetimeSaveMethodeParameter2: '=',
            datetimeField: '=',
            datetimeDisablePopup: '=',
            datetimeUseNotification: "=",
            datetimeElement: '=',
            datetimeOuterform: '='

        },
        link: function (scope, element, attrs) {
           
        },
        controller: function($scope, ModalService, DateUtils) {
			$scope.firstInput = true;
            $scope.dateTimeInit = function() {
                $scope.dateTime = { date: null, time: null};        
                if(!$scope.datetimeModel[$scope.datetimeModelId]) {
                    return;
                }
                var values = $scope.datetimeModel[$scope.datetimeModelId].split('T');
                $scope.dateTime.date = DateUtils.formatFromApiToUser(values[0]);
                $scope.dateTime.time = values[1];
            };

            $scope.interacted = function (field, form) {
                var status = false;                
                status = form.$submitted || field.$touched;                 
                return status;
            };           

            $scope.saveDateTime = function(isDate) {
                var splitDateTime = '';

                if($scope.datetimeModel[$scope.datetimeModelId]) {
                    splitDateTime = $scope.datetimeModel[$scope.datetimeModelId].split("T");
                }
        
                if(isDate) {
                    $scope.datetimeModel[$scope.datetimeModelId] = DateUtils.formatFromUserToApi($scope.dateTime.date) + "T" + splitDateTime[1];
                } else {
                    $scope.datetimeModel[$scope.datetimeModelId] = splitDateTime[0] + "T" + $scope.dateTime.time;
                }
                
                if($scope.dateTime.date && $scope.dateTime.time && $scope.datetimeSaveMethode() && $scope.datetimeModel[$scope.datetimeModelId].match(/^(\d\d\d\d-\d\d-\d\dT\d\d:\d\d)$/)) {
                    if(isDate && $scope.datetimeField) {
                        $scope.datetimeSaveMethode()($scope.datetimeSaveMethodeParameter1, $scope.datetimeField.foo);
                    } else if($scope.datetimeField) {
                        $scope.datetimeSaveMethode()($scope.datetimeSaveMethodeParameter1, $scope.datetimeField.foo2);
                    } else {
                        $scope.datetimeSaveMethode()($scope.datetimeSaveMethodeParameter1, $scope.datetimeSaveMethodeParameter2);                        
                    }
                } else if(!$scope.dateTime.date && !$scope.dateTime.time && $scope.datetimeSaveMethode()) {
                    $scope.datetimeModel[$scope.datetimeModelId] = null;
                    $scope.datetimeSaveMethode()($scope.datetimeSaveMethodeParameter1);

                } else if(!$scope.datetimeDisablePopup) {
					if($scope.firstInput) {
						$scope.firstInput = false;
						return;
					}
                    var modalOptions = {
                        headerText: 'warning',
                        bodyText: 'both_date_and_time'
                    };
                    
                    ModalService.showModal({},modalOptions);
                    return;
                }
            };

            $scope.getInputNotifcationClass = function(id, event){
                if($scope.dateTime.time && !$scope.dateTime.time.match(/^(\d\d:\d\d)$/)) {
                    return 'form-control input-pending';
                }

                if(!$scope.dateTime.date !== !$scope.dateTime.time) {
                    return 'form-control input-pending';
                }

                if($scope.datetimeElement.id && $scope.datetimeElement.id === id && $scope.datetimeElement.event && $scope.datetimeElement.event === event.event) {
                    if($scope.datetimeElement.pending) {
                        return 'form-control input-pending';
                    }
                    
                    if($scope.datetimeElement.saved) {
                        return 'form-control input-success';
                    } else {
                        return 'form-control input-error';
                    }            
                }  
                return 'form-control';
			};
			
			$scope.clearDateTime = function() {
				$scope.dateTime.date = null;
                $scope.dateTime.time = null;
				if($scope.datetimeSaveMethode()) {
					$scope.saveDateTime();
				}
			};
        }
    };
})

.directive("d2TimeParser", function() {
    return {
        restrict: "A",         
        require: "ngModel",         
        link: function(scope, element, attrs, ngModel) {
            ngModel.$parsers.push(function(value){
                if( /^(\d\d\d)$/.test(value)){
                    var convertedValue = value.substring(0, 2) + ":" + value.charAt(2);
                    ngModel.$setViewValue(convertedValue);
                    ngModel.$commitViewValue();
                    ngModel.$render();
                    return convertedValue;
                }

                if(value.length > 5){
                    var convertedValue = value.substring(0, 5);
                    ngModel.$setViewValue(convertedValue);
                    ngModel.$commitViewValue();
                    ngModel.$render();
                    return convertedValue;
                }

                return value;                
            });
        }
    };
})

.directive('d2Time', function() {
    return {
        restrict: 'E',            
        templateUrl: "./templates/time-input.html",
        scope: {      
            timeModel: '=',
            timeModelId: '=',     
            timeRequired: '=',
            timeDisabled: '=',
            timeSaveMethode: '&',
            timeSaveMethodeParameter1: '=',
            timeSaveMethodeParameter2: '=',
            timeDisablePopup: '=',
            timeUseNotification: "=",
            timeElement: '='

        },
        link: function (scope, element, attrs) {
            
        },
        controller: function($scope, ModalService) {           
            $scope.saveTime = function() {
                if(!$scope.timeModel[$scope.timeModelId] || $scope.timeModel[$scope.timeModelId].match(/^(\d\d:\d\d)$/)) {
                    $scope.timeSaveMethode()($scope.timeSaveMethodeParameter1, $scope.timeSaveMethodeParameter2);
                } else if (!$scope.timeDisablePopup) {
                    var modalOptions = {
                        headerText: 'warning',
                        bodyText: 'wrong_time_format'
                    };
                    
                    ModalService.showModal({},modalOptions);
                    return;
                }
               
            };

            $scope.getInputNotifcationClass = function(id, event){
                if($scope.timeModel[$scope.timeModelId] && !$scope.timeModel[$scope.timeModelId].match(/^(\d\d:\d\d)$/)) {
                    return 'form-control input-pending';
                }

                if($scope.timeElement.id && $scope.timeElement.id === id && $scope.timeElement.event && $scope.timeElement.event === event.event) {
                    if($scope.timeElement.pending) {
                        return 'form-control input-pending';
                    }
                    
                    if($scope.timeElement.saved) {
                        return 'form-control input-success';
                    } else {
                        return 'form-control input-error';
                    }            
                }  
                return 'form-control';
            };
        }
    };
})

.directive('d2Age', function( CalendarService, DateUtils ){
    return {
        restrict: 'EA',            
        templateUrl: "./templates/age-input.html",
        scope: {
            id: '@',
            d2Object: '=',
            d2AgeSaved: '=',
            d2Disabled: '=',
            d2Required: '=',
            d2CallbackFunction: '&d2Function'
        },
        link: function (scope, element, attrs) {
            
        },
        controller: function($scope){            
            
            $scope.age = {};
            
            if( $scope.id && $scope.d2Object && $scope.d2Object[$scope.id] ){
                $scope.age.dob = $scope.d2Object[$scope.id];
                formatAge();
            }
            
            function formatAge(){
                if( $scope.age && $scope.age.dob !== "" ){
                    var _age = DateUtils.getAge( $scope.age.dob );                    
                    $scope.age.years = _age.years;
                    $scope.age.months = _age.months;
                    $scope.age.days = _age.days;
                }
            }
            
            $scope.$watch('age.dob', function( newValue, oldValue ){
                if( newValue !== oldValue ){
                    $scope.d2Object[$scope.id] = $scope.age.dob;
                    if( angular.isDefined( $scope.d2CallbackFunction ) ){
                        $scope.d2CallbackFunction($scope.d2Object, $scope.id);
                    }
                }
            });
            
            $scope.saveDOB = function(){                
                formatAge();                
            };
            
            $scope.saveAge = function(){
                var dob = moment().subtract({days: $scope.age.days ? $scope.age.days : 0, months: $scope.age.months ? $scope.age.months : 0, years: $scope.age.years ? $scope.age.years : 0});
                $scope.age.dob = DateUtils.format( dob );
                formatAge();
            };
            
            $scope.removeAge = function(){
                $scope.age = {};
            };
            
            $scope.ageInteracted = function (field, form) {        
                var status = false;
                if (field) {
                    if(angular.isDefined(form)){
                        status = form.$submitted || field.$dirty;
                    }
                    else {
                        status = $scope.ageForm.$submitted || field.$dirty;
                    }            
                }
                return status;
            };
        }
    };
})

.directive('d2OptionList', function() {
    return {
        restrict: 'E',            
        templateUrl: "./templates/more-options-list.html",
        scope: {
			d2Model: '=',
			d2ModelId: '=',
            d2Required: '=',
            d2Disabled: '=',
			d2SaveMethode: '&',
			d2SaveMethodeParameter1: '=',
			d2SaveMethodeParameter2: '=',
			d2AllOptions: '=',
			d2MaxOptionSize: '=',
			d2UseNotification: '=',
			d2Element: '='
		},
		link: function (scope, element, attrs) {
            
        },
        controller: function($scope) {
			$scope.saveOption = function() {
				$scope.d2SaveMethode()($scope.d2SaveMethodeParameter1, $scope.d2SaveMethodeParameter2);
			};

			$scope.getInputNotifcationClass = function(id) {
				event = $scope.d2Model;
				
				if($scope.d2Element.id && $scope.d2Element.id === id && $scope.d2Element.event && $scope.d2Element.event === event.event) {
					if($scope.d2Element.pending) {
						return 'input-pending';
					}
					
					if($scope.d2Element.saved) {
						return 'input-success';
					} else {
						return 'input-error';
					}            
				}  
				return '';
			};
		}
    };
});