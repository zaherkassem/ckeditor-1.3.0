(function(){

    var TOOLS;
    var STYLES_TO_COLLECT = ['font-size', 'font-style', 'text-decoration', 'font-weight', 'text-align', 'direction'];
    var THEME_COMMANDS = ['fontSize', 'bold', 'unBold', 'italic', 'unItalic', 'fontFamily', 'foreColor'];
    var STYLES_COMMANDS = ['underline', 'textShadow', 'backColor', 'letterSpacing'];

    var BODY_COMPUTED_STYLES = {
        _ckIdToStyle: {},
        getWithCache: function (editor){
            var id = editor.id;
            if (!this._ckIdToStyle.hasOwnProperty(id)){
                this.addEditorToCache(editor);
            }
            return this._ckIdToStyle[id];
        },
        addEditorToCache: function (editor){
            function duplicateObj(obj){
                return JSON.parse(JSON.stringify(obj));
            }

            var id = editor.id;
            if (!this._ckIdToStyle.hasOwnProperty(id)){
                var style = window.getComputedStyle(editor.document.getBody().$);
                this._ckIdToStyle[id] = duplicateObj(style);
            }
        }
    };

    function getSelectionRange(editor){
        var selection = editor.getSelection(),
            retVal;
        if (selection) {
            var ranges = selection.getRanges();
            retVal = ranges && ranges[0];
        }
        return retVal;
    }

    function generateSelectionRangeWrapper(selectedRange, editor) {
        var selectionAncestor = _findBlockBounderyAncestor();

        function _isTextNode(node){
            node = node.$ || node;
            return node.nodeType === 3;
        }

        function _findBlockBounderyAncestor(){
            var ancestor = selectedRange.getCommonAncestor();
            if (ancestor && _isTextNode(ancestor)){
                ancestor = ancestor.getParent();
            }
            while(ancestor && !ancestor.isBlockBoundary()){
                ancestor = ancestor.getParent();
            }
            return ancestor;
        }

        function getStyleMap(element){
            function _getAncestorComputedStyle(){
                var isBodyElement = (selectionAncestor.$.nodeName === 'BODY');
                return (isBodyElement)? BODY_COMPUTED_STYLES.getWithCache(editor): window.getComputedStyle(selectionAncestor.$);
            }

            function _mergeStylesToCheckThatNotInDest(styleSrcMap, styleDestMap){
                STYLES_TO_COLLECT.forEach(function (style){
                    if (!!styleSrcMap[style] && !styleDestMap.hasOwnProperty(style)){
                        styleDestMap[style] = styleSrcMap[style];
                    }
                });
            }

            var elementStyleMap = {};
            element = _isTextNode(element)? element.getParent(): element;
            while (selectionAncestor.$ !== element.$) {
                var inlineStyles = element.$.style;
                _mergeStylesToCheckThatNotInDest(inlineStyles, elementStyleMap);
                element = element.getParent();
            }
            // fill all missing styles from ancestor's computed styles
            var ancestorStyles = _getAncestorComputedStyle();
            _mergeStylesToCheckThatNotInDest(ancestorStyles, elementStyleMap);
            return elementStyleMap;
        }

        function getTextNodesIterator(){
            var innerIterator = new CKEDITOR.dom.walker(selectedRange);

            function getNextTextNode (){
                var nextNode = innerIterator.next();
                while (nextNode && !_isTextNode(nextNode)){
                    nextNode = innerIterator.next();
                }
                return nextNode;
            }

            return {
                getNextTextNode: getNextTextNode
            };
        }

        return {
            getInheritedStyle: getStyleMap,
            getTextNodesIterator: getTextNodesIterator
        };
    }

    function cacheBodyStyle(editor) {
        BODY_COMPUTED_STYLES.addEditorToCache(editor);
    }

    CKEDITOR.plugins.add( 'styleCommands', {
        requires: 'wixstylecmndshelper,basicstyles,wixtools',
        init: function( editor ) {
            //we should get here on any initialization of an editor, and only then
            new StyleCommands(editor);
            TOOLS = CKEDITOR.plugins.wixtools; // available on CKEDITOR once finished to register all enabled plugins
        },
        /**
         * The algorithm iterates each textNode in the selection: traverse from the textNode up to the common
         * ancestor of the selection, and aggregates the computed style of that textNode (returns a css key-value map).
         * During the traverse
         *
         *
         * , when find a conflict in the computed style of 2 textNodes, add the conflicted css-key
         * into an array. Finally returns that array.
         */
        getConflictedStylesInSelection: function (editor){
            var conflictedStyleNames = [];
            var stylesMap = this.getStylesMapInSelection(editor);
            TOOLS.forOwn(stylesMap, function(valuesArr, styleName){
                if (valuesArr.length > 1){
                    conflictedStyleNames.push(styleName);
                }
            });
            return conflictedStyleNames;
        },
        /**
         * The algorithm iterates each textNode in the selection: traverse from the textNode up to the common
         * ancestor of the selection, and aggregates the computed style of that textNode (returns a css key-value map).
         * During the traverse
         *
         * return a map from style name to array of its values in the current selection
         *
         */
        getStylesMapInSelection: function (editor){
            cacheBodyStyle(editor);
            var range = getSelectionRange(editor),
                retVal = {};

            TOOLS.forEach(STYLES_TO_COLLECT, function(styleName) {
                retVal[styleName] = [];
            });

            if (!range){
                return retVal;
            }

            var rangeWrapper = generateSelectionRangeWrapper(range, editor),
                iterator = rangeWrapper.getTextNodesIterator(),
                textNode;

            while ((textNode = iterator.getNextTextNode())) {
                var textNodeStyleMap = rangeWrapper.getInheritedStyle(textNode);
                TOOLS.forOwn(textNodeStyleMap, function(val, key) {
                    var styleValues = retVal[key];
                    if (!TOOLS.contains(styleValues, val)) {
                        styleValues.push(val);
                    }
                });
            }
            return retVal;
        }
    });

    function attachStyleStateChange(editor, unBoldStyle, commandName) {
        editor.attachStyleStateChange(unBoldStyle, function (state) {
            !editor.readOnly && editor.getCommand(commandName).setState(state);
        });
    }

    function createUnBoldCommand(config, editor) {
        var unBoldStyle = new CKEDITOR.style(config.coreStyles_unbold);

        attachStyleStateChange(editor, unBoldStyle, 'unBold');

        editor.addCommand('unBold', new CKEDITOR.styleCommand(unBoldStyle, {
            contentForms: [
                [ 'span', function (el) {
                    var fw = el.styles[ 'font-weight' ];
                    return fw === 'normal' || fw < 700;
                } ]
            ]
        }));
    }

    function createUnItalicCommand(config, editor) {
        var unItalicStyle = new CKEDITOR.style(config.coreStyles_unitalic);

        // Listen to contextual style activation.
        attachStyleStateChange(editor, unItalicStyle, 'unItalic');

        editor.addCommand('unItalic', new CKEDITOR.styleCommand(unItalicStyle, {
            contentForms: [
                [ 'span', function (el) {
                    var fw = el.styles[ 'font-style' ];
                    return fw === 'normal';
                } ]
            ]
        }));
    }

    function createResetThemeCommands(editor) {
        function createResetCommand(commands) {
            return {
                exec : function( editor ) {
                    editor.undoManager.save();
                    editor.undoManager.lock(true);

                    var i, command;
                    for (i = 0; i < commands.length; i++) {
                        command = editor.getCommand(commands[i]);
                        if (command.style) {
                            editor.removeStyle(command.style);
                        } else {
                            command.exec(CKEDITOR.TRISTATE_OFF);
                        }
                    }

                    editor.undoManager.unlock();
                },
                canUndo : true
            };
        }

        editor.addCommand( 'resetTheme', createResetCommand(THEME_COMMANDS));
        editor.addCommand( 'resetThemeAndStyles', createResetCommand(THEME_COMMANDS.concat(STYLES_COMMANDS)));
    }

    var StyleCommands = function(editor){
        this._initColorStyles(editor);
        var config = editor.config;
        editor.addCommand( 'foreColor', new commandDefinitionWithNoFocus(editor, config.foreColor_style, 'color' ) );
        editor.addCommand( 'backColor', new commandDefinitionWithNoFocus(editor, config.backColor_style, 'color') );
        editor.addCommand( 'fontFamily', new commandDefinitionWithNoFocus(editor, config.fontFamily_style, 'family') );
        var shadowCommand = editor.addCommand( 'textShadow', new commandDefinition(editor, config.textShadow_style, 'shadow') );
        shadowCommand.on('beforeExec', this._trimSelection, this);

        var cmdSize = editor.addCommand( 'fontSize', new fontSizeCommandDefinition(editor, config.fontSize_style, 'size') );

        /** testing format block to remove formatting before applying the style **/
        this._formatBlockCommand = editor.addCommand( 'formatBlock', new commandDefinition(editor, config.formatBlock_style, 'tag') );
        this._formatBlockCommand.on('beforeExec', this._removeFormatting, this);

        this._cmdLineHeight = editor.addCommand( 'lineHeight', new lineHeightCommandDefinition(editor, config.lineHeight_style, 'size') );
        this._cmdLetterSpacing = editor.addCommand( 'letterSpacing', new commandDefinition(editor, config.letterSpacing_style, 'size') );
        //this is in order to apply the command to the whole paragraph
        this._cmdLineHeight.on('beforeExec', this._enlargeSelectionToBlock, this);
        this._cmdLineHeight.on('afterExec', this._restoreSelection, this);
        cmdSize.on('afterExec', this._applySpacingCommandsAfterSize, this);

        createUnBoldCommand(config, editor);
        createUnItalicCommand(config, editor);
        createResetThemeCommands(editor);
    };

    StyleCommands.prototype = {
        // taken from the colorbutton plugin
        _initColorStyles: function(editor){
            //return true if filter is not empty - a fix for the ie, so that the background will be outer to the text shadow effect in ie9
            function hasShadowStyle(element) {
                return element.$.style.filter != "" || element.$.style.textShadow != "";
            }

            editor.config.backColor_style.childRule = function( element ) {
                // It's better to apply background color as the innermost style. (#3599)
                // Except for "unstylable elements". (#6103)
                return this._isUnstylable(element) || hasShadowStyle(element);
            }.bind(this);
            editor.config.foreColor_style.childRule =  function( element ) {
                // Fore color style must be applied inside links instead of around it. (#4772,#6908)
                return !( element.is( 'a' ) || element.getElementsByTag( 'a' ).count() ) || this._isUnstylable( element );
            }.bind(this);
        },

        _selectionId: null,
        _removeFormatting: function(evtData){

            var editor = evtData.editor;
            //check if we are in fix dom, if yes it means we are applying on orphan text that doesn't need reset. The reset caused errors both in IE and FF
            if (!editor.plugins.wixpreservestyle.stylePreserver.inFixDom) {
                this._enlargeSelectionToBlock(evtData);
                editor.execCommand('resetThemeAndStyles');
                this._restoreSelection(evtData);
            }

        },
        _enlargeSelectionToBlock: function(evtData){
            var editor = evtData.editor;

            var sel = editor.getSelection();
            if (!sel) {
                return;
            }

            var range = sel.getRanges()[0];
            if (!range) {
                return;
            }

            this._selectionId = CKEDITOR.plugins.wixstylecmndshelper.saveCurrentSelection(editor);
            range.enlarge(CKEDITOR.ENLARGE_BLOCK_CONTENTS);
            try {
                // this sometimes fail IE
                range.select();
            }
            catch (e) {
                // suppress..
                this._selectionId = null;
            }
        },
        _trimSelection: function(evtData){
            var editor = evtData.editor;

            var sel = editor.getSelection();
            if (!sel) {
                return;
            }

            var range = sel.getRanges()[0];
            if (!range) {
                return;
            }

            var trimmed  = false;

            if ( range.endContainer.type == CKEDITOR.NODE_TEXT) {
                var nodeText =  range.startContainer.getText();
                while (range.endOffset>0 && nodeText.substr( range.endOffset -1 , 1 ) == ' ') {
                    range.endOffset -= 1;
                    trimmed = true;
                }
            }

            if ( range.startContainer.type == CKEDITOR.NODE_TEXT) {
                var length = range.startContainer.getLength();
                var nodeText =  range.startContainer.getText();
                while (range.startOffset < length-1 && nodeText.substr( range.startOffset, 1 ) == ' ') {
                    range.startOffset += 1;
                    trimmed = true;
                }
            }

            if ( trimmed )
                range.select();
        },

        _enlargeSelectionToStyleElement: function(editor, style){
            var selection = editor.getSelection();
            if(!selection){
                return;
            }
            var path = editor.elementPath();
            var elements = style && style.findMatchingElements(path);
            var element = elements && elements.length && elements[0];
            if(element){
                this._selectionId = CKEDITOR.plugins.wixstylecmndshelper.saveCurrentSelection(editor);
                selection.selectElement(element);
                return true;
            }
            return false;
        },

        _restoreSelection: function(evtData){
            var editor = evtData.editor;
            if(this._selectionId)
                CKEDITOR.plugins.wixstylecmndshelper.restoreCurrentSelection(editor, this._selectionId);
            this._selectionId = null;
        },
        _isUnstylable: function(ele){
            return ( ele.getAttribute( 'contentEditable' ) == 'false' ) || ele.getAttribute( 'data-nostyle' );
        },
        _applySpacingCommandsAfterSize: function(evtData){
            var editor = evtData.editor;
            var selection = editor.getSelection();
            if(!selection){
                return;
            }
            selection.ignoreFillingCharRemoveOnSelectionChange();
            if(this._cmdLetterSpacing.state != CKEDITOR.TRISTATE_OFF){
                //this do this so that the selection won't be collabsed, cause other wise it will remove the
                //letter spacing all together (expected behavior in ck)
                var enlarged = this._enlargeSelectionToStyleElement(editor, this._cmdLetterSpacing._getStyleToApply(this._cmdLetterSpacing.state));
                this._execCommandSilently(editor, 'letterSpacing', this._cmdLetterSpacing.state);
                enlarged && this._restoreSelection(evtData);
            }
            if(this._cmdLineHeight.state != CKEDITOR.TRISTATE_OFF){
                //we don't enlarge the selection here because in line height case it happens any way
                this._execCommandSilently(editor, 'lineHeight', this._cmdLineHeight.state);
            }
            selection.resumeFillingCharRemoveOnSelectionChange();
        },
        _execCommandSilently: function(editor, cmdName, cmdValue){
            editor.fire('lockSnapshot');
            editor.execCommand(cmdName, cmdValue);
            editor.fire('unlockSnapshot');
        }
    };

    // Clones the subtree between subtreeStart (exclusive) and the
    // leaf (inclusive) and inserts it into the range.
    //
    // @param range
    // @param {CKEDITOR.dom.element[]} elements Elements path in the standard order: leaf -> root.
    // @param {CKEDITOR.dom.element/null} substreeStart The start of the subtree.
    // If null, then the leaf belongs to the subtree.
    function cloneSubtreeIntoRange( range, elements, subtreeStart ) {
        var current = elements.pop();
        if ( !current ) {
            return;
        }
        // Rewind the elements array up to the subtreeStart and then start the real cloning.
        if ( subtreeStart ) {
            return cloneSubtreeIntoRange( range, elements, current.equals( subtreeStart ) ? null : subtreeStart );
        }

        var clone = current.clone();
        range.insertNode( clone );
        range.moveToPosition( clone, CKEDITOR.POSITION_AFTER_START );

        cloneSubtreeIntoRange( range, elements );
    }

    function fixCurrentStyle(editor, command, value) {
        //@Noam Inspired\Copied from font\plugin - 19/05/2015

        var previousValue = command.state;

        // When applying one style over another, first remove the previous one (#12403).
        // NOTE: This is only a temporary fix. It will be moved to the styles system (#12687).
        if ( previousValue && value != previousValue ) {
            var commandStyle = command._generalStyle,
                range = editor.getSelection().getRanges()[ 0 ];

            // If the range is collapsed we can't simply use the editor.removeStyle method
            // because it will remove the entire element and we want to split it instead.
            if ( range.collapsed ) {
                var path = editor.elementPath(),
                // Find the style element.
                    matching = path.contains( function( el ) {
                        return commandStyle.checkElementRemovable( el );
                    } );

                if ( matching ) {
                    var startBoundary = range.checkBoundaryOfElement( matching, CKEDITOR.START ),
                        endBoundary = range.checkBoundaryOfElement( matching, CKEDITOR.END ),
                        node, bm;

                    // If we are at both boundaries it means that the element is empty.
                    // Remove it but in a way that we won't lose other empty inline elements inside it.
                    // Example: <p>x<span style="font-size:48px"><em>[]</em></span>x</p>
                    // Result: <p>x<em>[]</em>x</p>
                    if ( startBoundary && endBoundary ) {
                        bm = range.createBookmark();
                        // Replace the element with its children (TODO element.replaceWithChildren).
                        while ( ( node = matching.getFirst() ) ) {
                            node.insertBefore( matching );
                        }
                        matching.remove();
                        range.moveToBookmark( bm );

                        // If we are at the boundary of the style element, just move out.
                    } else if ( startBoundary ) {
                        range.moveToPosition( matching, CKEDITOR.POSITION_BEFORE_START );
                    } else if ( endBoundary ) {
                        range.moveToPosition( matching, CKEDITOR.POSITION_AFTER_END );
                    } else {
                        // Split the element and clone the elements that were in the path
                        // (between the startContainer and the matching element)
                        // into the new place.
                        range.splitElement( matching );
                        range.moveToPosition( matching, CKEDITOR.POSITION_AFTER_END );
                        cloneSubtreeIntoRange( range, path.elements.slice(), matching );
                    }

                    editor.getSelection().selectRanges( [ range ] );
                }
            } else {
                editor.removeStyle( commandStyle );
            }
        }
    }

    var commandDefinition = function(editor, styleTemplateDefinition, paramName){
        if(!editor){
            return;
        }
        this._initCommand(editor, styleTemplateDefinition, paramName);
    };
    commandDefinition.prototype = {
        _initCommand: function(editor, styleTemplateDefinition, paramName){
            this._styleTemplateDefinition = styleTemplateDefinition;
            this._paramName = paramName;
            this._paramsMap = {};
            this._paramsMap[paramName] = 'inherit';
            this._generalStyle = new CKEDITOR.style(this._styleTemplateDefinition, this._paramsMap);
            this._stylesCache = {};
        },
        exec: function(editor, paramValue){
            this.fire('beforeExec', null, editor);
            if (this.editorFocus) {
                editor.focus();
            }
            this._applyCommand(editor, paramValue);
            this.fire('afterExec', null, editor);
        },
        _applyCommand: function(editor, paramValue){
            //Either remove current style to prevent nested style or change the selection range so that the
            //current style will be fixed\removed when applying the new style later
            fixCurrentStyle(editor, this, paramValue);

            if(paramValue !== CKEDITOR.TRISTATE_OFF){
                var styleToApply = this._getStyleToApply(paramValue);
                //remove related style from selection so that there won't be nested styles
                editor.applyStyle(styleToApply);
            } else {
                editor.removeStyle( this._generalStyle )
            }
            return true;
        },

        _applyOnRangeBlocks: function(range, styleName, paramValue){
            var isAddingStyle = paramValue !== CKEDITOR.TRISTATE_OFF;
            var iterator = range.createIterator();
            var block;
            while ( (block = iterator.getNextParagraph() ) ) {
                if (block.createdByIterator && block.getText() === "") {
                    //was create by the iterator, need to be removed
                    block.remove();
                } else if ( !block.isReadOnly() ) {
                    if(isAddingStyle){
                        block.setStyle(styleName, paramValue);
                    } else{
                        block.removeStyle(styleName);
                    }
                }
            }
        },

    contextSensitive : true,
        _findFirstValidValue: function (fieldNames, element, getterFunctionName) {
            var value;
            var getter = element[getterFunctionName].bind(element);
            for (var i = 0; i < fieldNames.length; i++) {
                value = getter(fieldNames[i]);
                if (value || value === 0) {
                    return value;
                }
            }
            return undefined;
        },

        _findFirstValidStyle: function (styleNames, element) {
            return this._findFirstValidValue(styleNames, element, "getStyle");
        },
        _findFirstValidAttribute: function (attributeNames, element) {
            return this._findFirstValidValue(attributeNames, element, "getAttribute");
        },

        _getState: function (stylesElements, isElementParam) {
            var state;
            var styledElement = stylesElements[0];
            var attributeNames = this._findMatchingMapKeys(this._styleTemplateDefinition.attributes);
            var styleNames = this._findMatchingMapKeys(this._styleTemplateDefinition.styles);
            if (isElementParam)
                state = styledElement.getName();
            else if (attributeNames.length > 0) {
                state = this._findFirstValidAttribute(attributeNames, styledElement);
            } else if (styleNames.length > 0) {
                state = this._findFirstValidStyle(styleNames, styledElement);
            } else
                throw "";
            return state;
        },

        /**
         * this method is called on each selection change
         * @param editor
         * @param elementPath
         */
        refresh: function(editor, elementPath){
            var isElementParam = (this._findMatchingMapKeys(this._styleTemplateDefinition)).length > 0;

            var stylesElements = isElementParam ? [elementPath.block || elementPath.blockLimit]
                : this._generalStyle.findMatchingElements(elementPath) ;
            var state;
            if(stylesElements.length > 1)
                if (CKEDITOR.wixDocumentServices) {
                    //send bi event, as defined in santa editor file errors.json
                    CKEDITOR.wixDocumentServices.bi.error({
                        "errorName": "TEXT_NESTED_STYLES",
                        "errorCode": 12901,
                        "severity": "error"
                    });
                } else {
                    console.log("there shouldn't be nested styles of the same type");
                }
            if(stylesElements.length == 0)
                state = CKEDITOR.TRISTATE_OFF;
            else{
                state = this._getState(stylesElements, isElementParam);
            }
            this.setState(state);
        },

        _varRegex: /#\((.+?)\)/,

        _findMatchingMapKeys: function(map){
            var results = [];
            for(var key in map){
                if(typeof( map[ key ] ) != 'string')
                    continue;
                if(this._varRegex.test( map[ key ] + '')){
                    results.push(key);
                }
            }
            return results;
        },

        _getStyleToApply: function(paramValue){
            this._paramsMap[this._paramName] = paramValue;
            var styleToApply = this._stylesCache[paramValue];
            if(!styleToApply){
                styleToApply = new CKEDITOR.style(this._styleTemplateDefinition, this._paramsMap);
                this._stylesCache[paramValue] = styleToApply;
            }
            return styleToApply;
        }

    };

    var lineHeightCommandDefinition = function(editor, styleTemplateDefinition, paramName){
        this._initCommand(editor, styleTemplateDefinition, paramName);
    };
    lineHeightCommandDefinition.prototype = new commandDefinition();

    lineHeightCommandDefinition.prototype.exec = function(editor, paramValue){
        this.fire('beforeExec', null, editor);
        editor.focus();
        editor.fire( 'saveSnapshot' );
        //in IE when changing line height to a smaller when the page isn't repainted..
        if(CKEDITOR.env.ie && paramValue !== CKEDITOR.TRISTATE_OFF){
            this._applyCommand(editor, CKEDITOR.TRISTATE_OFF);
            this._applyLineHeightOnBlock(editor, CKEDITOR.TRISTATE_OFF);
        }
        var isDomChanging =  this._applyCommand(editor, paramValue);
        isDomChanging && this._applyLineHeightOnBlock(editor, paramValue);
        editor.fire( 'saveSnapshot' );
        this.fire('afterExec', null, editor);
    };

    lineHeightCommandDefinition.prototype._applyLineHeightOnBlock = function(editor, paramValue){
        var sel =  editor.getSelection();
        if(!sel){
            return;
        }
        var range = sel.getRanges()[0];
        if(!range){
            return;
        }

        this._applyOnRangeBlocks(range, 'line-height', paramValue);
    };

    var fontSizeCommandDefinition = function(editor, styleTemplateDefinition, paramName){
        this._initCommand(editor, styleTemplateDefinition, paramName);
    };
    fontSizeCommandDefinition.prototype = new commandDefinition();

    fontSizeCommandDefinition.prototype._applyCommand = (function(){
        var original_applyCommand = commandDefinition.prototype._applyCommand;
        return function(editor, paramValue) {
            this._applyOnSelectedBlocks(editor, paramValue);
            original_applyCommand.call(this, editor, paramValue);
        }
    })();

    fontSizeCommandDefinition.prototype._applyOnSelectedBlocks = function(editor, paramValue){
        var sel =  editor.getSelection();
        if(!sel){
            return;
        }
        var range = sel.getRanges()[0];
        if(!range){
            return;
        }

        if (range.endContainer.type != 3 /*text node*/ ) {
            //check if we have select BR as the last container
            var children = range.endContainer.getChildren();
            var endElement = children.getItem(range.endOffset);
            if (endElement != null && endElement.$.nodeName === 'BR') {
                range.setEndAfter(endElement);
            }
        }

        var trimmedRange = this._trimPartialBlocksFromRange(range);

        if (trimmedRange != null) {
            this._applyOnRangeBlocks(trimmedRange, 'font-size', paramValue);
        }

        //restore selection... sanity call
        range.select();
    };

    fontSizeCommandDefinition.prototype._trimPartialBlocksFromRange = function(range){
        var isBlockStart = range.checkStartOfBlock();
        var isBlockEnd = range.checkEndOfBlock();

        var startBlock = this._getBlockParent(range.startPath());
        var endBlock = this._getBlockParent(range.endPath());

        if (isBlockStart && isBlockEnd) {
            //start and end block container are fully included in range
            return range;
        }

        if (endBlock.getUniqueId() === startBlock.getUniqueId()) {
            //start & end are in the same block but not fully selected - empty range
            return null;
        }

        //selection spans over more than one block, remove partially selected blocks
        var resultRange = range.clone();
        if (!isBlockStart){
            //start block is partially selected
            resultRange.setStartAfter(startBlock);
        }

        if (!isBlockEnd && (range.endContainer.getName() != "body")) { //a fix for IE issue, sometimes the end container is body - cannot start before body it will point to html (or head) tag ...
            //end block is partially selected
            resultRange.setEndBefore(endBlock);
        }

        return resultRange;
    };

    fontSizeCommandDefinition.prototype._getBlockParent = function(path) {
        return (path.block === null ? path.blockLimit : path.block);
    };

    /**
     * Making new command definition that is a child of commandDefinition class, but with property: editorFocus = false.
     * All other behaviour (i.e. props & methods) are exactly the same as the original commandDefinition.
     */
    var commandDefinitionWithNoFocus = function(){
        commandDefinition.apply(this, arguments);
    };
    commandDefinitionWithNoFocus.prototype = Object.create(commandDefinition.prototype);
    commandDefinitionWithNoFocus.prototype.constructor = commandDefinitionWithNoFocus;
    commandDefinitionWithNoFocus.prototype.editorFocus = false;


 })();

CKEDITOR.config.fontSize_style = {
    element: 'span',
    styles: { 'font-size': '#(size)' },
    overrides: [ {
        element: 'font', attributes: { 'size': null }
    }]
};
CKEDITOR.config.foreColor_style = {
    element: 'span',
    styles: { 'color': '#(color)' },
    overrides: [ {
        element: 'font', attributes: { 'color': null }
    }]
};

/**
 * Stores the style definition that applies the text background color.
 *
 *		// This is actually the default value.
 *		config.colorButton_backStyle = {
 *			element: 'span',
 *			styles: { 'background-color': '#(color)' }
 *		};
 *
 * @cfg [colorButton_backStyle=see source]
 * @member CKEDITOR.config
 */
CKEDITOR.config.backColor_style = {
    element: 'span',
    styles: { 'background-color': '#(color)' }
};
CKEDITOR.config.fontFamily_style = {
    element: 'span',
    styles: { 'font-family': '#(family)' },
    overrides: [ {
        element: 'font', attributes: { 'face': null }
    }]
};
CKEDITOR.config.textShadow_style = {
    element: 'span',
    styles: { 'text-shadow': '#(shadow)'}
};
CKEDITOR.config.formatBlock_style = {
    element: '#(tag)'
};

CKEDITOR.config.lineHeight_style = {
    element: 'span',
    styles: { 'line-height': '#(size)' },
    childRule: function(el){
        return !el.getStyle('font-size');
    }
};
CKEDITOR.config.lineHeight_blockStyle = {
    element: /p|div/,
    //styles: { 'line-height': '#(size)' }
    styles: { 'line-height': '1em' }
};
CKEDITOR.config.letterSpacing_style = {
    element: 'span',
    styles: { 'letter-spacing': '#(size)' },
    childRule: function(el){
        return !el.getStyle('font-size');
    }
};

/* bold italic and underline */
CKEDITOR.config.coreStyles_bold = {
    element: 'span',
    attributes: {'style' : 'font-weight:bold'},
    overrides: ['strong','b'],
    childRule: function(el) {
        return (el.$.style.textShadow === ""); //if child (el) has shadow he cannot be a child of underline
    }
};
CKEDITOR.config.coreStyles_unbold = {
    element: 'span',
    attributes: {'style' : 'font-weight:normal'},
    childRule: function(el) {
        return (el.$.style.textShadow === ""); //if child (el) has shadow he cannot be a child of underline
    }
};
CKEDITOR.config.coreStyles_italic = {
    element: 'span',
    attributes: {'style' : 'font-style:italic'},
    overrides: ['em','i'],
    childRule: function(el) {
        return (el.$.style.textShadow === ""); //if child (el) has shadow he cannot be a child of underline
    }
};
CKEDITOR.config.coreStyles_unitalic = {
    element: 'span',
    attributes: {'style' : 'font-style:normal'},
    childRule: function(el) {
        return (el.$.style.textShadow === ""); //if child (el) has shadow he cannot be a child of underline
    }
};
CKEDITOR.config.coreStyles_underline = {
    element: 'span',
    attributes: {'style' : 'text-decoration:underline'},
    overrides: ['u'],
    childRule: function(el) {
        return (el.$.style.textShadow === ""); //if child (el) has shadow he cannot be a child of underline
    }
};
