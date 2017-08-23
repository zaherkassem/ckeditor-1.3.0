/**
 * @license Copyright (c) 2003-2014, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

(function () {
    CKEDITOR.plugins.add('wixfix', {
        init: function (editor) {
            /**
             * Fix for #SE-6557:
             *      When Whole body element is selected in IE, and the users press key down all of the body content is deleted and fix dom will cause problems later
             *      The fix is to shrink the selection to text only in IE when whole of the text is selected
             */
            if (CKEDITOR.env.ie) {
                editor.on('key', function (evt) {
                    var sel = evt.editor.getSelection(), rng;
                    if (sel) {
                        rng = evt.editor.getSelection().getRanges()[0];
                    }

                    if (rng &&
                        rng.startContainer.is && rng.startContainer.is('body') &&
                        rng.endContainer.is && rng.endContainer.is('body') &&
                        rng.startContainer.getChildCount() === rng.endOffset
                        ) {
                        rng.shrink(CKEDITOR.SHRINK_TEXT, true);
                        sel.selectRanges([rng]);
                    }

                    return true;
                });
            }
        }
    });
})();
