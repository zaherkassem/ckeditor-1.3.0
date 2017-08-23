(function(){

    function toArray(nodeList){
        return Array.prototype.slice.call(nodeList);
    }

    function copyAttributes(el, sourceEl){
        toArray(sourceEl.attributes).forEach(function(Attr){
            el.setAttribute(Attr.name, Attr.value);
        });
    }

    function addClassName(el, className){
        if(!className){
            return;
        }
        if (el.className && el.className.charAt(el.className.length-1) !== ' ') {
            el.className += ' ';
        }

        el.className += className;
    }

    function removeClassName(el, className){
        el.className = el.className.replace(new RegExp('(^|\\s)' + className + '(?:\\s|$)'), '$1'); //copied from mootools remove class
        if(el.className === ''){
            el.removeAttribute('class');
        }
    }

    function setStyles(el, styles){
        if(!styles){
            return;
        }
        for(var styleName in styles){
            el.style[styleName] = styles[styleName];
        }
    }

    function removeStyle(el, styleProperty){
        el.style[styleProperty] = '';
        if(el.style.cssText == ''){
            el.removeAttribute('style');
        }
    }

    function replaceNodeInline(oldEl, newEl){
        oldEl.parentNode.replaceChild(newEl, oldEl);
    }

    function createNewElement(el, newTag, className){
        var newEl = document.createElement(newTag);
        copyAttributes(newEl, el);
        addClassName(newEl, className);
        newEl.innerHTML = el.innerHTML;
        return newEl;
    }

    function convertEditorTagToWysTag(parserMaps, el){
        var wysTagAndClass = parserMaps.editorTagsToWysTagAndClass[el.tagName.toLowerCase()];
        if(wysTagAndClass){
            return createNewElement(el, wysTagAndClass.seoTag, wysTagAndClass.cssClass);
        }
        return null;
    }

    function convertWysTagToEditorTag(parserMaps, el){
        var wysTagName = el.tagName.toLowerCase();
//        if(!CKEDITOR.dtd.$block[wysTagName]){
//            return;
//        }
        var wysClassesToEditorTags = parserMaps.wysTagToWysClassToEditorTag[wysTagName];
        if(!wysClassesToEditorTags){
            return null;
        }
        var className = getExistingClassInMap(el, wysClassesToEditorTags);
        if(className){
            var newElement = createNewElement(el, wysClassesToEditorTags[className]);
            removeClassName(newElement, className);
            return newElement;
        }
        return null;
    }

    function  getConvertClassToStyleFunction(mapName, stylePropertyName){
        return function(parserMaps, el){
            if(el.tagName.toLowerCase() != 'span'){
                return null;
            }
            var map = parserMaps[mapName];
            var className = getExistingClassInMap(el, map);
            if(className){
                var newElement = createNewElement(el, 'span', null);
                newElement.style[stylePropertyName] = map[className];
                removeClassName(newElement, className);
                return newElement;
            }
            return null;
        };
    }

    function getConvertStyleToClassFunction(mapName, stylePropertyName, styleValueConverter){
        return function(parserMaps, el){
            if(el.tagName.toLowerCase() != 'span'){
                return null;
            }
            var styleValue = el.style && el.style[stylePropertyName];
            if(!styleValue){
                return;
            }
            if(styleValueConverter){
                styleValue = styleValueConverter(styleValue);
            }
            styleValue = styleValue.toLowerCase();
            var className = parserMaps[mapName][styleValue];
            if(className){
                var newElement = createNewElement(el, 'span', className);
                removeStyle(newElement, stylePropertyName);
                return newElement;
            }
            return null;
        };
    }

    function _convertRgbToHex(color){
        var hex = color;
        if(color.toLowerCase().indexOf('rgb') > -1){
            hex = CKEDITOR.tools.convertRgbToHex(color);
        }
        return hex;
    }

    function getExistingClassInMap(el, map){
        var classes = el.className.split(' ');
        var className;
        for(var index in classes){
            if(map[classes[index]]){
                className = classes[index];
                break;
            }
        }
        return className;
    }

    function fixChildren(parserMaps, node, conversionMethods){
        toArray(node.children).forEach(function(el){
            fixChildren(parserMaps, el, conversionMethods);
            var newElement = el;
            conversionMethods.forEach(function(method){
                var tempElement = method(parserMaps, newElement);
                newElement = tempElement || newElement;
            });
            if(newElement){
                replaceNodeInline(el, newElement);
            }
        });
        return node;
    }

    function removeScripts(data){
        var regexes = [
            // Script tags will also be forced to be protected, otherwise
            // IE will execute them.
            ( /<script[\s\S]*?<\/script>/gi ),

            // <noscript> tags (get lost in IE and messed up in FF).
            /<noscript[\s\S]*?<\/noscript>/gi
        ];
        for ( var i = 0; i < regexes.length; i++ ) {
            data = data.replace( regexes[ i ], "");
        }
        return data;
    }


    function hasClass(element, className){
        var clsList = element.classList;
        if (clsList) {
            for (var i = 0, maxLen = clsList.length; i < maxLen; i++) {
                if (className === clsList[i]) {
                    return true;
                }
            }
        }
        return false;
    }

    function encodeGalleryToImg(parserMaps, elem) {
        if (hasClass(elem, 'wg-container')) {
            var img = createNewElement(elem, 'img');
            img.innerHTML = '';
            return img;
        }
    }

    function decodeImgToGalleryDiv(parserMaps, elem) {
        if (hasClass(elem, 'wg-container')) {
            var div = createNewElement(elem, 'div');
            div.innerHTML = '';
            return div;
        }
    }

    CKEDITOR.plugins.add('wixParser', {
        init: function(editor){
            CKEDITOR.plugins.wixParser.resetTheMaps(editor.config);

            editor.on("setData", function(evtData){
                var tempWrapper = document.createElement('div');
                tempWrapper.innerHTML = evtData.data.dataValue;
                fixChildren(editor.config.wixParser, tempWrapper,[
                    convertWysTagToEditorTag,
                    decodeImgToGalleryDiv,
                    getConvertClassToStyleFunction('wysClassToColorMap', 'color'),
                    getConvertClassToStyleFunction('wysClassToBgColorMap', 'background-color')
                ]);
                evtData.data.dataValue = tempWrapper.innerHTML;
            });

            editor.on('getData', function(evtData){
                evtData.data.dataValue = removeScripts(evtData.data.dataValue);
                var tempWrapper = document.createElement('div');
                tempWrapper.innerHTML = evtData.data.dataValue;
                fixChildren(editor.config.wixParser, tempWrapper,[
                    encodeGalleryToImg,
                    convertEditorTagToWysTag,
                    getConvertStyleToClassFunction('colorToWysClassMap', 'color', _convertRgbToHex),
                    getConvertStyleToClassFunction('bgColorToWysClassMap', 'background-color', _convertRgbToHex)
                ]);
                var value = tempWrapper.innerHTML;
                //just to be on the safe side :)
                if(value == ""){
                    var tag = editor.config.enterMode == CKEDITOR.ENTER_DIV ? 'div' : 'p';
                    value = '<' + tag + '></' + tag + '>';
                }
                evtData.data.dataValue = value;
            });

        }
    });

    CKEDITOR.plugins.wixParser = {
        /**
         * initializes the following maps on editor config
         * editorTagsToWysTagAndClass - [tag name during editing]: {
         *      cssClass: [class name in the wysiwyg],
         *      seoTag: [tag name in the wysiwyg]
         *  }
         *  wysTagToWysClassToEditorTag - [tag name in the wysiwyg]:{
         *      [class name in the wysiwyg]: [tag name during editing],
         *      [class name in the wysiwyg]: [tag name during editing]
         *  }
         *  wysClassToColorMap - [wys class name] : [hex color value]
         *  colorToWysClassMap - [hex color value] : [wys class name]
         *  wysClassToBgColorMap - [wys class name] : [hex color value]
         *  bgColorToWysClassMap - [hex color value] : [wys class name]
         * @param config
         */
        resetTheMaps: function(config){
            config.wixParser = {};
            var editorTagsToWysTagAndClass = config.wixParser.editorTagsToWysTagAndClass = config.stylesMap;
            var wysTagToWysClassToEditorTag = config.wixParser.wysTagToWysClassToEditorTag = {};
            this._forEach(editorTagsToWysTagAndClass, function(WysTagAndClass, tag){
                wysTagToWysClassToEditorTag[WysTagAndClass.seoTag] = wysTagToWysClassToEditorTag[WysTagAndClass.seoTag] || {};
                wysTagToWysClassToEditorTag[WysTagAndClass.seoTag][WysTagAndClass.cssClass] = tag;
            });

            this._resetStylePropertyMap(config, 'wysClassToColorMap', 'colorToWysClassMap', config.colorsMap);
            this._resetStylePropertyMap(config, 'wysClassToBgColorMap', 'bgColorToWysClassMap', config.bgColorsMap);
        },

        _resetStylePropertyMap: function(config, classToStyleMapName, styleToClassMapName, classToStyleMap){
            classToStyleMap = config.wixParser[classToStyleMapName] = (classToStyleMap && this._forEach(classToStyleMap, function(val, key){
                classToStyleMap[key] = classToStyleMap[key].toLowerCase();
            })) || {};
            var styleToClassMap = config.wixParser[styleToClassMapName] = {};
            this._forEach(classToStyleMap, function(styleValue, className){
                styleToClassMap[styleValue] = className;
            });
        },

        //we cannot count on mootools or lodash presence
        _forEach: function(obj, func) {
            for (var prop in obj) {
                // important check that this is objects own property
                // not from prototype prop inherited
                if(obj.hasOwnProperty(prop)){
                    func(obj[prop], prop);
                }
            }

            return obj;
        }
    }

})();



