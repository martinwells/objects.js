module.exports = function(grunt) {
    // Your grunt code goes in here.
    grunt.initConfig({
        concat: {
            basic: {
                src: ['src/gamecore.js', 'src/class.js', 'src/base.js',, 'src/device.js',
                    'src/hashlist.js', 'src/jhashtable.js', 'src/linkedlist.js',
                    'src/perf.js', 'src/pooled.js', 'src/stacktrace.js'],
                dest: 'gamecore.js'
            }
        },
        min: {
            dist: {
                src: ['gamecore.js'],
                dest: 'gamecore.min.js'
            }
        },
        uglify: {
            mangle: {toplevel: true},
            squeeze: {dead_code: false},
            codegen: {quote_keys: true}
        }
    });
    grunt.registerInitTask('default', 'concat', function(){
        grunt.task.run('concat');
        grunt.task.run('min');
    });
};
