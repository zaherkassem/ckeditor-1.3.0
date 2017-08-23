/**
 * Created by noamsi on 31/12/2014.
 */
'use strict';

( function() {
    /**
     * inspired by http://stackoverflow.com/questions/12006095/javascript-how-to-check-if-character-is-rtl
     *
     * check if the first non space character is rtl
     */
    var rtlChars    = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC',
        rtlDirCheck = new RegExp('^\\s*['+rtlChars+']');

    function isRTL(text){
        return rtlDirCheck.test(text);
    }

    function getRange(editor) {
        var sel = editor.getSelection();
        if (sel) {
            var ranges = sel.getRanges();
            return ranges.length > 0 && ranges[0];
        }
    }

    function isEmptySelection(range) {
        return  range.startContainer.getUniqueId() === range.endContainer.getUniqueId() &&
                range.startOffset === range.endOffset;
    }

    function getElementContainer(range) {
        var container = range.startContainer;
        if (container.$.nodeType === CKEDITOR.NODE_TEXT) {
            container = container.getParent();
        }
        return container;
    }

    CKEDITOR.plugins.add('autoDirection', {
        init: function (editor) {
            editor.on( 'change', function() {
                var range = getRange(editor);
                if (range && isEmptySelection(range)) { //empty selection means that the cursor is ready for writing
                    var text = range.startContainer.getText();
                    if (text) {
                        var dir = isRTL(text) ? 'rtl' : 'ltr';
                        var container = getElementContainer(range);
                        container.setAttribute('dir', dir);
                    }
                }
            });
        }
    });

})();