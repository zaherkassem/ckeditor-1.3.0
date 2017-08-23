CKEDITOR.plugins.add('wixstylecmndshelper', {
    init: function(editor){

    }
});
//this object is shared between all the editor instances, but no editor should call restore selection without calling save first...
CKEDITOR.plugins.wixstylecmndshelper = {
    selectionID: 0,
    selections: {},
    saveCurrentSelection: function(editor){
        this.selectionID ++;
        var ranges = editor.getSelection(1).getRanges();
        var isAllSelected = this._isWholeTextSelected(ranges, editor);
        this.selections[this.selectionID] = {
            isAllSelected: isAllSelected,
            ranges: ranges
        };
        return this.selectionID;
    },

    restoreCurrentSelection: function(editor, selectionId){
        function validateRanges(ranges) {
            var i;
            for (i=0; i <  ranges.length; i++) {
                var rng = ranges[i];
                if (rng.startContainer.getParent() === null || rng.endContainer.getParent() === null) {
                    return false;
                }
            }

            return true;
        }

        var fallbackRanges;
        try {
            var selection = this.selections[selectionId];
            if (validateRanges(selection.ranges)) {
                if(selection.isAllSelected){
                    selection.ranges[0].selectNodeContents(editor.document.getBody());
                } else {
                    var range = selection.ranges.length == 1 && selection.ranges[0];
                    if (range && range.collapsed && range.startOffset == 0) {
                        range.moveToElementEditStart(range.startContainer);
                    }
                }
                editor.fire('lockSnapshot');
                fallbackRanges = editor.getSelection().getRanges();
                editor.getSelection().selectRanges(selection.ranges);
            }
        } catch(err) {
            if (fallbackRanges) {
                editor.getSelection().selectRanges(fallbackRanges);
            }
            //todo - allow report errors from ck
//            var topWin = window.top;
//            topWin.LOG.reportError(topWin.wixErrors.TEXT_RESTORE_SELECTION_FAIL, "plugin.wixstylecmndshelper", "restoreCurrentSelection", {"desc" : err.stack});
        }

        //make sure the snapshot is unlocked and delete selection - even if there was an exception
        editor.fire('unlockSnapshot');
        delete this.selections[selectionId];
    },

    getCurrentActiveStyles: function(editor){
        if(!this._checkSelectionValidity(editor)){
            return null;
        }
        var cmdValues = {};
        var commandsList = editor.config.styleCommandsToPreserve;
        for(var i = 0; i < commandsList.length; i++){
            var cmdName = commandsList[i].name;
            var styleCmd = editor.getCommand(cmdName);
            var value = styleCmd.state;
            if(value){
                cmdValues[cmdName] = value;
            }
        }
        return cmdValues;
    },

    applyCmdStylesToElement: function(editor, element, cmdValues, oldCmdValues){
        var commandsList = editor.config.styleCommandsToPreserve;
        for(var i = 0; i < commandsList.length; i++){
            var cmdName = commandsList[i].name;
            if(cmdValues[cmdName])
                commandsList[i].applyStyle(editor, element, cmdValues[cmdName], oldCmdValues[cmdName]);
        }
    },

    _checkSelectionValidity: function (editor){
        //TODO: think of a better way to do this
        var formatCmd = editor.getCommand('formatBlock');
        var state = formatCmd.state;
        //var isLegalSelection = state && state != 'body';
        var isLegalSelection = state && editor.config.format_tags_map[state];
        if(!isLegalSelection){
            var sel = editor.getSelection();
            if(sel.getRanges().length > 1){
                console.log('trying to shrink, multiple ranges');
                return isLegalSelection;
            }
            var range = sel.getRanges()[0];
            if (range) {
                console.log('shrinking range, to get the real commands');
                range.shrink(CKEDITOR.SHRINK_TEXT);
                if(range.startContainer.type !== CKEDITOR.NODE_ELEMENT){
                    console.log('your text is probably is not wrapped in a block element (it should be)');
                    return false;
                }
                if(range.startContainer.getName() == 'body'){
                    return false;
                }
                range.select();
            }
            state = formatCmd.state;
           // isLegalSelection = state && state != 'body';
            isLegalSelection = state && editor.config.format_tags_map[state];
        }
        return isLegalSelection;
    },
    _isAtStartOfText: function(editor, range) {
        var editable = editor.editable();

        if (range.startOffset === 0) {
            var curNode = range.startContainer;
            while (curNode.$ !== editable.$ && !curNode.hasPrevious()) {
                curNode = curNode.getParent();
            }

            //we reached the body and all node's parents are first child
            return curNode.$ === editable.$;
        }
    },
    _isAtEndOfText: function(editor, range) {
        var editable = editor.editable();

        function isEndOfTextNode() {
            return range.endContainer.type === 3 && range.endContainer.getLength() === range.endOffset;
        }

        function isTextNode() {
            return range.endContainer.type === 3;
        }

        if (!isTextNode() || isEndOfTextNode()) {
            var curNode = range.endContainer;
            while (curNode.$ !== editable.$ && !curNode.hasNext()) {
                curNode = curNode.getParent();
            }

            //we reached the body and all node's parents are first child
            return curNode.$ === editable.$;
        }
    },
    _isWholeTextSelected: function(ranges, editor){
        if (ranges.length !== 1) {
            return false;
        }
        var range = ranges[0];
        return this._isAtStartOfText(editor, range) && this._isAtEndOfText(editor, range);
    }
};