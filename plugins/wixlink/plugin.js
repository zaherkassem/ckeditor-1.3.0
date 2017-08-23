(function () {
	CKEDITOR.plugins.add('wixlink', {
		init: function (editor) {
			editor.addCommand('wixLink', new linkCommandDef());
			editor.addCommand('wixUnlink', new unlinkCommandDef());
		}
	});
	var regEndsWithEmptyTag = new RegExp('<[^>]*><\\/[^>]+>$');

	/**
	 * FireFox And IE always add <br> tag to the end of the text.
	 * When getting the selected html ck replaces the <br> with dummy empty block element that is redundant
	 * When applying link or checking if link is allowed we are ignuring the last empty block.
	 */
	function isSelectedHtmlEndsWithEmptyBlockElement(editor) {
		var htmlStr = editor.getSelectedHtml().getHtml();
		var trailEmptyTag = htmlStr.match(regEndsWithEmptyTag);
		if (trailEmptyTag) {
			var fragment = CKEDITOR.htmlParser.fragment.fromHtml(trailEmptyTag);
			return fragment.children[0] && CKEDITOR.plugins.wixtools.isBlockElement(fragment.children[0].name);
		}
	}

	function canPerformCmdIEFF(editor){
		var htmlStr = editor.getSelectedHtml().getHtml().replace(regEndsWithEmptyTag, '');
		var fragment = CKEDITOR.htmlParser.fragment.fromHtml(htmlStr);
		var result = true;
		CKEDITOR.plugins.wixtools.forEach(fragment.children, function(element){
			if(CKEDITOR.plugins.wixtools.isBlockElement(element.name)){
				result = false;
			}
		});
		return result;
	}

	function getHtmlToApplyLink(editor){
		var result = editor.getSelectedHtml().getHtml();
		if (CKEDITOR.plugins.wixtools.isIEOrFF() && isSelectedHtmlEndsWithEmptyBlockElement(editor)) {
			result = result.replace(regEndsWithEmptyTag, '');
		}
		return result;
	}

	function applyLinkToSelectedElement(selectedElement, attributes, selection) {
		selectedElement.setAttributes(attributes);
		selection.selectElement(selectedElement);
	}

	function applyLinkToSingleParentSelection(attributes, range) {
		var style = new CKEDITOR.style({element: 'a', attributes: attributes});
		style.type = CKEDITOR.STYLE_INLINE; // need to override... dunno why.
		style.applyToRange(range);
		range.select();
	}

	function applyLinkToMultiParentSelection(attributes, editor) {
		var elem = new CKEDITOR.dom.element('a');
		var innerHtml = getHtmlToApplyLink(editor);
		elem.setAttributes(attributes);
		elem.setHtml(innerHtml);
		editor.insertElement(elem);
		editor.getSelection().selectElement(elem);
	}

	function applyLinkToSelection(selection, attributes, editor) {
		var range = selection.getRanges(1)[0];
		if (range.startContainer.getUniqueId() === range.endContainer.getUniqueId()) {
			applyLinkToSingleParentSelection(attributes, range);
		} else {
			applyLinkToMultiParentSelection(attributes, editor);
		}
	}

	function applyLink(editor, selectedElement, attributes) {
		var selection = editor.getSelection();


		if (selectedElement) {
			applyLinkToSelectedElement(selectedElement, attributes, selection);
			return;
		}

		applyLinkToSelection(selection, attributes, editor);
	}

	var linkCommandDef = function () {
	};

	var unlinkCommandDef = function () {
	};

	function _getCompLinkCommand(editor) {
		return editor.getCommand('wixComp.link');
	}

	function _getComponentLink(editor) {
		var compLinkCommand = _getCompLinkCommand(editor);
		if (compLinkCommand) {
			return compLinkCommand.getSelectedLink(editor);
		}
	}

	function _isComponentLink(editor) {
		var compLinkCommand = _getCompLinkCommand(editor);
		if (compLinkCommand) {
			return compLinkCommand.isComponentLink(editor);
		}
	}

	function _setComponentLink(editor, linkQuery) {
		var compLinkCommand = _getCompLinkCommand(editor);
		if (compLinkCommand) {
			editor.execCommand('wixComp.link', linkQuery);
		}
	}

	function _handleTextSelection(editor, value) {
		var selection = editor.getSelection(),
			element = null;

		// Fill in all the relevant fields if there's already one link selected.
		if (element = CKEDITOR.plugins.wixlink.getSelectedLink(editor))
			selection.selectElement(element);
		else
			element = null;
		applyLink(editor, element, value);

		if (editor.getCommand('underline').state === CKEDITOR.TRISTATE_OFF) {
			editor.execCommand('underline');
		}
	}

	function _isComponentSelected(editor) {
		if (editor.plugins.wixComp) {
			return editor.plugins.wixComp.getCompWidget(editor);
		}
	}

	function _isSelectionEmpty(range) {
		return (
			range.startContainer.getUniqueId() === range.endContainer.getUniqueId() &&
			range.startOffset === range.endOffset
		);
	}

	linkCommandDef.prototype = {
		canUndo: true,
		editorFocus: CKEDITOR.env.ie || CKEDITOR.env.webkit,
		contextSensitive: true,
		exec: function (editor, value) {
			editor.undoManager.save();
			editor.undoManager.lock(true);

			if (_isComponentSelected(editor)) {
				_setComponentLink(editor, value);
			} else {
				editor.execCommand('wixUnlink');
				_handleTextSelection(editor, value);
			}
			this.refresh(editor);

			editor.fire('change');

			editor.undoManager.unlock();
		},

		_refreshText: function (editor) {
			var linkElem = CKEDITOR.plugins.wixlink.getSelectedLink(editor);
			if (linkElem) {
				this.setState(linkElem.getAttribute('dataQuery'));
			} else {
				this.setState(null);
			}
		},
		refresh: function (editor) {
			if (_isComponentLink(editor)) {
				this.setState(_getComponentLink(editor));
			} else {
				this._refreshText(editor);
			}
		},
		canPerformCmd: function (editor) {
			if (CKEDITOR.plugins.wixtools.isIEOrFF() && isSelectedHtmlEndsWithEmptyBlockElement(editor)) {
				return canPerformCmdIEFF(editor);
			}
			var range = editor.getSelection().getRanges()[0];

			if (!range || !range.startPath().block || !range.endPath().block) {
				return false;
			}

			//if there is more than one block element in selection than cmd can't be applied
			if (range.startPath().block.getUniqueId() !== range.endPath().block.getUniqueId()) {
				return false;
			}

			if (!_isSelectionEmpty(range)) {
				return true;
			}

			//if cursor is inside an already existing link then cmd can be applied
			return !!editor.elementPath().contains('a');
		}
	};

	function _unlinkText(editor) {
		var element = CKEDITOR.plugins.wixlink.getSelectedLink(editor);
		var shouldRemoveUnderline = element &&
			element.getParent().getChildCount() === 1 &&
			editor.getCommand('underline').state === CKEDITOR.TRISTATE_ON;
		var style = new CKEDITOR.style({
			element: 'a',
			type: CKEDITOR.STYLE_INLINE,
			alwaysRemoveElement: 1
		});
		editor.removeStyle(style);
		if (shouldRemoveUnderline) {
			editor.execCommand('underline');
		}
	}

	unlinkCommandDef.prototype = {
		exec: function (editor) {
			if (_isComponentSelected(editor)) {
				_setComponentLink(editor);
			}
			_unlinkText(editor);
		},

		refresh: function (editor, path) {
			// Despite our initial hope, document.queryCommandEnabled() does not work
			// g this in Firefox. So we must detect the state by element paths.

			var element = path.lastElement && path.lastElement.getAscendant('a', true);

			if (element && element.getName() == 'a' && element.getChildCount())
				this.setState(CKEDITOR.TRISTATE_OFF);
			else
				this.setState(CKEDITOR.TRISTATE_DISABLED);
		}
	};

	CKEDITOR.plugins.wixlink = {
		/**
		 * Get the surrounding link element of current selection.
		 *
		 *        CKEDITOR.plugins.link.getSelectedLink( editor );
		 *
		 *        // The following selection will all return the link element.
		 *
		 *        <a href="#">li^nk</a>
		 *        <a href="#">[link]</a>
		 *        text[<a href="#">link]</a>
		 *        <a href="#">li[nk</a>]
		 *        [<b><a href="#">li]nk</a></b>]
		 *        [<a href="#"><b>li]nk</b></a>
		 *
		 * @since 3.2.1
		 * @param {CKEDITOR.editor} editor
		 */
		getSelectedLink: function (editor) {
			var selection = editor.getSelection();
			var selectedElement = selection.getSelectedElement();
			if (selectedElement && selectedElement.is('a'))
				return selectedElement;

			var range = selection.getRanges(true)[0];

			if (range) {
				range.shrink(CKEDITOR.SHRINK_TEXT);
				return editor.elementPath(range.getCommonAncestor()).contains('a', 1);
			}
			return null;
		}
	};


	function moveRangeToStartOfWord(editor, range) {
		var node = range.startContainer;
		if (node.type != CKEDITOR.NODE_TEXT) {
			// node = getBorderTextNode(node, true, offset - 1);
			throw "tried to select a whole word of a none text range";
		}
		var selection = editor.getSelection();
		var offset = range.startOffset;

		while (offset > 0 && selection.getSelectedText().indexOf(' ') < 0) {
			offset--;
			range.setStart(node, offset);
			range.select();
			selection = editor.getSelection();
		}
		if (selection.getSelectedText().indexOf(' ') >= 0) {
			range.setStart(node, offset + 1);
			range.select();
			return;
		}
		if (isAtEndOfBlock(editor, node, true)) {
			return;
		}
		var neighbour = getBorderTextNode(getNeighbouringNode(node, true), false);
		range.setStart(neighbour, neighbour.getLength());
		range.select();
		moveRangeToStartOfWord(editor, range);
	}

	function moveRangeToEndOfWord(editor, range) {
		var node = range.endContainer;
		if (node.type != CKEDITOR.NODE_TEXT) {
			// node = getBorderTextNode(node, true, offset - 1);
			throw "tried to select a whole word of a none text range";
		}
		var selection = editor.getSelection();
		var offset = range.endOffset;

		while (offset < node.getLength() && selection.getSelectedText().indexOf(' ') < 0) {
			offset++;
			range.setEnd(node, offset);
			range.select();
			selection = editor.getSelection();
		}
		if (selection.getSelectedText().indexOf(' ') >= 0) {
			range.setEnd(node, offset - 1);
			range.select();
			return;
		}
		if (isAtEndOfBlock(editor, node, false)) {
			return;
		}
		var neighbour = getBorderTextNode(getNeighbouringNode(node, false), true);
		range.setEnd(neighbour, 0);
		range.select();
		moveRangeToEndOfWord(editor, range);
	}

	function isAtEndOfBlock(editor, element, isStart) {
		var node = element;
		while (node != editor.editable() && (!node.isBlockBoundary || !node.isBlockBoundary())) {
			var parent = node.getParent();
			if (node.getIndex() == (isStart ? 0 : parent.getChildCount() - 1)) {
				node = parent;
			}
			else {
				break;
			}
		}
		return node.isBlockBoundary && node.isBlockBoundary();
	}

	function getNeighbouringNode(element, isStart) {
		var node = element;
		while (!node[isStart ? 'hasPrevious' : 'hasNext']()) {
			node = node.getParent();
		}
		return isStart ? node.getPrevious() : node.getNext();
	}

	function getBorderTextNode(element, isStart, childIndex) {
		var node = element;
		while (node.type != CKEDITOR.NODE_TEXT) {
			node = node.getChild(childIndex || getEndChildIndex(node, isStart));
		}
		return node;
	}

	function getEndChildIndex(element, isStart) {
		return isStart ? 0
			: (element.type == CKEDITOR.NODE_TEXT ? element.getLength() : element.getChildCount()) - 1;
	}
})();
