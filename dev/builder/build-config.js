/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

/* exported CKBUILDER_CONFIG */

var CKBUILDER_CONFIG = {
	skin: 'empty',
	ignore: [
		'bender.js',
		'.bender',
		'bender-err.log',
		'bender-out.log',
		'dev',
		'docs',
		'.DS_Store',
		'.editorconfig',
		'.gitignore',
		'.gitattributes',
		'gruntfile.js',
		'.idea',
		'.jscsrc',
		'.jshintignore',
		'.jshintrc',
		'less',
		'.mailmap',
		'node_modules',
		'package.json',
		'README.md',
		'tests',
        'grunt-deployment', /* @author noam*/
        'maven',
        '.git',
        'target',
        'samples',
        'fake.html',
        'ck-editor.iml',
        'grunt.js',
        'index.debug.json',
        'index.json',
        'package.json',
        'pom.xml',
        'CHANGES.md',
        'LICENSE.md'
	],
	plugins: {
		//a11yhelp: 1,
		//about: 1,
        autogrow: 1,
		basicstyles: 1,
		bidi: 1,
        button: 1, //??
		//blockquote: 1,
		clipboard: 1,
		//colorbutton: 1,
		//colordialog: 1,
		//contextmenu: 1,??
		//div: 1,
        dialog: 1, //clipboard (paste)
        dialogui : 1, //clipboard (paste)
//		elementspath: 1,
		enterkey: 1,
		entities: 1,
        //fakeobjects??
        floatpanel: 1, //??
		//filebrowser: 1,
		//find: 1,
		//flash: 1,
		//floatingspace: 1,
		//font: 1,
		format: 1, //pastefromword
		//forms: 1,
		//horizontalrule: 1,
		htmlwriter: 1,
		//iframe: 1,
//		image: 1,
		indent: 1,
        indentlist: 1,
        indentblock: 1,
		justify: 1,
//		link: 1,
		list: 1,
        listblock: 1,
//		liststyle: 1,
		//magicline: 1,
		//maximize: 1,
        //menu??
		//newpage: 1,
		//pagebreak: 1,
        panel: 1, //??
		pastefromword: 1,
		pastetext: 1,
		//preview: 1,
		//print: 1,
		removeformat: 1,
        richcombo: 1, //format
		resize: 1,
		//save: 1,
		selectall: 1,
		//showblocks: 1,
		//showborders: 1,
		//smiley: 1,
		sourcearea: 1,
		//specialchar: 1,
		//stylescombo: 1,
		//tab: 1,
		//table: 1,
		//tabletools: 1,
		//templates: 1,
		//toolbar: 1,
		undo: 1,
		wysiwygarea: 1,
        wixstylecmndshelper: 1,
        wixtools: 1,
        wixHtml: 1,
		wgallery:1,
        wixpreservestyle: 1,
        wixfix: 1,
        styleCommands: 1,
        wixliststyle: 1,
        wixlink: 1,
        wixParser: 1,
        wixpaste: 1,
        wixComp: 1,
        confighelper: 1
    },

    languages:{
        'en': 1
    }
};
