(function () {
	var TOOLS;

	function removeAllWidgetsFromHtml(htmlText) {
		var WIDGET_IDENTIFIES_SELECTOR = '[data-cke-widget-id]', i;

		var tempDomFragment = new CKEDITOR.dom.element('div');
		tempDomFragment.setHtml(TOOLS.srcAttributeEscaper.escape(htmlText));

		var nodeListToRemove = tempDomFragment.find(WIDGET_IDENTIFIES_SELECTOR);
		for (i = 0; i < nodeListToRemove.count(); i++) {
			nodeListToRemove.getItem(i).remove();
		}

		return TOOLS.srcAttributeEscaper.unescape(tempDomFragment.getHtml());
	}

	function removeImgTags(pastedText) {
		var removeImgRegex = /<img(?:[^>\\]*(?:\\>?)?)*>/g;
		/** removeImgRegex explained:
		 *   1. <img  - must match <img
		 *
		 *   2. (?:[^>\\]*(?:\\>?)?)* - non capturing group, which will match 0 to infinite times. Breakdown:
		 *      a. [^>\\]* - match any character except > (closing tag) and \ (possible escaping of closing tag)
		 *         will match 0 to infinite chars
		 *      b. (?:\\>?)? - noncapturing group, matches 0 or 1 time.
		 *          Since we broke out of a, so we have either a \ or > (or an escaped \> in an alt or src tag).
		 *          This group will match \ with an optional >. (since the group is optional, but must match a \,
		 *          we can be sure to match all escaped \> and not terminate the matcher)
		 *   Again- note that group 2 will repeat this process until it matches a clean >
		 *
		 *   3.  > match the closing angle bracket for the image element
		 *   4. g flag - match all img elements in the text
		 * **/

		return pastedText.replace(removeImgRegex, "");
	}

	function generateDataQueriesForDuplicatedWidgets(dataString, wixCompsInPasteContent, currentCkContent) {
		var dataQueriesInPasteContent = TOOLS.map(wixCompsInPasteContent, function (currWixComp) {
			return currWixComp.dataQuery;
		});

		TOOLS.forEach(dataQueriesInPasteContent, function (currDataQuery) {
			if (TOOLS.contains(currentCkContent, currDataQuery)) {
				var newID = TOOLS.genRandId();
				dataString = dataString.replace(new RegExp(currDataQuery, 'g'), newID);
				//console.warn('[CKEDITOR:paste] change data query:', currDataQuery, 'to:', newID);
			}
		});

		return dataString;
	}

	function fixWidgetsIssuesInPasteContent(pasteString, isFromOutsideCk, currentCkContent) {
		var wcStringsFromPasteStr = TOOLS.getAllWixCompStringsFromHtml(pasteString);
		if (wcStringsFromPasteStr.length && !isFromOutsideCk) {
			var wcObjectsFromPasteStr = TOOLS.map(wcStringsFromPasteStr, JSON.parse);
			pasteString = generateDataQueriesForDuplicatedWidgets(pasteString, wcObjectsFromPasteStr, currentCkContent);
		} else {
			pasteString = removeAllWidgetsFromHtml(pasteString);
			pasteString = removeImgTags(pasteString);
		}

		return pasteString;
	}

	function getChildrenArr(node) {
		var children = [];
		if (TOOLS.isElementNode(node)) {
			var childrenList = node.getChildren(),
				childNum = childrenList.count();

			for (var i = 0; i < childNum; i++) {
				children.push(childrenList.getItem(i));
			}
		}
		return children;
	}

	function isWidget(node) {
		return CKEDITOR.plugins.widget.isDomWidgetElement(node);
		//return TOOLS.isElementNode(node) && node.hasAttribute('data-cke-widget-id');
	}

	function runDFS(domNode, operationFunc, terminationTest) {
		if (terminationTest(domNode)) {
			return;
		}

		getChildrenArr(domNode).forEach(function (child) {
			runDFS(child, operationFunc, terminationTest);
		});

		operationFunc(domNode);
	}

	function customFilter(htmlStr, terminationTest, nodeToStrTransformer) {
		var rootElement = new CKEDITOR.dom.element('div'),
			stringifiedComponents = [];
		rootElement.setHtml(TOOLS.srcAttributeEscaper.escape(htmlStr));

		runDFS(rootElement, function (node) {
			stringifiedComponents.push(nodeToStrTransformer(node));
		}, function (node) {
			if (terminationTest(node)) {
				stringifiedComponents.push(nodeToStrTransformer(node));
				return true;
			}
			return false;
		});

		var compStrings = stringifiedComponents.join('');
		return TOOLS.srcAttributeEscaper.unescape(compStrings);
	}

	function getTextFromLastSnapshot(editor) {
		var snapshot = editor.undoManager.currentImage;
		return snapshot ? snapshot.contents : '';
	}

	function pasteEvtHasSourceEditor() {
		return !(CKEDITOR.env.gecko || CKEDITOR.env.ie);
	}

	var lastCopiedFromInsideCK = null;

	function rememberCopiedHtml(editor){
		editor.on('contentDom', function () {
			var editable = editor.editable();
			CKEDITOR.plugins.wixtools.forEach(['cut', 'copy'], function(evtName){
				editable.on(evtName, function () {
					lastCopiedFromInsideCK = editor.getSelectedHtml().getHtml();
				});
			});
		});
	}

	CKEDITOR.plugins.add('wixpaste', {
		requires: 'wixtools',

		init: function (editor) {
			TOOLS = CKEDITOR.plugins.wixtools;

			function stopAndCancelEventWhenMissingRange(event) {
				var sel = editor.getSelection(),
					range = sel && sel.getRanges()[0];

				if (!range) {
					event.stop();
					event.cancel();
				}
			}

			editor.on('beforePaste', function wixOnBeforePaste() {
				//ask wixstylesomething to stop its action
				editor.noFixDom = true;
			}, this);

			/**
			 * cancelling drop event when range of current selection is Undefined
			 * (caused by dropping image on other image, anyway wixOnPasteListener() would have crashed)
			 */
			editor.on('drop', stopAndCancelEventWhenMissingRange);

			if (!pasteEvtHasSourceEditor()) {
				rememberCopiedHtml(editor);
			}

			editor.on('paste', function wixOnPasteListener(evt) {
					var range = this.getRangeWithoutEmptySpans(editor),
						dataType = evt.data.type,
						pasteString = evt.data.dataValue,
						isDrop = evt.data.method === 'drop',
						currentCkContent = getTextFromLastSnapshot(editor),
						isFromOutsideCk;

					if (!pasteEvtHasSourceEditor() && lastCopiedFromInsideCK) {
						isFromOutsideCk = lastCopiedFromInsideCK.indexOf(pasteString) === -1;
					}else{
						isFromOutsideCk = !evt.data.dataTransfer.sourceEditor;
					}


					pasteString = fixWidgetsIssuesInPasteContent(pasteString, isFromOutsideCk, currentCkContent);

					if (isFromOutsideCk) {
						if (this.isPasteIntoTextBlock(range)) {
							pasteString = this.retrievePlainTextAndWidgets(pasteString);
							dataType = 'text';
						}
						else {
							//save structure only, currently insert each new line as a div
							pasteString = this.retrieveHtmlWithStructure(pasteString);
							dataType = 'html';
						}
					} else {

						var externalPasteHandleObj = {pasteString: pasteString};
						editor.fire('externalPasteHandle', externalPasteHandleObj);
						pasteString = externalPasteHandleObj.pasteString;

						if (!isDrop && this.isPasteIntoTextBlock(range)) {
							// paste plain text but save widgets and links and B/U/I styles
							pasteString = this.retrieveUnstructuredHtmlWithAnchors(pasteString);
							// inserting the html manually so we override the pasteString to be empty.
							// prevent from cancelling the event because it might also cancel the afterPaste event that has important functionality
							editor.insertHtml(pasteString, 'text');
							pasteString = '';
							dataType = 'text';
						}
					}

					evt.data.dataValue = pasteString;
					evt.data.type = dataType
				}, this, //the ,null,3 params are there so we can specify the 3 (last param) as the priority - this is to make sure this is run before other listeners for the paste event
				null, 4);

			editor.on('afterPaste', function wixOnAfterPaste() {
				editor.fire('lockSnapshot');

				var selectedWidget = TOOLS.getSelectedWidget(editor);
				if (selectedWidget) {
					TOOLS.clearSelection(editor, selectedWidget);
				}

				editor.noFixDom = false;
				editor.fire('unlockSnapshot');
				editor.plugins.wixpreservestyle.fixDom(editor);
			}, this);
		},

		isPasteIntoTextBlock: function (rangeOrNull) {
			//get the ancestor of the range, and then get it's text.
			//If the ancestor has text, then the range must be at least a partial range within a block that has text,
			//so we need to remove the formatting of the pasted text so that we can preserve the formatting of the block
			var ancestor = rangeOrNull.getCommonAncestor(true, true),
				text = ancestor.getText();
			//If the char is \u200b (ZWSP), then we don't want to remove the formatting
			if (!text || CKEDITOR.tools.isZWSP(text) || CKEDITOR.tools.isWhiteSpace(text)) {
				return false;
			}

			var isBlockStart = rangeOrNull.checkStartOfBlock();
			var isBlockEnd = rangeOrNull.checkEndOfBlock();

			if (isBlockStart && isBlockEnd) {
				//full blocks are about to be deleted and replaced with new text
				return false;
			}

			return true;
		},

		isSpanElement: function (currentNode) {
			return currentNode.type === CKEDITOR.NODE_ELEMENT && currentNode.getName() === "span";
		},

		isStartsWithAnEmptySpan: function (range) {
			var currentNode = range.startContainer;
			var text = currentNode.getText();

			return (
				(this.isSpanElement(currentNode) || TOOLS.isTextNode(currentNode))
				&&
				(!text || CKEDITOR.tools.isWhiteSpace(text))
			);
		},

		getRangeWithoutEmptySpans: function (editor) {
			var selection = editor.getSelection();
			var range = selection.getRanges()[0];
			if (this.isStartsWithAnEmptySpan(range)) {
				this.removeNodesWithoutText(range);
				//reselecting after removal of empty nodes
				selection = editor.getSelection();
				range = selection.getRanges()[0];
			}
			return range;
		},
		/* mainly copied from CKEditor.Range -> removeEmptyBlocksAtEnd, but tailored to work for paste properly with isEmptyInlinePasteRemoveable*/
		removeNodesWithoutText: (function () {
			var whitespace = CKEDITOR.dom.walker.whitespaces(),
				bookmark = CKEDITOR.dom.walker.bookmark(false);

			function childEval(parent) {
				return function (node) {

					// whitespace, bookmarks, empty inlines.
					if (whitespace(node) || bookmark(node) ||
						node.type == CKEDITOR.NODE_ELEMENT &&
						node.isEmptyInlinePasteRemoveable() || node.type == CKEDITOR.NODE_TEXT && node.isWhiteSpace()) {
						return true;
					} else if (parent.is('table') && node.is('caption')) {
						return true;
					}


					return false;
				};
			}

			return function (range, atEnd) {

				var bm = range.createBookmark();
				var path = range[atEnd ? 'endPath' : 'startPath']();
				var block = path.block || path.blockLimit, child;

				// Remove any childless block, including list and table.
				while (block && !block.equals(path.root) &&
				block.getFirst(childEval(block))) {
					child = block.getFirst(childEval(block));
					range[atEnd ? 'setEndAt' : 'setStartAt'](block, CKEDITOR.POSITION_AFTER_END);
					child.remove();
				}
				if (bm.startNode.getParent()) {
					range.moveToBookmark(bm);
				} else {
					range[atEnd ? 'setEndAt' : 'setStartAt'](block, CKEDITOR.POSITION_BEFORE_END);
				}
			};

		})(),

		retrievePlainTextAndWidgets: function (htmlStr) {
			function transformFunc(node) {
				if (TOOLS.isTextNode(node)) {
					return CKEDITOR.tools.htmlEncode(node.getText());
				} else if (isWidget(node)) {
					return node.getOuterHtml();
				}
				return '';
			}

			return customFilter(htmlStr, isWidget, transformFunc);
		},

		retrieveHtmlWithStructure: function (htmlData) {
			// Create standalone filter passing 'p' and 'b' elements.
			var filter = new CKEDITOR.filter('h1 h2 h3 h4 h5 h6 div p ul ol li br'),
			// Parse HTML string to pseudo DOM structure.
				fragment = CKEDITOR.htmlParser.fragment.fromHtml(htmlData),
				writer = new CKEDITOR.htmlParser.basicWriter();
			filter.applyTo(fragment);
			fragment.writeHtml(writer);
			return writer.getHtml();
		},

		retrieveUnstructuredHtmlWithAnchors: function (htmlData) {
			var filter = new CKEDITOR.filter('a[!dataquery]; span{!text-decoration}; span{!font-weight}; span{!font-style}; div[!data-cke-widget-wrapper]; div[!data-cke-widget-id]; span[!data-cke-widget-wrapper]; span[!data-cke-widget-id]'),
			// Parse HTML string to pseudo DOM structure.
				fragment = CKEDITOR.htmlParser.fragment.fromHtml(htmlData),
				writer = new CKEDITOR.htmlParser.basicWriter();
			filter.applyTo(fragment);
			fragment.writeHtml(writer);
			var filteredHtml = writer.getHtml();
			return filteredHtml.replace(/<\/?p>/g, '');
		}
	});

})();
