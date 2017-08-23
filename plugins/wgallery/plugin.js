/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

/**
 * @fileOverview WixGallery plugin.
 * @Author Eran Amar (eranam@wix.com)
 */

(function () {

    var MATRIX_GALLERY_TYPE = 'wysiwyg.viewer.components.MatrixGallery',
        SLIDESHOW_MASK_IMAGE_SRC_BASE_64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAm4AAAHTCAYAAACeFJQlAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDE0IDc5LjE1Njc5NywgMjAxNC8wOC8yMC0wOTo1MzowMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RUE4RDFBODZGMUE2MTFFNDhCOEM4RUQ1NUQ0OTQxREMiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RUE4RDFBODVGMUE2MTFFNDhCOEM4RUQ1NUQ0OTQxREMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo0QTE2N0U0MkQzNkExMUU0QjE1NTg2OEZGNDkwNkU2QyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo0QTE2N0U0M0QzNkExMUU0QjE1NTg2OEZGNDkwNkU2QyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PtBjya8AABMUSURBVHja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',
        TRANSPARENT_MASK_IMAGE_SAC_BASE_64 = 'data:image/gif;base64,R0lGODlhAQABAPABAP///wAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==',
        GALLERY_RATIO = 0.75,
        MATRIX_DISPLAYER_RATIO = 0.75;

    function debug() {
        if (debug.isOn) {
            var args = ['DEBUG:'];
            console.warn.apply(console, args.concat.apply(args, arguments));
        }
    }

    debug.isOn = false;

    var galleryWidgetName = 'wgallery',
        selectedElemOutlineWidth = 2,
        GALLERY_MARGIN_BOTTOM = 26,
        TOOLS;

    var galleryWidgetDefinition = {
        name: galleryWidgetName,
        mask: true,
        inline: false,
        draggable: true,
        init: onWidgetInstanceInit,
        data: onWidgetInstanceData,
        allowedContent: 'div(!wg-container)[style,wix-comp]; span(!wg-item)[style]',
        requiredContent: 'div(!wg-container)',
        upcast: function (element) {
            return element.hasClass('wg-container');
        }
    };

    function removeSystemProperties(data) {
        return TOOLS.omit(data, 'classes')
    }

    var galleryRenderer = (function galleriesRenderer() {
        var bgUrlRegExp = /url\([^\)]*\)/, marginPlaceholder = '-100px';

        function setAsInnerHtmlWhenDifferent(containerElem, contentElem) {
            var contentAsHtml = (typeof contentElem === 'string') ? contentElem : contentElem.getOuterHtml();
            if (containerElem.getHtml() !== contentAsHtml) {
                containerElem.setHtml(contentAsHtml);
            }
        }

        function getWidgetWidth(widget) {
            return parseInt(widget.element.getStyle('width'), 10);
        }

        function genDisplayerSpan(overrideStyle) {
            var style = TOOLS.assign({
                'display': 'inline-block',
                'background-position': 'center center',
                'background-size': 'contain',
                'background-repeat': 'no-repeat',
                'float': 'left',
                'background-image': 'url("anyString")'
            }, overrideStyle || {});

            var displayerSpanElem = new CKEDITOR.dom.element('span');
            displayerSpanElem.addClass('wg-item');
            displayerSpanElem.setStyles(style);
            return displayerSpanElem;
        }

        function fixMaskBackgroundImage(widget) {
            widget.mask.$.src = galleryCalculations.Matrix.isJsonTypeMatch(widget.data)? TRANSPARENT_MASK_IMAGE_SAC_BASE_64 : SLIDESHOW_MASK_IMAGE_SRC_BASE_64;
        }

        function renderSlideShowGalleryToDisplay(widget) {
            var firstImage = widget.data.imageList[0],
                galleryContainerElem = widget.element,
                widgetWidth = getWidgetWidth(widget),
                containerNewHeight = Math.round(GALLERY_RATIO * widgetWidth),
                imgSrcWithScale = TOOLS.buildImageUrlWithScale(firstImage, widgetWidth);

            galleryContainerElem.setStyle('height', containerNewHeight + 'px');

            var displayerSpanElem = genDisplayerSpan({
                'width': widgetWidth + 'px',
                'height': containerNewHeight + 'px',
                'background-image': 'url(' + imgSrcWithScale + ')'
            });

            setAsInnerHtmlWhenDifferent(galleryContainerElem, displayerSpanElem);
            fixMaskBackgroundImage(widget);
        }

        function matrix_buildCorrectMarginString(indexPosition, galleryData) {
            indexPosition++;
            var totalItems = galleryData.imageList.length,
                cols = galleryData.cols,
                margin = galleryData.margin;

            var firstIndexForItemInLastRow = totalItems - ((totalItems % cols) || cols),
                top = (indexPosition <= cols) ? 0 : margin,
                right = (indexPosition % cols) === 0 ? 0 : margin,
                bottom = indexPosition > firstIndexForItemInLastRow ? 0 : margin,
                left = (indexPosition % cols) === 1 ? 0 : margin;

            return top + 'px ' + right + 'px ' + bottom + 'px ' + left + 'px';
        }

        function matrix_fillDisplayerTemplate(template, galleryData, imageData, itemIndex) {
            var imgSrcWithScale = TOOLS.buildImageUrlWithScale(imageData, galleryData.maxPossibleDisplayerWidth),
                correctMarginStr = matrix_buildCorrectMarginString(itemIndex, galleryData);

            return template.replace(marginPlaceholder, correctMarginStr).replace(bgUrlRegExp, 'url(' + imgSrcWithScale + ')');
        }

        function matrix_buildDisplayerHtmlTemplate(isFixedSize, displayerWidth, displayerHeight) {
            var displayerSpanElem = genDisplayerSpan({
                'width': displayerWidth + 'px',
                'height': displayerHeight + 'px',
                'margin': marginPlaceholder,
                'background-size': isFixedSize ? 'cover' : 'contain',
                'background-image': 'url("anyString")'
            });
            return displayerSpanElem.getOuterHtml();
        }

        function renderMatrixGalleryToDisplay(widget) {
            var imageList = widget.data.imageList,
                margin = widget.data.margin,
                cols = widget.data.cols,
                rows = widget.data.rows,
                galleryContainerElem = widget.element,
                widgetWidth = getWidgetWidth(widget),
                innerContentWidth = widgetWidth - galleryCalculations.Matrix.calcSumMarginBetweenElements(margin, cols),
                galleryData = TOOLS.assign({maxPossibleDisplayerWidth: widgetWidth}, widget.data);

            var displayerWidth = Math.floor(innerContentWidth / cols),
                displayerHeight = Math.floor(MATRIX_DISPLAYER_RATIO * displayerWidth),
                containerNewHeight = (displayerHeight * rows) + galleryCalculations.Matrix.calcSumMarginBetweenElements(margin, rows);

            var displayerTemplate = matrix_buildDisplayerHtmlTemplate(widget.data.fixedSize, displayerWidth, displayerHeight);

            var innerGalleryHtml = TOOLS.reduce(imageList, function (accumulatedHtml, imgData, index) {
                return accumulatedHtml + matrix_fillDisplayerTemplate(displayerTemplate, galleryData, imgData, index);
            }, '');

            setAsInnerHtmlWhenDifferent(galleryContainerElem, innerGalleryHtml);
            galleryContainerElem.setStyle('height', containerNewHeight + 'px');
            fixMaskBackgroundImage(widget);
        }

        return {
            renderMatrix: renderMatrixGalleryToDisplay,
            renderSlideShow: renderSlideShowGalleryToDisplay
        }
    })();

    var galleryCalculations = (function galleryCalculationsHelpers() {

        function matrix_fixGalleryNumOfRowsAndLayout(editor, compJson) {
            var numOfCols = compJson.cols,
                numOfRows = Math.ceil(compJson.imageList.length / numOfCols),
                editorWidth = TOOLS.calcEditorWidth(editor),
                cellWidth = editorWidth / numOfCols,
                desiredCellHeight = MATRIX_DISPLAYER_RATIO * cellWidth;

            TOOLS.assign(compJson, {
                rows: numOfRows,
                layout: {
                    width: editorWidth,
                    height: Math.ceil(desiredCellHeight * numOfRows)
                }
            });
        }

        function matrix_isMatrixGalleryJson(widgetData) {
            return widgetData.componentType === MATRIX_GALLERY_TYPE;
        }

        function matrix_calcTotalMarginBetweenElements(margin, numOfElements) {
            margin *= 2; // double the margin because for each element we got the right & left (or top-bottom) margin.
            return margin * (numOfElements - 1);
        }

        function slideshow_fixLayout(editor, compJson){
            var editorWidth = TOOLS.calcEditorWidth(editor);

            TOOLS.assign(compJson, {
                layout: {
                    width: editorWidth,
                    height: Math.ceil(GALLERY_RATIO * editorWidth)
                }
            });
        }

        return {
            Matrix: {
                fixNumOfRowsAndLayout: matrix_fixGalleryNumOfRowsAndLayout,
                isJsonTypeMatch: matrix_isMatrixGalleryJson,
                calcSumMarginBetweenElements: matrix_calcTotalMarginBetweenElements
            },
            SlideShow: {
                fixLayout: slideshow_fixLayout
            }
        };
    })();

    function updateDataThenRefresh(widget, ckCommand, data) {
        var nextData = TOOLS.assign({}, widget.data, data);

        if (galleryCalculations.Matrix.isJsonTypeMatch(nextData)) {
            galleryCalculations.Matrix.fixNumOfRowsAndLayout(widget.editor, nextData);
        } else {
            galleryCalculations.SlideShow.fixLayout(widget.editor, nextData);
        }

        widget.setData(nextData);

        if (ckCommand.refresh) {
            ckCommand.refresh(widget.editor);
        }
    }

    function updateWidgetStyle(widget){
        var editorWidth = TOOLS.calcEditorWidth(widget.editor) + 'px';

        widget.element.setStyles({
            width: editorWidth,
            display: 'block',
            margin: selectedElemOutlineWidth + 'px auto',
            'margin-bottom': GALLERY_MARGIN_BOTTOM + 'px',
            'max-width': 'none' // needed to ignore "maxWidth: 99.99%" from content.css
        });

        if (widget.mask) {
            debug('configuring mask to fixed it in the center of the editor');
            widget.mask.setStyles({
                width: editorWidth,
                left: selectedElemOutlineWidth + 'px'
            });
        }
    }

    function updateDragHandlerToCoverWidget(widget){
        if (widget.dragHandlerContainer) {
            debug('configuring dragHandler to cover the whole widget');
            widget.dragHandlerContainer.getFirst().setStyles({
                width: widget.element.getStyle('width'),
                height: widget.element.getStyle('height')
            });
        }
    }

    function runPostRenderConfigurations(widget){
        updateDragHandlerToCoverWidget(widget);
    }

    function onWidgetInstanceInit() {
        debug('inside init event handler');
        var widget = this;

        updateWidgetStyle(widget);

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

    function onWidgetInstanceData(event) {
        var widget = this, evtData = event.data;
        if (hasDataInsideTheEvent(event)) {
            debug('inside data event handler');

            updateWixCompAttribute(widget, evtData);
            updateWidgetStyle(widget);

            if (galleryCalculations.Matrix.isJsonTypeMatch(evtData)) {
                galleryRenderer.renderMatrix(widget);
            } else {
                galleryRenderer.renderSlideShow(widget);
            }

            runPostRenderConfigurations(widget);
            widget.editor.execCommand('autogrow');
        }
    }

    /**
     * Change the 'wix-comp' attribute on the dom element that represents the widget.
     * @param widget - the widget it's element we wish to update
     * @param data - * If it is a key string, then must also specify the 'val' parameter. In such
     *                      case will update the current compJson on the element in the given key & val pair.
     *                      * If it is an object, the 'val' param is being ignore. replace the whole current compJson
     *                      on the element with the given one.
     * @param val - see 'data' param explanation.
     */
    function updateWixCompAttribute(widget, data) {
        TOOLS.updateWixCompAttrOnWidget(widget, removeSystemProperties(data));
    }

    function onPluginInit(editor) {

        function createWidgetWithGivenData(editor, galleryData) {
            var placeHolderElem = new CKEDITOR.dom.element('div'),
                ckCommand = this;
            TOOLS.fixMissingSelection(editor);
            placeHolderElem.addClass('wg-container');
            editor.insertElement(placeHolderElem); // must be inserted to the document before initializing the widget.
            var newWidget = editor.widgets.initOn(placeHolderElem, galleryWidgetName);
            updateDataThenRefresh(newWidget, ckCommand, galleryData);
            TOOLS.insertEmptyLineAfterElement(editor, newWidget.wrapper);
            TOOLS.setFocusOnWidget(newWidget);
        }

        function setDataToSelectedGallery(editor, data) {
            var widget = TOOLS.getSelectedWidget(editor),
                ckCommand = this;
            if (widget) {
                updateDataThenRefresh(widget, ckCommand, data);
            }
        }

        TOOLS = CKEDITOR.plugins.wixtools; // available on CKEDITOR once finished to register all enabled plugins
        editor.widgets.add(galleryWidgetName, galleryWidgetDefinition);
        editor.addCommand(galleryWidgetName, {exec: createWidgetWithGivenData});
        editor.addCommand(galleryWidgetName + '.setData', {exec: setDataToSelectedGallery});
    }

    CKEDITOR.plugins.add(galleryWidgetName, {
        lang: 'en',
        requires: 'widget,wixtools',
        init: onPluginInit
    });
})();
