/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

/**
 * @fileOverview WixHtml plugin.
 * @Author Eran Amar (eranam@wix.com)
 */

(function () {


    function debug() {
        if (debug.isOn) {
            var args = ['DEBUG:'];
            console.warn.apply(console, args.concat.apply(args, arguments));
        }
    }

    debug.isOn = true;

    var htmlWidgetName = 'wixHtml',
        TOOLS;

    var htmlWidgetDefinition = {
        name: htmlWidgetName,
        mask: false,
        inline: false,
        draggable: false,
        init: onWidgetInstanceInit,
        data: onWidgetInstanceData,
        allowedContent: 'div(!w-html-container)[style,wix-comp]; iframe(!w-html-item)[style]',
        requiredContent: 'div(!w-html-container)',
        upcast: function (element) {
            return element.hasClass('w-html-container');
        }
    };

    function removeSystemProperties(data) {
        return TOOLS.omit(data, 'classes')
    }

    function setFocusOnWidget(widget) {
        if (widget.editor.focusManager.hasFocus) {
            window.setTimeout(function () {
                widget.focus();
            });
        }
    }

    function updateDataThenRefresh(widget, ckCommand, data) {
        var nextData = TOOLS.assign({}, widget.data, data);
        widget.setData(nextData);
        if (ckCommand.refresh) {
            ckCommand.refresh(widget.editor);
        }
    }

    function onWidgetInstanceInit() {
        debug('inside init event handler');
        var widget = this;

        widget.element.setStyles({
            width: TOOLS.calcEditorWidth(widget.editor) + 'px',
            display: 'block',
            'max-width': 'none' // needed to ignore "maxWidth: 99.99%" from content.css
        });

        if (widget.mask) {
            debug('configuring mask to fixed it in the center of the editor');
            widget.mask.setStyles({
                width: widget.element.getStyle('width')
            });
        }

        if (widget.dragHandlerContainer) {
            widget.dragHandlerContainer.addClass('fixed_drag_size');
        }

        var wixCompStr = decodeURIComponent(widget.element.getAttribute(TOOLS.WIX_COMP_JSON_ATTRIBUTE));
        if (wixCompStr) {
            widget.setData(JSON.parse(wixCompStr));
        }
    }

    function hasDataInsideTheEvent(event) {
        return !TOOLS.isEmpty(removeSystemProperties(event.data));
    }

    function updateDragHandlerSize(widget) {
        if (widget.dragHandlerContainer) {
            widget.dragHandlerContainer.getFirst().setStyles({
                width: widget.element.getStyle('width'),
                height: widget.element.getStyle('height')
            });
        }
    }

    function renderHtmlComponent(widget, evtData) {
        var html = '<iframe src="http://www.walla.co.il" />';
        widget.element.setHtml(html);
    }

    function onWidgetInstanceData(event) {
        var widget = this, evtData = event.data;
        if (hasDataInsideTheEvent(event)||1) {
            debug('inside data event handler');

            updateWixCompAttribute(widget, evtData);
            renderHtmlComponent(widget, evtData);
            updateDragHandlerSize(widget);
            widget.editor.execCommand('autogrow');
        }
    }

    /**
     * Change the 'wix-comp' attribute on the dom element that represents the widget.
     * @param widget - the widget it's element we wish to update
     * @param keyOrObject - * If it is a key string, then must also specify the 'val' parameter. In such
     *                      case will update the current compJson on the element in the given key & val pair.
     *                      * If it is an object, the 'val' param is being ignore. replace the whole current compJson
     *                      on the element with the given one.
     * @param val - see 'keyOrObject' param explanation.
     */
    function updateWixCompAttribute(widget, keyOrObject, val) {
        var widgetElem = widget.element.$,
            oldJsonStr = decodeURIComponent(widgetElem.getAttribute(TOOLS.WIX_COMP_JSON_ATTRIBUTE) || '{}'),
            jsonToSet = JSON.parse(oldJsonStr);

        if (TOOLS.isObject(keyOrObject)) {
            jsonToSet = keyOrObject;
        } else {
            jsonToSet[keyOrObject] = val;
        }

        var newJsonStr = JSON.stringify(removeSystemProperties(jsonToSet));
        if (oldJsonStr !== newJsonStr) {
            debug('setting wixcomp attribute on gallery\'s widget.element!');
            widgetElem.setAttribute(TOOLS.WIX_COMP_JSON_ATTRIBUTE, newJsonStr);
        }
    }

    function onPluginInit(editor) {

        function insetWidgetWithGivenData(editor, htmlContent) {
            var placeHolderElem = new CKEDITOR.dom.element('div'),
                ckCommand = this;
            TOOLS.fixMissingSelection(editor);
            placeHolderElem.addClass('w-html-container');
            editor.insertElement(placeHolderElem); // must be inserted to the document before initializing the widget.
            var newWidget = editor.widgets.initOn(placeHolderElem, htmlWidgetName);
            updateDataThenRefresh(newWidget, ckCommand, htmlContent);
            setFocusOnWidget(newWidget);
        }

        /*function setDataToSelectedGallery(editor, data) {
            var widget = TOOLS.getSelectedWidget(editor),
                ckCommand = this;
            if (widget) {
                updateDataThenRefresh(widget, ckCommand, data);
            }
        }*/

        TOOLS = CKEDITOR.plugins.wixtools; // available on CKEDITOR once finished to register all enabled plugins
        editor.widgets.add(htmlWidgetName, htmlWidgetDefinition);
        editor.addCommand(htmlWidgetName, {exec: insetWidgetWithGivenData});
        //editor.addCommand(htmlWidgetName + '.setData', {exec: setDataToSelectedGallery});
    }

    CKEDITOR.plugins.add(htmlWidgetName, {
        lang: 'en',
        requires: 'widget,wixtools',
        init: onPluginInit
    });
})();
