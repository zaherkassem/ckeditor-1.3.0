(function () {

    /*      Start Implementation for Tools functions     */

    var WIX_COMP_JSON_ATTRIBUTE = 'wix-comp',
        SRC_PLACEHOLDER = 'data-src-placeholder',
        EDITOR_WIDTH_FALLBACK = 620;

    function forEach(arrLike, func) {
        if ('length' in arrLike) {
            for (var i = 0; i < arrLike.length; i++) {
                func(arrLike[i], i, arrLike);
            }
        } else if (arrLike) {
            throw new Error('Expected array-like, got ' + (typeof arrLike) + ' instead. (must contains length property)');
        }
    }

    function map(arrLike, convertFunc) {
        var ret = [];
        forEach(arrLike, function (item, index, arr) {
            ret.push(convertFunc(item, index, arr));
        });
        return ret;
    }

    function toArray(arrLike) {
        return map(arrLike, function (item) {
            return item;
        });
    }

    function reduce(collection, combineFunc, accumulatedVal) {
        forEach(collection, function (val, index, collection) {
            accumulatedVal = combineFunc(accumulatedVal, val, index, collection);
        });
        return accumulatedVal
    }

    function isNumber(obj) {
        return !isNaN(obj) && isFinite(obj) && typeof obj === 'number';
    }

    function isObject(obj) {
        return Object.prototype.toString.call(obj) === '[object Object]';
    }

    function has(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    function forOwn(obj, func) {
        if (isObject(obj)) {
            for (var key in obj) {
                if (has(obj, key)) {
                    func(obj[key], key, obj);
                }
            }
        }
    }

    function assign(destObj) {
        var srcObjects = Array.prototype.slice.call(arguments, 1);
        forEach(srcObjects, function (srcObj) {
            forOwn(srcObj, function (val, key) {
                destObj[key] = val;
            });
        });
        return destObj
    }

    function isFunction(obj) {
        return typeof obj == 'function';
    }

    function isString(obj) {
        return typeof obj === 'string' || obj instanceof String;
    }

    function contains(iterable, searchValue) {
        if (Array.isArray(iterable) || isString(iterable)) {
            return iterable.indexOf(searchValue) >= 0;
        }
        return has(iterable, searchValue);
    }

    function pick(obj, predicate) {
        var retObj = {};
        if (isFunction(predicate)) {
            forOwn(obj, function (val, key) {
                if (predicate(val, key, obj)) {
                    retObj[key] = val;
                }
            });
        } else {
            predicate = Array.isArray(predicate) ? predicate : [predicate];
            forEach(predicate, function (key) {
                if (has(obj, key)) {
                    retObj[key] = obj[key];
                }
            });
        }
        return retObj;
    }

    function findIndex(arr, predicator) {
        if ('length' in arr) {
            for (var i = 0; i < arr.length; i++) {
                if (predicator(arr[i], i, arr)) {
                    return i;
                }
            }
            return -1;
        } else if (arr) {
            throw new Error('Expected array-like, got ' + (typeof arr) + ' instead. (must contains length property)');
        }
    }

    function find(arr, predicator) {
        var index = findIndex(arr, predicator);
        return (index >= 0) ? arr[index] : undefined;
    }

    function findWhere(arr, keyValPair) {
        var key = keys(keyValPair)[0],
            val = values(keyValPair)[0];
        return find(arr, function (item) {
            return isObject(item) && item[key] === val;
        });
    }

    function omit(obj, predicate) {
        var objContains = pick(obj, predicate),
            retObj = {};
        forOwn(obj, function (val, key) {
            if (!has(objContains, key)) {
                retObj[key] = val;
            }
        });
        return retObj;
    }

    function size(collection) {
        var len = 0;
        if (has(collection, 'length')) {
            len = collection.length;
        } else {
            forOwn(collection, function () {
                len++;
            });
        }
        return len;
    }

    function isEmpty(collection) {
        return size(collection) === 0;
    }

    function values(obj) {
        var ret = [];
        forOwn(obj, function (val) {
            ret.push(val);
        });
        return ret;
    }

    function keys(obj) {
        if (isFunction(Object.keys)) {
            return Object.keys(obj);
        }
        var ret = [];
        forOwn(obj, function (val, key) {
            ret.push(key);
        });
        return ret;
    }

    function isNull(obj) {
        return obj === null;
    }

    /**
     * Creating a new function from a given one. the returned function may invoked multiple times with
     * arbitrary amount of arguments. The actual execution will be held {delay} milliseconds from the
     * LAST invocation, and only once ("combining" several invocation to single execution).
     *
     * @param fn - the function to wrap
     * @param delay - number of millisecond to wait from last invocation
     * @returns {setTimer} - the wrapper function, that should be invoked as the original one. in addition,
     *                       it have a "cancel" property (which is a function), called it to cancel pending executions
     *                       of the original function.
     * for more, read the debounce documentation at lodash dev-docs.
     */
    function debounce(fn, delay) {
        var timer = null;

        function clearTimer() {
            if (!isNull(timer)) {
                window.clearTimeout(timer);
                timer = null;
            }
        }

        function setTimer() {
            clearTimer();
            var args = toArray(arguments);
            timer = window.setTimeout(function () {
                fn.apply(null, args);
            }, delay);
        }

        setTimer.cancel = clearTimer;
        return setTimer;
    }

    function _identity(x) {
        return x;
    }

    /**
     * get the best item from a list of items.
     *    transformer - a function which called on each item in the itemsArray, and the return value is
     *                  used for the comparison process!!
     *    isFirstBetter - predictor that takes 2 arguments and returns boolean: true if the first argument
     *                    is better then the other, false otherwise.
     *
     */
    function _findBest(itemsArray, transformer, isFirstBetter) {
        var bestIndex = null;

        forEach(itemsArray, function (item, index) {
            if (isNull(bestIndex) || isFirstBetter(transformer(itemsArray[index]), transformer(itemsArray[bestIndex]))) {
                bestIndex = index;
            }
        });

        return isNumber(bestIndex) ? itemsArray[bestIndex] : undefined;
    }

    /**
     * get the "biggest" item from a list of items.
     * Optional transform function: when provided used to convert each item to a number (like an
     * "evaluation" function), then the function find the item corresponds to the biggest number.
     */
    function max(items, transformer) {
        return _findBest(items, transformer || _identity, function isFirstGreater(first, second) {
            return first > second;
        });
    }

    /**
     * get the "smallest" item from a list of items.
     * Optional transform function: when provided used to convert each item to a number (like an
     * "evaluation" function), then the function find the item corresponds to the smallest number.
     */
    function min(items, transformer) {
        return _findBest(items, transformer || _identity, function isFirstSmaller(first, second) {
            return first < second;
        });
    }

    function _getFilenameFromImgSrc(url) {
        return url.slice(url.lastIndexOf('/') + 1)
    }

    function _endsWith(str, suffix) {
        var lastOccurrence = str.lastIndexOf(suffix),
            suitableStatingIndex = str.length - suffix.length;
        return str.length >= suffix.length && lastOccurrence === suitableStatingIndex;
    }

    function _isShouldBeScaled(src) {
        var isVideoUrl = contains(src, 'img.youtube.com') || contains(src, 'i.vimeocdn.com') || contains(src, 'static-dev.wixstatic.com/media/d3c329_7ad8725cdba842498dca00b77c7eff5c.jpg');
        return !_endsWith(src.toLowerCase(), '.gif') && !isVideoUrl;
    }

    /**
     * Remove the server-side scaling suffix from a given url.  safe to be called on all versions of
     * scaling format and it is also safe to call the function on url without scaling.
     * @param src - the url of the image
     * @param filename - optional. supply that argument only to save computations [as in  buildImageUrlWithScale()]
     *                  in general use, you dont need to pass this argument.
     * @returns the url without the scaling suffix.
     */
    function removeResizeSuffixFromImgUrl(src, filename) {
        filename = filename || _getFilenameFromImgSrc(src);
        var filenameLen = filename.length,
            endIndex = src.indexOf(filename) + filenameLen;
        return src.slice(0, endIndex);
    }

    /**
     * This method append a suffix for server-side scaling of the image. If the given url is not
     * belongs to an image (i.e it is a video) the method return the url unchanged.
     * @param imageData - object contains "src", "width", "height"
     * @param targetWidth - number, the desire width.
     * @param optionalTargetHeight - the desire height. when omitted, the function calculates it
     *          according to the previous ratio of the image.
     * @returns {string}
     */
    function buildImageUrlWithScale(imageData, targetWidth, optionalTargetHeight) {
        var filename = _getFilenameFromImgSrc(imageData.src),
            baseImgSrc = removeResizeSuffixFromImgUrl(imageData.src, filename),
            suffix = '';

        var originalRatio = imageData.height / imageData.width,
            params = {
                width: targetWidth,
                height: optionalTargetHeight || Math.round(targetWidth * originalRatio) || 0,
                filename: filename
            };

        if (_isShouldBeScaled(baseImgSrc) && params.height > 0) {
            //console.log('building src, height=', params.height, imageData, originalRatio);
            suffix = reduce(keys(params), function (midStepString, key) {
                return midStepString.replace('{' + key + '}', params[key]);
            }, '/v1/fill/w_{width},h_{height}/{filename}');
        }
        return baseImgSrc + suffix;
    }


    function calcEditorWidth(editor) {
        var editorWidth = editor.editable().getClientRect().width - 4; // reducing 4px to be able to show the right & left borders of an image
        if (editorWidth <= 0) {
            editorWidth = EDITOR_WIDTH_FALLBACK;
        }
        return editorWidth;
    }

    function fixMissingSelection(editor) {
        function _isMissingSelection() {
            var selection = editor.getSelection();
            var ranges;
            if (selection) {
                ranges = selection.getRanges();
            }

            return (!ranges || ranges.length === 0);
        }

        function _setCursorToTextEnd() {
            //select all text first - this will make sure that there is a native selection object...
            editor.execCommand('selectAll');

            var range = editor.createRange();
            range.moveToElementEditEnd(range.root);
            editor.getSelection().selectRanges([range]);
        }

        if (_isMissingSelection()) {
            _setCursorToTextEnd();
        }
    }

    /**
     * Return the Dom element represents the widget.
     * For wGallery widget returns the container element, for other widgets (video and images)
     * returns the image element inside the widget (and not the wrapper nor the drag-handler)
     */
    function getNativeWidgetElement(widget) {
        if (widget.name === 'image') {
            return widget.parts.image.$;
        }
        return widget.element.$;
    }

    function getSelectedWidget(editor) {
        function _isSelectedText() {
            var selection = editor.getSelection();
            return !!selection && selection.getSelectedText() !== null;
        }

        //copied from image2 plugin and modified to support galleries
        function _isCompWidget(widget) {
            var widgetName = widget && widget.name;
            if (widgetName) {
                return getNativeWidgetElement(widget).hasAttribute(WIX_COMP_JSON_ATTRIBUTE);
            }
            return false;
        }

        if (!_isSelectedText()) {
            var widget = editor.widgets.focused;
            if (_isCompWidget(widget)) {
                return widget;
            }

            widget = editor.widgets.selected[0];
            if (editor.widgets.selected.length === 1 && _isCompWidget(widget)) {
                return widget;
            }
        }

        return null;
    }

    function setFocusOnWidget(widget) {
        if (widget.editor.focusManager.hasFocus) {
            window.setTimeout(function () {
                widget.focus();
            });
        }
    }

    function _getRand4Chars() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(36); // string with 4 chars
    }

    function genRandId() {
        var timestampAsPrefix = Date.now().toString(36).substr(4);
        return timestampAsPrefix + _getRand4Chars();
    }

    function isTextNode(node) {
        return node.type === 3;
    }

    function isElementNode(node) {
        return node.type === 1;
    }

    var srcAttributeEscaper = {
        SRC_PLACEHOLDER: SRC_PLACEHOLDER,
        escape: function (textToEscape) {
            return textToEscape.replace(/src=/gi, SRC_PLACEHOLDER + '=');
        },
        unescape: function (textToUnescape) {
            return textToUnescape.replace(new RegExp(SRC_PLACEHOLDER + '=', 'gi'), 'src=');
        }
    };

    function getAllWixCompStringsFromHtml(htmlStr) {
        var i,
            wixCompStringsArray = [];

        var tempDomFragment = new CKEDITOR.dom.element('div');
        tempDomFragment.setHtml(srcAttributeEscaper.escape(htmlStr));

        var nodeListWithWixComp = tempDomFragment.find('[' + WIX_COMP_JSON_ATTRIBUTE + ']');

        for (i = 0; i < nodeListWithWixComp.count(); i++) {
            wixCompStringsArray.push(srcAttributeEscaper.unescape(nodeListWithWixComp.getItem(i).getAttribute(WIX_COMP_JSON_ATTRIBUTE)));
        }

        return wixCompStringsArray;
    }

    function _findSelectionTarget(elem) {
        var selectionTarget = elem.getPrevious();
        if (isNull(selectionTarget)) {
            //console.warn('using next because there is not previous element');
            selectionTarget = elem.getNext();
            if (isNull(selectionTarget)) {
                //console.warn('also next dont have previous');
                selectionTarget = elem.getParent();
            }
        }
        return selectionTarget;
    }

    function clearSelection(editor, widget) {
        var selectionTarget = _findSelectionTarget(widget.wrapper);
        var range = editor.createRange();
        range.setStartAt(selectionTarget, CKEDITOR.POSITION_BEFORE_END);
        range.setEndAt(selectionTarget, CKEDITOR.POSITION_BEFORE_END);
        editor.getSelection().selectRanges([range]);
        //console.log('clearing selection');
        //debugger;
    }

    function _getElementAtEndOfSelection(editor) {
        var selection = editor.getSelection(),
            range = selection && selection.getRanges()[0],
            endElement = range.endContainer;
        return isTextNode(endElement) ? endElement.getParent() : endElement;
    }

    function insertEmptyLineAfterElement(editor, element) {
        var currElem = _getElementAtEndOfSelection(editor),
            emptyLine = new CKEDITOR.dom.element('span');
        emptyLine.setHtml('&nbsp;');

        do {
            var cloneOfCurrentElem = currElem.clone();
            emptyLine = emptyLine.appendTo(cloneOfCurrentElem);
            currElem = currElem.getParent();
        } while (currElem && !currElem.isBlockBoundary());

        emptyLine.insertAfter(element);
    }

	function isIEOrFF(){
		return CKEDITOR.env.gecko || CKEDITOR.env.ie;
	}

    function updateWixCompAttrOnWidget(widget, keyValPairs) {
        var domObj = getNativeWidgetElement(widget);
        var oldJsonStr = domObj.getAttribute(WIX_COMP_JSON_ATTRIBUTE);
        var data = oldJsonStr ? JSON.parse(decodeURIComponent(oldJsonStr)) : {};
        assign(data, keyValPairs);
        domObj.setAttribute(WIX_COMP_JSON_ATTRIBUTE, JSON.stringify(data));
    }

	function isBlockElement(tagName){
		return !!CKEDITOR.dtd.$block[tagName];
	}

    /*      End Implementation for Tools functions     */

    var WIXTOOLS = {
        forEach: forEach,
        keys: keys,
        values: values,
        reduce: reduce,
        map: map,
        isNumber: isNumber,
        isObject: isObject,
        forOwn: forOwn,
        has: has,
        assign: assign,
        isFunction: isFunction,
        pick: pick,
        omit: omit,
        size: size,
        isEmpty: isEmpty,
        find: find,
        findIndex: findIndex,
        contains: contains,
        isNull: isNull,
        findWhere: findWhere,
        toArray: toArray,
        max: max,
        min: min,
        debounce: debounce,

        genRandId: genRandId,
        isTextNode: isTextNode,
        isElementNode: isElementNode,

        getAllWixCompStringsFromHtml: getAllWixCompStringsFromHtml,
        setFocusOnWidget: setFocusOnWidget,
        updateWixCompAttrOnWidget: updateWixCompAttrOnWidget,
        clearSelection: clearSelection,
        srcAttributeEscaper: srcAttributeEscaper,
        buildImageUrlWithScale: buildImageUrlWithScale,
        removeResizeSuffixFromImgUrl: removeResizeSuffixFromImgUrl,
        calcEditorWidth: calcEditorWidth,
        fixMissingSelection: fixMissingSelection,
        getSelectedWidget: getSelectedWidget,
        getNativeWidgetElement: getNativeWidgetElement,
        insertEmptyLineAfterElement: insertEmptyLineAfterElement,
        WIX_COMP_JSON_ATTRIBUTE: WIX_COMP_JSON_ATTRIBUTE,
        EDITOR_WIDTH_FALLBACK: EDITOR_WIDTH_FALLBACK,
		isIEOrFF: isIEOrFF,
		isBlockElement: isBlockElement
    };

    function exportToolsOnGlobalCKEditorPlugin() {
        if (!CKEDITOR.plugins.wixtools || isEmpty(CKEDITOR.plugins.wixtools)) {
            CKEDITOR.plugins.wixtools = assign({}, WIXTOOLS);
        }
    }

    CKEDITOR.plugins.add('wixtools', {
        onLoad: exportToolsOnGlobalCKEditorPlugin,
        init: function bindCalcEditorWidthToEditorObject(editor) {
            editor.calcEditorWidth = calcEditorWidth.bind(null, editor);
        }
    });

    //this object is shared between all the editor instances
    exportToolsOnGlobalCKEditorPlugin();

})();
