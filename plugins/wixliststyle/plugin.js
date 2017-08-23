(function(){
    function styleList(list, editor){
        if(list.getChildCount() < 1){
            return;
        }
        var cmdValues = CKEDITOR.plugins.wixstylecmndshelper.getCurrentActiveStyles(editor);
        if(cmdValues){
            CKEDITOR.plugins.wixstylecmndshelper.applyCmdStylesToElement(editor, list, cmdValues, {});
        }
    }
    CKEDITOR.plugins.add('wixliststyle', {
        requires: 'list,wixstylecmndshelper,indent',
        init: function(editor){
            var cmdNumbered = editor.getCommand('numberedlist');
            var cmdBullets = editor.getCommand('bulletedlist');
            var cmdIndent = editor.getCommand('indent');
            var applyStyleFunction = function(evtData){
                var createdLists = evtData.data;
                for(var i = 0; i < createdLists.length; i++){
                    styleList(createdLists[i], editor);
                }
            };
            cmdNumbered.on('listChange', applyStyleFunction, cmdNumbered);
            cmdBullets.on('listChange', applyStyleFunction, cmdBullets);
            //cmdIndent.on('listChange', applyStyleFunction, cmdIndent);
        }
    });
})();