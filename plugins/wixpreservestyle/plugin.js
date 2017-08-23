(function(){

    CKEDITOR.plugins.add('wixpreservestyle', {
        requires: 'wixstylecmndshelper',
        init: function( editor ){
            this.stylePreserver = new StylePreserver(editor);
        },
        fixDom: function(editor) {
            this.stylePreserver._fixDom(editor);
        },
        getSavedStyles: function(editor) {
            this.stylePreserver._verifyFormatBlockCommand(editor);
            return this.stylePreserver._cmdValues;
        }
    });

    var StylePreserver = function(editor){
        var self = this;
        editor.on('selectionChange', function(evtData){
            if (!editor.plugins.wixComp || editor.plugins.wixComp.getCompWidget(editor) === null) {
                //execute preserve style if wixComp plugin is not used (defined) or the selection is not of a wix component widget
                self._ExecutePlugin(this);
            }
        });

        editor.on('beforeCommandExec', function(evtData){
            if(self._locked  || editor.noFixDom)
                return;
            var cmdName = evtData.data.name;
            if(cmdName == 'removeFormat'){
                for(var cmd in self._cmdValues){
                    if(cmd != 'formatBlock')
                        self._cmdValues[cmd] = CKEDITOR.TRISTATE_OFF;
                }
            }
            if(cmdName != "source" && cmdName != "autogrow")
                self._fixDom(this);
        });
    };

    StylePreserver.prototype = {
        _cmdValues: {},
        _locked: false,

        _ExecutePlugin: function (editor){
            if(this._locked || editor.noFixDom)
                return;
            this._fixDom(editor);
            this._saveCurrentStyle(editor);
        },

        _saveCurrentStyle: function (editor){
            var newCmdValues = CKEDITOR.plugins.wixstylecmndshelper.getCurrentActiveStyles(editor);
            if(newCmdValues){
                CKEDITOR.plugins.wixstylecmndshelper.applyCmdStylesToElement(editor, editor.editable(), newCmdValues, this._cmdValues);
                this._cmdValues = newCmdValues;
            }
        },

        _fixFontTags: function(editor) {
            function convertToSpan(fontTag, attributeName, convertToStyle) {
                var value = fontTag.getAttribute(attributeName);
                if (value) {
                    var span = editor.document.createElement('span');
                    span.setStyle(convertToStyle, value);
                    return span;
                }
            }

			var fontTags = editor.document.getElementsByTag('font');
			if (fontTags.count() < 1){
				return;
			}
			var selection = editor.getSelection();
			if (selection) {
				var range = selection.getRanges()[0];
			}
			if (range) {
				var bookmark = range.createBookmark(true);
			}
            var i, j;
            for (i=0; i< fontTags.count(); i++) {
                var fontTag = fontTags.getItem(i);

                var fontStyleSpans = [];
                fontStyleSpans.push(convertToSpan(fontTag, 'face', 'font-family'));
                fontStyleSpans.push(convertToSpan(fontTag, 'color', 'color'));
                fontStyleSpans.push(convertToSpan(fontTag, 'size', 'font-size'));

                var parent = fontTag.getParent();
                fontTag.remove();

                for (j=0; j< fontStyleSpans.length; j++) {
                    if (fontStyleSpans[j]) {
                        parent.append(fontStyleSpans[j]);
                        parent = fontStyleSpans[j];
                    }
                }

                parent.setHtml(fontTag.getHtml());
            }

			if (range && bookmark) {
				range.moveToBookmark(bookmark);
				selection.selectRanges([range]);
			}
        },
        _fixDom: function (editor){
            this.inFixDom = true;
			var dataBeforeFix = editor.getData();

			try {
                this._locked = true;
                this._verifyFormatBlockCommand(editor);

               this._fixFontTags(editor);

                var editable = editor.editable();
                //might be needed in the recursive so that there won't be empty li and such
                if (editable.getChildren().count() === 0) {
                    this._applyStyleOnRealRange(editor);
                } else {
                    this._fixDomRecursive(editor, editable);
                }
            } catch(ex) {
                console.log('error in fixDom ' + ex.message);
            }

            this._locked = false;
            this.inFixDom = false;

            if (dataBeforeFix !== editor.getData()) {
                editor.fire('change');
            }
        },

        _fixDomRecursive: function(editor, parent){
            this._removeEmptyNodes(parent.getChildren());
            this._addStyleOnLists(parent, editor);
            this._wrapDirectOrphanNodes(editor, parent);
            var nodes = parent.getChildren();
            var count = nodes.count();
            for(var i =0; i < count; i++){
                var n = nodes.getItem(i);
                //if ul, li, table and such
                if(n.type === CKEDITOR.NODE_ELEMENT && !CKEDITOR.dtd.$inline[n.getName()] && !editor.config.format_tags_map[n.getName()]){
                    this._fixDomRecursive(editor, n);
                }
            }
        },

        _wrapDirectOrphanNodes: function(editor, parent){
            try{
                var hasChanceForInlineElements = true;
                var counter = 10;
                while(hasChanceForInlineElements){
                    hasChanceForInlineElements = this._wrapOrphanNodeSequence(editor, parent);
                    counter--;
                    if(counter <= 0){
                        console.log("loop in preserve style, fix dom " + parent.$.innerHTML);
                        return false;
                    }
                }
            }
            catch(ex){
                console.log('error in fixDom ' + ex.message);
                return false;
            }
            return true;
        },

        _removeEmptyNodes:function (nodes) {
            var count = nodes.count();
            var nodesToRemove = [];
            var n;
            for(var i =0; i< count; i++){
                n = nodes.getItem(i);
                if (n.isUselessNodeThatCanBeDeleted()) {
                    nodesToRemove.push(n);
                }
            }

            for (var j=0; j<nodesToRemove.length; j++) {
                nodesToRemove[j].remove();
            }
        },
        _isOrphan: function (n) {
            return n.type == CKEDITOR.NODE_TEXT || !n.isBlockBoundary();
        },
        _isWixComponent: function (editor, n){
            if (editor.plugins.wixComp && n.type !== CKEDITOR.NODE_TEXT) {
                var isOldComp = n.hasClass('cke_widget_wrapper'),
                    isNewComp = editor.widgets.getByElement(n);
                return isNewComp || isOldComp;
            }

            return false;
        },
        _getOrphanNodes: function (editor, commonParent) {
            var rangeNodes = [];
            var nodes = commonParent.getChildren();
            var count = nodes.count();
            for(var i =0; i< count; i++){
                var n = nodes.getItem(i);
                if (this._isOrphan(n)  && !this._isWixComponent(editor, n)) {
                    //n is orphan and NOT a widget
                    rangeNodes.push(i);
                } else if(rangeNodes.length > 0){
                    break;
                }
            }
            return rangeNodes;
        },

        _wrapOrphanNodeSequence: function (editor, commonParent){
            var rangeNodes = this._getOrphanNodes(editor, commonParent);
            if(rangeNodes.length > 0){
                this._applyStyleToRange(editor, rangeNodes, commonParent);
                return true;
            }
            return false;
        },

        _addStyleOnLists: function(elem, editor) {
            if(elem.getName() == 'ul' || elem.getName() == 'ol'){
                var classNames = elem.getAttribute('class');
                var hasStyleClass = false;
                if(classNames){
                    var classArray = classNames.split(' ');
                    hasStyleClass = classArray.some(function(className) {
                        return className.indexOf('font_') === 0;
                    });
                }
                if (!hasStyleClass) {
                    var formatBlockName = this._cmdValues['formatBlock'];
                    var styleClass = editor.config.stylesMap[formatBlockName].cssClass;
                    elem.addClass(styleClass);
                }
            }
        },

        _applyStyleToRange: function (editor, childIndexes, commonParent){
            var selectionId = CKEDITOR.plugins.wixstylecmndshelper.saveCurrentSelection(editor);
            var selection = editor.getSelection();
            selection.ignoreFillingCharRemoveOnSelectionChange();
            var range = editor.createRange();
            range.setStart(commonParent, childIndexes[0]);
            range.setEnd(commonParent, childIndexes[childIndexes.length - 1] + 1 );
            range.select();
            this._applyStyleOnRealRange(editor);
            CKEDITOR.plugins.wixstylecmndshelper.restoreCurrentSelection(editor, selectionId);
            selection.resumeFillingCharRemoveOnSelectionChange();
        },

        _applyStyleOnRealRange: function(editor){
            editor.fire('lockSnapshot');
            editor.execCommand('removeFormat');
            for(var cmdName in this._cmdValues){
                if(this._cmdValues[cmdName] != CKEDITOR.TRISTATE_OFF){
                    editor.execCommand(cmdName, this._cmdValues[cmdName]);
                }
            }
            editor.fire('unlockSnapshot');
        },

        _verifyFormatBlockCommand: function(editor){
            if(!this._cmdValues['formatBlock'] || this._cmdValues['formatBlock'] == CKEDITOR.TRISTATE_OFF ){
                this._cmdValues['formatBlock'] = editor.config.enterMode == CKEDITOR.ENTER_DIV ? 'div' : 'p';
            }
        }
    };
})();
