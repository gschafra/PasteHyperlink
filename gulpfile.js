/* jshint esversion: 6 */
/* jshint node: true */
/* eslint-env node */

const gulp = require("gulp");
const zip = require("gulp-zip");
const cleanDir = require('gulp-clean-dir');
const pjson = require('./package.json');

exports.default = () => gulp.src('src/*')
    .pipe(cleanDir('dist'))
    .pipe(zip(`pastehyperlink-${pjson.version}-sm+tb.xpi`))
    .pipe(gulp.dest('dist'));