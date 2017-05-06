console.log('Gulp setting: BrowserSync + Pug + PostCSS + Browserify');
var gulp    = require('gulp');
var plugins = require('gulp-load-plugins')({
  DEBUG: false,
  scope: ['devDependencies'],
  pattern: [ 'browser-sync', 'browserify', 'del',
             'gulp-*', 'gulp.*', 'vinyl-*' ],
  lazy: true,
  rename: { 'vinyl-buffer'        : 'buffer',
            'vinyl-source-stream' : 'source' }
});

var data = require('gulp-data'),
    fs = require('fs'),
    livereload = require('gulp-livereload'),
    gulpSrcFiles = require('gulp-src-files'),
    concatCss = require('gulp-concat-css'),
    browserSync = require('browser-sync').create(),
    _ = require('lodash');


// uglified & compressed when type '--producton' behind gulp init command
var prod    = !!plugins.util.env.production;
console.log('production: ' + plugins.util.env.production);

var
  nodePath = 'node_modules/',  // node modules folder
  proxy    = 'localhost/'   ,  // it's useless if browserSync haven't a proxy
  src      = 'src/'         ,  // source folder
  dist     = 'dist/'        ,  // dist folder
  coFiles  = '**/*.*'       ,  // coFiles

  images = 'images/' ,
  css    = 'css/'    ,
  js     = 'js/'     ,
  fonts  = 'fonts/'  ;


/* -------- gulp server  -------- */
gulp.task('server', function () {
  browserSync.init({
    server: {
      baseDir: 'dist'
    },
    // proxy: "localhost:8888",
    notify: false
  });
});

// pug task
gulp.task('pug', ['css'], function(){
  var options = {
    removeComments: true,
    collapseWhitespace: true,
    collapseBooleanAttributes: true,
    removeEmptyAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    minifyJS: true,
    minifyCSS: true
  };

  function getPugData() {
    var cssJsonFiles = gulpSrcFiles(['./src/css/*.json']);
    var data = {};
    _.map(cssJsonFiles,
      function(path) {
        var jsonFileNameWithDots = path.replace(/^.*[\\\/]/, '');
        var jsonFileName = jsonFileNameWithDots.substr(0, jsonFileNameWithDots.indexOf('.'));
        if(!_.isEmpty(fs.readFileSync(path))) data[jsonFileName] = JSON.parse(fs.readFileSync(path));
      }
    );
    console.log('pug data', data);
    return data;
  };

  gulp.src(src + '*.pug')
    .pipe(plugins.plumber())
    .pipe(plugins.pug({
      pretty: true, 
      extension: '.html',
      data: getPugData()
    }))
    .pipe(prod ? plugins.htmlmin(options) : plugins.util.noop())
    .pipe(gulp.dest(dist));
});

// css task use PostCSS
gulp.task('css', function() {

  // require every used processors
  var processors = [
    require('postcss-import'),
    require('postcss-modules'),
    require('css-mqpacker')({ sort: true }),
    require('lost'),
    require('postcss-cssnext')({
      browsers: ['IE 9', 'last 5 versions', 'Firefox 14', 'Opera 11.1']
    }),
    require('postcss-size'),
    require('precss'),
    require('rucksack-css'),
    require('postcss-short-spacing')
  ];

  var options = {
    discardComments: true,
    discardEmpty: true,
    zindex: false
  };

  gulp.src(src + css + '*.css')
    .pipe(plugins.plumber())
    .pipe(plugins.sourcemaps.init({ loadMaps: true }))
    .pipe(plugins.postcss(processors))
    .pipe(prod ? plugins.cssnano(options) : plugins.util.noop())
    .pipe(plugins.sourcemaps.write('.'))
    // .pipe(concatCss('./dist'))
    // .pipe(plugins.postcss(require('postcss-normalize')))
    .pipe(gulp.dest(dist + css))
});

// js task use Browserify
gulp.task('js', function () {

 var b = plugins.browserify({
  entries: src + js + 'script.js',
  debug: true
 });

 return b.bundle()
  .on('error', plugins.util.log)
  .pipe(plugins.source('script.js'))
  .pipe(plugins.buffer())
  .pipe(plugins.plumber())
  .pipe(plugins.sourcemaps.init({ loadMaps: true }))
  .pipe(prod ? plugins.uglify() : plugins.util.noop())
  .pipe(plugins.sourcemaps.write('.'))
  .pipe(gulp.dest(dist + js));
});

// assets task
gulp.task('assets:images', function(){
  gulp.src(src + images + coFiles)
    .pipe(plugins.imagemin({ progressive: true }))
    .pipe(gulp.dest(dist + images));
});

gulp.task('assets:fonts', function(){
  gulp.src(src + fonts)
    .pipe(gulp.dest(dist + fonts));
});

gulp.task('assets', ['assets:images', 'assets:fonts']);

// del task
gulp.task('del', function() {
  plugins.del(dist);
});



var concat = require('gulp-concat');
 
gulp.task('concat', function() {
  const fileExists = require('file-exists');
  fileExists(
    './dist',
    function(err, exists) {
      if(exists) plugins.del('./dist');
      return console.log('error', err);
  });
  return gulp.src('./dist/css/*.css')
    .pipe(concat('bundle.css'))
    .pipe(gulp.dest('./dist/css'));
});



// concat result
// gulp.task('concat', function() {
//   const fileExists = require('file-exists');
//   fileExists(
//     './dist',
//     function(err, exists) {
//       if(exists) plugins.del('./dist');
//       return console.log('error', err);
//   });
//   return gulp.src('./dist/css/*.css')
//     .pipe(concatCss('bundle.css'))
//     .pipe(gulp.dest('./dist/css'));
// });

// watch task
gulp.task('watch', function () {
  // gulp.watch([src + '*/*.pug', src + '*.pug'], ['concat']);
  // gulp.watch(src + css    + '*.css'  , ['concat', 'pug']);
  // gulp.watch('./dist/css/*.css'  , ['concat', 'pug']);
  gulp.watch(['./src/**/*.pug', './src/**/*.css'], ['pug']);
  gulp.watch(['./dist/css/*.css'], ['concat']);
  gulp.watch(src + js     + coFiles  , ['js']);
  gulp.watch(src + images + coFiles  , ['assets:images']);
  gulp.watch(src + fonts  + coFiles  , ['assets:fonts']);
  gulp.watch(['./dist/css/*.css', './dist/*.html']).on('change', browserSync.reload);
});

// init / default
gulp.task('init', ['concat', 'js', 'assets']);
gulp.task('default', [ 'init', 'watch', 'server']);