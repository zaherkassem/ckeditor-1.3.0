

function Cleaner(){

    var tagMap = {
        h1: createTagChanger('p', '.style-for-h1'),
        h2: createTagChanger('p', '.style-for-h2'),
        h3: createTagChanger('p', '.style-for-h2'),
        h4: createTagChanger('p', '.style-for-h4'),
        h5: createTagChanger('p', '.style-for-h5'),
        h6: createTagChanger('p', '.style-for-h6'),
        address: createTagChanger('p', '.style-for-address'),
        pre:doNothing
    };

    function doNothing(o){ return o;}

    function getEditorDirtyHTML(){
        return CKEDITOR.instances.editor1.getData();
    }

    function toArray(nodeList){
        return Array.prototype.slice.call(nodeList);
    }

    function copyAttributes(el, sourceEl){
        toArray(sourceEl.attributes).forEach(function(Attr){
            el.setAttribute(Attr.name, Attr.value);
        });
    }

    function addClassName(el, className){
        el.className += el.className ? ' ' + className : className;
    }

    function createTagChanger(newTag, className){
        return function(el){
            return createNewElement(el, newTag, className);
        }
    }

    function getTagTransformer(el){
        return tagMap[el.tagName.toLowerCase()];
    }

    function replaceNodeInline(oldEl, newEl){
        oldEl.parentNode.replaceChild(newEl, oldEl);
    }

    function createNewElement(el, newTag, className){
        var newEl = document.createElement(newTag);
        copyAttributes(newEl, el);
        addClassName(el, className);
        newEl.innerHTML = el.innerHTML;
        return newEl;
    }

    function fixTagName(el){
        var transformer = getTagTransformer(el);
        if(transformer){
            replaceNodeInline(el, transformer(el));
        }
        return el;
    }

    function fixStyle(el){
        return el;
    }

    function fixChildren(node){
        toArray(node.children).forEach(function(el){
            fixChildren(el);
            fixTagName(el);
            fixStyle(el);
        });
        return node;
    }

    function parse(htmlString){
        htmlString = htmlString || getEditorDirtyHTML();
        var doc = document.createElement('body');
        doc.innerHTML = htmlString;
        return fixChildren(doc);
    }

    return {
        getData:getEditorDirtyHTML,
        parse:parse
    };

}


var cleaner = Cleaner();

