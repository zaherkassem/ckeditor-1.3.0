/**
 * Created by IntelliJ IDEA.
 * User: alissav
 * Date: 11/6/12
 * Time: 7:16 PM
 * To change this template use File | Settings | File Templates.
 */

Toolbar = function(editorName){
    this._editorName = editorName;
    CKEDITOR.on('instanceReady', this._initCommandListeners, this);
};

Toolbar.prototype = {
    executeSimpleCommand: function(cmdName){
        var editor = this._getEditorInstance();
        // Execute the command.
        // http://nightly-v4.ckeditor.com/ckeditor_api/#!/api/CKEDITOR.editor-method-execCommand
        editor.execCommand( cmdName );
    },
    executeStyleCommand: function(cmdName, value){
        if(value == 0){
            return;
        }
        var editor = this._getEditorInstance();
        // Execute the command.
        // http://nightly-v4.ckeditor.com/ckeditor_api/#!/api/CKEDITOR.editor-method-execCommand
        editor.execCommand( cmdName, value );
    },
    _getEditorInstance: function(){
        var editor = CKEDITOR.instances[this._editorName];

        // Check the active editing mode.
//        if ( editor.mode !== 'wysiwyg' )
//        {
//            throw "You must be in WYSIWYG mode!";
//        }
        return editor;
    },

    _initCommandListeners: function(){
        var editor = this._getEditorInstance();
       // editor.document.$.execCommand('styleWithCSS', false, true);
        var buttons = document.getElementsByTagName('button');
        Array.forEach(buttons, function(btn){
            var cmd = editor.getCommand(btn.id);
            if (cmd) {
                cmd.on('state', function () {
                    this._setUiAccordingToState(cmd, btn);
                }, this);
                this._setUiAccordingToState(cmd, btn);
            }
        }, this);
        var selects = document.getElementsByTagName('select');
        Array.forEach(selects, function(selEl){
            var cmd = editor.getCommand(selEl.id);
            cmd.on('state', function(){
                this._setSelectionAccordingToState(cmd, selEl);
            }, this);
        }, this);
    },

    _setSelectionAccordingToState: function(cmd, selEl){
        var state = cmd.state;
        if(state.indexOf && state.indexOf('rgb') > -1){
            state = String.rgbToHex(state);
        }
        if(state == CKEDITOR.TRISTATE_OFF || state == CKEDITOR.TRISTATE_DISABLED){
            state = 0;
        }
        selEl.value = state;
    },

    _setUiAccordingToState: function(command, button){
        var state = command.state;
        var color;
        switch(state){
            case CKEDITOR.TRISTATE_DISABLED:
                color = 'red';
                break;
            case CKEDITOR.TRISTATE_OFF:
                color = '#ddd';
                break;
            case CKEDITOR.TRISTATE_ON:
                color = 'orange';
                break;
            default:
                throw "there is no such command state";
                break;
        }
        button.style.backgroundColor = color;
    }
};