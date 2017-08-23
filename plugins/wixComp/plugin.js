(function () {

    var TOOLS;
    var FULL_WIDTH_SIZE_ATTR = 'isFullSize';
    var ALL_JUSTIFY_CMD_NAMES = ['wixComp.justify.left', 'wixComp.justify.center', 'wixComp.justify.right'];

    CKEDITOR.plugins.add('wixComp', {
        requires: 'image2,wixtools',
        init: function (editor) {
            TOOLS = CKEDITOR.plugins.wixtools;
            editor.widgets.registered.image.edit = function () {
                return false;
            };

            function _validateImage(image) {
                return (image.getStyle('display') || image.getStyle('float'));
            }

            function fixAlignment(jsonObj, widget) {
                var alignValue;

                if (jsonObj.floatValue === 'left') {
                    jsonObj.leftMarginStyle = '5px';
                    jsonObj.rightMarginStyle = '18px';
                    alignValue = 'left';
                } else if (jsonObj.floatValue === 'right') {
                    jsonObj.leftMarginStyle = '18px';
                    jsonObj.rightMarginStyle = '5px';
                    alignValue = 'right';
                } else {
                    alignValue = 'center';
                }

                return setAlignment(widget, alignValue);
            }

            function _handleActualSize(imageElem, jsonObj, editorWidth) {
                var actualWidth = imageElem.getSize('width'),
                    actualHeight = imageElem.getSize('height'),
                    fixedWidth = editorWidth;
                if (actualWidth) {
                    jsonObj.dimsRatio = actualHeight / actualWidth;
                    fixedWidth = Math.min(actualWidth, editorWidth);
                }
                return fixedWidth;
            }

            function _fixImage(widget) {
                var compJson = _getCompJson(widget.editor, widget);
                if (compJson) {
                    var jsonObj = JSON.parse(compJson);

                    var imageElem = widget.parts.image;
                    var editorWidth = TOOLS.calcEditorWidth(widget.editor);
                    //old width was in percentages out of the total width of the editor
                    var fixedWidth = parseFloat(imageElem.getStyle('width')) / 100 * editorWidth;

                    //clear image old style
                    imageElem.removeAttribute('style');

                    if (isNaN(fixedWidth)) { //actual size is NaN
                        fixedWidth = _handleActualSize(imageElem, jsonObj, editorWidth);
                    }

                    widget.setData('width', fixedWidth);
                    widget.setData('height', fixedWidth * jsonObj.dimsRatio);

                    widget = fixAlignment(jsonObj, widget);

                    imageElem.setAttribute(TOOLS.WIX_COMP_JSON_ATTRIBUTE, JSON.stringify(jsonObj));
                    return widget;
                }
            }

            /**
             * Set data to wix-comp attribute on the widgetElement
             * @param widget
             * @param keyValPairs - an object of keys-values to set
             */
            function _setJsonKeyValOnWidget(widget, keyValPairs) {
                var compJson = _getCompJson(widget.editor, widget);
                if (compJson) {
                    var jsonObj = JSON.parse(compJson);
                    TOOLS.assign(jsonObj, keyValPairs);
                    TOOLS.getNativeWidgetElement(widget).setAttribute(TOOLS.WIX_COMP_JSON_ATTRIBUTE, JSON.stringify(jsonObj));
                }
            }

            function setOnLoadFixerWhenImageMissingDimensions(widget) {
                if (!widget.data.height || !widget.data.width) {
                    //console.warn('no height or width!');
                    widget.parts.image.$.onload = function onLoad(event) {
                        var image = event.target;
                        image.setAttribute('width', image.width);
                        image.setAttribute('height', image.height);
                        widget.setData({width: image.width, height: image.height});
                        //console.warn('image is fixed!', widget);
                        widget.editor.fire('change');
                    };
                }
            }

            function isFullWidth(widget) {
                var widthInPercentage = widget.data.width / TOOLS.calcEditorWidth(editor);
                return widthInPercentage === 1;
            }

            editor.widgets.on('instanceCreated', function onWixWidgetCreation(newWidgetEvent) {
                var widget = newWidgetEvent.data;

                if (widget.name === "image") {
                    widget.on('data', function onWidgetData(evt) {
                        if (!evt.data) {
                            return;
                        }
                        var widthInPercentage = evt.data.width / TOOLS.calcEditorWidth(editor);
                        var newProperties = {
                            width: widthInPercentage,
                            src: widget.data.src
                        };
                        newProperties[FULL_WIDTH_SIZE_ATTR] = isFullWidth(widget);
                        _setJsonKeyValOnWidget(widget, newProperties);
                        editor.execCommand('autogrow');
                    });

                    widget.once('ready', function onWidgetReady() {
                        if (_validateImage(widget.parts.image)) {
                            widget = _fixImage(widget);
                        }
                        setOnLoadFixerWhenImageMissingDimensions(widget);
                        var isFullWidthData = {};
                        isFullWidthData[FULL_WIDTH_SIZE_ATTR] = isFullWidth(widget);
                        _setJsonKeyValOnWidget(widget, isFullWidthData);
                    });
                }
            });

            editor.addCommand('wixComp', new WixCompCommandDef());
            editor.addCommand('wixComp.url', new WixEditCompUrlCommandDef());
            editor.addCommand('wixComp.video.url', new WixEditCompVideoUrlCommandDef());
            editor.addCommand('wixComp.delete', new WixEditCompDeleteCommandDef());
            editor.addCommand('wixComp.justify.left', new WixEditCompJustifyLeftCommandDef());
            editor.addCommand('wixComp.justify.center', new WixEditCompJustifyCenterCommandDef());
            editor.addCommand('wixComp.justify.right', new WixEditCompJustifyRightCommandDef());
            editor.addCommand('wixComp.image.alt', new WixEditCompAltCommandDef());
            editor.addCommand('wixComp.link', new WixEditCompLinkCommandDef());
        },
        getCompWidget: function (editor) {
            return TOOLS.getSelectedWidget(editor)
        }
    });


    function _getCompJson(editor, compWidget) {
        compWidget = compWidget || TOOLS.getSelectedWidget(editor);

        if (compWidget) {
            return TOOLS.getNativeWidgetElement(compWidget).getAttribute(TOOLS.WIX_COMP_JSON_ATTRIBUTE);
        }
        return null;
    }

    function focusOnNewWidget(editor, widget) {
        if (editor.focusManager.hasFocus) {
            window.setTimeout(function () {
                editor.plugins.wixpreservestyle.fixDom(editor);
                widget.focus();
            });
        }
    }

    var WixCompCommandDef = function () {
    };

    function _initWidgetSize(newWidget, compData) {
        _initWidth(newWidget, compData);
        _initHeight(newWidget, compData);
        newWidget.fire('data');
    }

    function createCompWidget(editor, imageElement, compData) {
        var widget = editor.widgets.initOn(imageElement, 'image', TOOLS.pick(compData, ['width', 'height', 'src']));
        _initWidgetSize(widget, compData);
        return createAlignedWidget(widget, 'center', editor);
    }

    function _createCompPlaceHolder(editor, value) {
        var elementPlaceholder = editor.document.createElement('img');
        elementPlaceholder.setAttribute('src', value.src);
        elementPlaceholder.setAttribute(TOOLS.WIX_COMP_JSON_ATTRIBUTE, JSON.stringify(value.json));
        elementPlaceholder.$.onload = function () {
            editor.execCommand('autogrow');
        };
        return elementPlaceholder;
    }

    function _insertCompPlaceholder(editor, elementPlaceholder) {
        //Current selected component has fake selection so it is not deleted automatically
        //delete if - using the delete comp command
        editor.execCommand('wixComp.delete');

        //add a temp div tag to the editor, this will create new block element, than replace it with the placeholder
        //it will make sure that the placeholder will be inserted like a block element
        var tempDiv = editor.document.createElement('div');
        editor.insertElement(tempDiv);
        elementPlaceholder.insertAfter(tempDiv);
        TOOLS.insertEmptyLineAfterElement(editor, elementPlaceholder);
        tempDiv.remove();
    }

    function _alignJsonToCenter(editor, jsonData) {
        var centerCommand = editor.getCommand('wixComp.justify.center');
        return centerCommand._updateComponentJson(jsonData);
    }

    WixCompCommandDef.prototype = {
        exec: function (editor, compData) {
            TOOLS.fixMissingSelection(editor);
            compData.json = _alignJsonToCenter(editor, compData.json);
            var elementPlaceholder = _createCompPlaceHolder(editor, compData);
            _insertCompPlaceholder(editor, elementPlaceholder);
            var widget = createCompWidget(editor, elementPlaceholder, compData);
            editor.execCommand('autogrow');
            focusOnNewWidget(editor, widget);
        }
    };

    function _initHeight(compWidget, compData) {
        var newHeight = compData.height;

        if (compData.json.dimsRatio) {
            newHeight = compData.dimsRatio * compWidget.data.width;
        }

        compWidget.setData('height', newHeight);
    }

    function _fixHeightIfNeeded(compData, editorWidth) {
        if (compData.height) {
            var fixHeightRatio = editorWidth / compData.width;
            (compData.height = compData.height * fixHeightRatio);
        }
    }

    function _initWidth(compWidget, compData) {
        var editorWidth = TOOLS.calcEditorWidth(compWidget.editor);
        var newWidgetWidth;
        if (!compData.width || (compData.width > editorWidth)) {
            newWidgetWidth = editorWidth;
            _fixHeightIfNeeded(compData, editorWidth);
        } else {
            newWidgetWidth = compData.width;
        }

        compWidget.setData('width', newWidgetWidth);
    }

    var WixEditCompCommandDef = function () {
    };

    WixEditCompCommandDef.prototype = {
        exec: function (editor, value) {
            var compJsonString, compJsonObject;

            var widget = TOOLS.getSelectedWidget(editor);
            if (widget) {

                compJsonString = _getCompJson(editor, widget);
                if (compJsonString) {
                    compJsonObject = this._updateComponentJson(JSON.parse(compJsonString), value);
                    TOOLS.getNativeWidgetElement(widget).setAttribute(TOOLS.WIX_COMP_JSON_ATTRIBUTE, JSON.stringify(compJsonObject));
                    this._editComponentWidget(widget, value, editor);
                }
            }

            if (this.refresh) {
                this.refresh(editor);
            }
        }
    };

    var WixEditCompUrlCommandDef = function () {
        this.editorFocus = false;
    };
    WixEditCompUrlCommandDef.prototype = new WixEditCompCommandDef();

    WixEditCompUrlCommandDef.prototype._editComponentWidget = function (compWidget, paramValue) {
        compWidget.setData({
            src: paramValue.src,
            width: paramValue.width,
            height: paramValue.height
        });
    };

    WixEditCompUrlCommandDef.prototype._updateComponentJson = function (compJson, paramValue) {
        compJson.src = paramValue.src;
        compJson.id = paramValue.json.id;
        compJson.dataQuery = paramValue.json.dataQuery;
        compJson.propertyQuery = paramValue.json.propertyQuery;
        return compJson;
    };

    var WixEditCompVideoUrlCommandDef = function () {
    };
    WixEditCompVideoUrlCommandDef.prototype = new WixEditCompUrlCommandDef();
    WixEditCompVideoUrlCommandDef.prototype.contextSensitive = true;
    WixEditCompVideoUrlCommandDef.prototype._updateComponentJson = function (compJson, paramValue) {
        compJson.src = paramValue.src;
        compJson.videoType = paramValue.videoType;
        compJson.videoId = paramValue.videoId;
        return compJson;
    };

    WixEditCompVideoUrlCommandDef.prototype._editComponentWidget = function (compWidget, paramValue) {
        compWidget.setData({
            src: paramValue.src
        });
    };

    WixEditCompVideoUrlCommandDef.prototype.refresh = function (editor) {
        var compJson = _getCompJson(editor);

        if (compJson) {
            var compDataObj = JSON.parse(compJson);
            if (!compDataObj.videoId || !compDataObj.videoType) {
                this.setState(CKEDITOR.TRISTATE_OFF);
            } else {
                var videoData = {
                    videoType: compDataObj.videoType,
                    videoId: compDataObj.videoId

                };

                this.setState(videoData);
            }
        }
    };

    var WixEditCompDeleteCommandDef = function () {
    };
    WixEditCompDeleteCommandDef.prototype = new WixEditCompCommandDef();

    /**
     * Re-Implement the 'exec' property because the current exec does irrelevant manipulations on a widget that
     * is about to be removed. The current implementation is a simplified version
     * that just remove the widget from the widgets repository and dom (therefore it is compatible
     * with wGallery widget).
     */
    WixEditCompDeleteCommandDef.prototype.exec = function (editor) {
        var currSelectedWidget = TOOLS.getSelectedWidget(editor);
        if (currSelectedWidget) {
            currSelectedWidget.repository.del(currSelectedWidget);
        }

        if (this.refresh) {
            this.refresh(editor);
        }
    };

    var WixEditCompAltCommandDef = function () {
        this.editorFocus = false;
    };
    WixEditCompAltCommandDef.prototype = new WixEditCompCommandDef();
    WixEditCompAltCommandDef.prototype.contextSensitive = true;
    WixEditCompAltCommandDef.prototype._editComponentWidget = function (compWidget, paramValue) {
        var compElement = TOOLS.getNativeWidgetElement(compWidget);
        if (paramValue === CKEDITOR.TRISTATE_OFF) {
            compElement.setAttribute('alt', '');
            compElement.removeAttribute('title');
        } else {
            compElement.setAttribute('alt', paramValue);
            compElement.setAttribute('title', paramValue);
        }
    };

    WixEditCompAltCommandDef.prototype._updateComponentJson = function (compJson, paramValue) {
        if (paramValue === CKEDITOR.TRISTATE_OFF) {
            delete compJson.alt;
        } else {
            compJson.alt = paramValue;
        }
        return compJson;
    };

    WixEditCompAltCommandDef.prototype.refresh = function (editor) {
        var compJson = _getCompJson(editor);

        if (compJson) {
            this.setState(JSON.parse(compJson).alt);
        }
    };

    function refreshJustifyCommand(widget, command) {
        if (widget) {
            var align = widget.data.align;
            command.state = CKEDITOR.TRISTATE_DISABLED; //set state to be disabled, it will enforce a change state event
            command.setState(( align == command.alignValue) ? CKEDITOR.TRISTATE_ON : CKEDITOR.TRISTATE_OFF);
        }
    }

    function refreshAllJustifyCommands(editor) {
        var widget = TOOLS.getSelectedWidget(editor);
        TOOLS.forEach(ALL_JUSTIFY_CMD_NAMES, function (cmdName) {
            var command = editor.getCommand(cmdName);
            refreshJustifyCommand(widget, command);
        });
    }

    var WixEditCompJustifyBaseCommandDef = function () {
    };

    WixEditCompJustifyBaseCommandDef.prototype = new WixEditCompCommandDef();
    WixEditCompJustifyBaseCommandDef.prototype.contextSensitive = true;
    WixEditCompJustifyBaseCommandDef.prototype.refresh = function (editor) {
        refreshAllJustifyCommands(editor);
    };

    /**
     * Important: when setting alignment status to widget it is being destroy a new instance is created,
     *          that invalidates your current reference to the widget!
     */
    function setAlignment(widget, alignValue) {
        function findTheAlignedWidget() {
            var allWidgets = TOOLS.values(widget.editor.widgets.instances);
            var alignedWidget = TOOLS.find(allWidgets, function (widget) {
                return widget.data.__beforeAlignment__ === true;
            });
            delete alignedWidget.data.__beforeAlignment__;
            return alignedWidget;
        }

        widget.setData({
            align: alignValue,
            __beforeAlignment__: true
        });
        refreshAllJustifyCommands(widget.editor);
        return findTheAlignedWidget();
    }

    /**
     * Important: when setting alignment status to widget it is being destroy a new instance is created,
     *          that invalidates your current reference to the widget!
     */
    function createAlignedWidget(widget, alignValue, editor) {
        function _isFullWidth() {
            var editorWidth = editor.editable().getClientRect().width,
                widgetWidth = widget.data.width || editorWidth;
            return editorWidth === widgetWidth;
        }

        var fixedAlignValue = _isFullWidth() ? 'center' : (alignValue || 'left');
        return setAlignment(widget, fixedAlignValue);
    }

    WixEditCompJustifyBaseCommandDef.prototype._editComponentWidget = function (widget, value, editor) {
        createAlignedWidget(widget, this.alignValue, editor);
    };


    var WixEditCompJustifyLeftCommandDef = function () {
        this.leftMarginStyle = '5px';
        this.rightMarginStyle = '18px';
        this.floatValue = 'left';
        this.alignValue = this.floatValue;
    };

    WixEditCompJustifyLeftCommandDef.prototype = new WixEditCompJustifyBaseCommandDef();

    WixEditCompJustifyLeftCommandDef.prototype._updateComponentJson = function (compJson) {
        compJson.floatValue = this.floatValue;
        delete compJson.display;
        compJson.marginLeft = this.leftMarginStyle;
        compJson.marginRight = this.rightMarginStyle;
        return compJson;
    };

    var WixEditCompJustifyRightCommandDef = function () {
        this.leftMarginStyle = '18px';
        this.rightMarginStyle = '5px';
        this.floatValue = 'right';
        this.alignValue = this.floatValue;
    };

    WixEditCompJustifyRightCommandDef.prototype = new WixEditCompJustifyLeftCommandDef();

    var WixEditCompJustifyCenterCommandDef = function () {
        this.displayStyle = 'block';
        this.marginStyle = 'auto';
        this.alignValue = 'center';
    };

    WixEditCompJustifyCenterCommandDef.prototype = new WixEditCompJustifyBaseCommandDef();

    WixEditCompJustifyCenterCommandDef.prototype._updateComponentJson = function (compJson) {
        delete compJson.floatValue;
        compJson.display = this.displayStyle;
        compJson.marginLeft = this.marginStyle;
        compJson.marginRight = this.marginStyle;
        return compJson;
    };

    var WixEditCompLinkCommandDef = function () {
    };
    WixEditCompLinkCommandDef.prototype = new WixEditCompCommandDef();

    WixEditCompLinkCommandDef.prototype._editComponentWidget = function () {
    };

    WixEditCompLinkCommandDef.prototype._updateComponentJson = function (compJson, paramValue) {
        if (paramValue) {
            compJson.linkDataQuery = paramValue.dataQuery;
        } else {
            delete compJson.linkDataQuery;
        }
        return compJson;
    };

    WixEditCompLinkCommandDef.prototype.isComponentLink = function (editor) {
        var compJson;

        var compWidget = TOOLS.getSelectedWidget(editor);
        if (compWidget) {
            compJson = _getCompJson(editor, compWidget);

            return !!compJson;
        }

        return false;
    };

    WixEditCompLinkCommandDef.prototype.getSelectedLink = function (editor) {
        var compJson;

        var compWidget = TOOLS.getSelectedWidget(editor);
        if (compWidget) {
            compJson = _getCompJson(editor, compWidget);

            if (compJson) {
                var jsonObj = JSON.parse(compJson);
                if (jsonObj.linkDataQuery) {
                    return jsonObj.linkDataQuery;
                }
            }
        }

        return CKEDITOR.TRISTATE_OFF;
    };

})();
