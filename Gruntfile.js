/* jshint node: true, browser: false, es3: false */

'use strict';

module.exports = function( grunt ) {

    // Project configuration.
    var projectName = 'ck-editor';

	grunt.initConfig( {
		imagemin: {
			plugins: {
				files: [ {
					expand: true,
					cwd: '.',
					src: [
						'plugins/*/images/**/*.{png,jpg,gif}'
					]
				} ]
			},

			skins: {
				files: [ {
					expand: true,
					cwd: '.',
					src: [
						'skins/*/images/**/*.{png,jpg,gif}'
					]
				} ]
			},

			samples: {
				files: [ {
					expand: true,
					cwd: '.',
					src: [
						'samples/**/*.{png,jpg,gif}',
						'plugins/*/samples/**/*.{png,jpg,gif}'
					]
				} ]
			}
		},
        pkg:grunt.file.readJSON('./package.json'),
        meta:{
            name:'ck-editor'
        },
        jshint:   {
            all: {
                options: grunt.file.readJSON('grunt-deployment/jshint.json'),
                files: { src: ['**/*.js','!**/~*.js']}
            }
        },
        aggregate:{
            main:{
                src:         'grunt-deployment/main.json',
                manifest:    'target/'+projectName+'/index.json',
                manifestCopy:'index.json'
            }
        },
        clean: ['target'],
        compress: {
            main: {
                options: {
                    mode:'tgz',
                    archive: 'target/build.tar.gz'
                },
                files: [
                    {src: ['**'], cwd:'target/build', dest: '/', expand: true}
                ]
            }
        }
	} );

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-aggregator');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks( 'grunt-contrib-imagemin' );

    // Default task.
    grunt.registerTask('default', ['clean', 'aggregate']);
	grunt.registerTask( 'images', [ 'imagemin' ] );
};