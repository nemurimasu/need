// generated on 2016-12-31 using generator-webapp 2.3.2
const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const browserSync = require('browser-sync').create();
const del = require('del');
const wiredep = require('wiredep').stream;
const runSequence = require('run-sequence');
const browserify = require('browserify');
const babelify = require('babelify');
const buffer = require('vinyl-buffer');
const source = require('vinyl-source-stream');
const path = require('path');
const through = require('through2');
const gutil = require('gulp-util');

const $ = gulpLoadPlugins();
const reload = browserSync.reload;

var dev = true;

gulp.task('styles', () => {
  return gulp.src('app/styles/*.scss')
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.sass.sync({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.']
    }).on('error', $.sass.logError))
    .pipe($.autoprefixer({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR']}))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest('.tmp/styles'))
    .pipe(reload({stream: true}));
});

gulp.task('scripts', () => {
  const b = browserify({
    entries: 'app/scripts/main.js',
    transform: babelify,
    debug: true
  });

  return b.bundle()
    .pipe(source('bundle.js'))
    .pipe($.plumber())
    .pipe(buffer())
    .pipe($.sourcemaps.init({loadMaps: true}))
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('.tmp/scripts'))
    .pipe(reload({stream: true}));
});

function lint(files, options) {
  return gulp.src(files)
    .pipe($.eslint({ fix: true }))
    .pipe(reload({stream: true, once: true}))
    .pipe($.eslint.format())
    .pipe($.if(!browserSync.active, $.eslint.failAfterError()));
}

gulp.task('lint', () => {
  return lint('app/scripts/**/*.js')
    .pipe(gulp.dest('app/scripts'));
});
gulp.task('lint:test', () => {
  return lint('test/spec/**/*.js')
    .pipe(gulp.dest('test/spec'));
});

gulp.task('htmlhint', () => {
  return gulp.src('app/**/*.html')
    .pipe($.htmlhint())
    .pipe($.htmlhint.reporter());
});

gulp.task('html', ['htmlhint', 'styles', 'scripts'], () => {
  return gulp.src('app/*.html')
    .pipe($.useref({searchPath: ['.tmp', 'app', '.']}))
    .pipe($.if('*.js', $.uglify()))
    .pipe($.if('*.css', $.cssnano({safe: true, autoprefixer: false})))
    .pipe($.if('*.js', $.rev()))
    .pipe($.if('*.css', $.rev()))
    .pipe($.revReplace())
    .pipe($.if('*.html', $.htmlmin({collapseWhitespace: true})))
    .pipe(gulp.dest('dist'));
});

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
    .pipe($.cache($.imagemin()))
    .pipe(gulp.dest('dist/images'));
});

gulp.task('fonts', () => {
  return gulp.src(require('main-bower-files')('**/*.{eot,svg,ttf,woff,woff2}', function (err) {})
    .concat('app/fonts/**/*'))
    .pipe($.if(dev, gulp.dest('.tmp/fonts'), gulp.dest('dist/fonts')));
});

gulp.task('extras', () => {
  return gulp.src([
    'app/*',
    '!app/*.html'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'));
});

gulp.task('data', () => {
  return gulp.src(['awakeners','bodies','inductions'].map(i => `app/${i}/*.txt`).concat(['app/spirals/*', 'app/themes/*/*']), {base: 'app'})
    .pipe($.if(!dev, $.if('app/spirals/**/*', $.cache($.imagemin()))))
    // build data.json containing an index of available files
    .pipe(through.obj(function (file, enc, cb) {
      if (this.files === undefined) {
        this.files = [];
      }
      this.files.push(path.relative(path.join(file.cwd, file.base), file.path));
      this.push(file);
      cb();
    }, function (cb) {
      var result = {
        awakeners: [],
        bodies: [],
        inductions: [],
        spirals: [],
        themes: {}
      };
      for (var file of this.files || []) {
        var parsed = path.parse(file);
        var dir = parsed.dir;
        if (~['awakeners', 'bodies', 'inductions'].indexOf(dir)) {
          result[dir].push(parsed.name);
        } else if (dir === 'spirals') {
          result[dir].push(parsed.base);
        } else if (path.dirname(dir) === 'themes') {
          var themeName = path.basename(dir);
          var theme = result.themes[themeName] || [];
          theme.push(parsed.base);
          result.themes[themeName] = theme;
        }
      }
      this.push(new gutil.File({
        cwd: '',
        base: '',
        path: 'data.json',
        contents: new Buffer(JSON.stringify(result))
      }));
      cb();
    }))
    .pipe($.if(dev, $.if(['**/*', '!spirals/*', '!themes/*/*'], gulp.dest('.tmp')), gulp.dest('dist')));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('serve', () => {
  runSequence(['clean', 'wiredep'], ['htmlhint', 'styles', 'scripts', 'fonts', 'data'], () => {
    browserSync.init({
      notify: false,
      port: 9000,
      server: {
        baseDir: ['.tmp', 'app'],
        routes: {
          '/bower_components': 'bower_components'
        }
      }
    });

    gulp.watch([
      'app/*.html',
      'app/images/**/*',
      '.tmp/fonts/**/*'
    ]).on('change', reload);

    gulp.watch('app/**/*.html', ['htmlhint']);
    gulp.watch('app/styles/**/*.scss', ['styles']);
    gulp.watch(['app/scripts/**/*.js', 'app/shaders/**/*.{vert,frag}'], ['scripts']);
    gulp.watch(['app/awakeners/*.txt', 'app/bodies/*.txt', 'app/inductions/*.txt', 'app/spirals/*', 'app/themes/*/*'], ['data']);
    gulp.watch('app/fonts/**/*', ['fonts']);
    gulp.watch('bower.json', ['wiredep', 'fonts']);
  });
});

gulp.task('serve:dist', ['default'], () => {
  browserSync.init({
    notify: false,
    port: 9000,
    server: {
      baseDir: ['dist']
    }
  });
});

gulp.task('serve:test', ['scripts'], () => {
  browserSync.init({
    notify: false,
    port: 9000,
    ui: false,
    server: {
      baseDir: 'test',
      routes: {
        '/scripts': '.tmp/scripts',
        '/bower_components': 'bower_components'
      }
    }
  });

  gulp.watch('app/scripts/**/*.js', ['scripts']);
  gulp.watch(['test/spec/**/*.js', 'test/index.html']).on('change', reload);
  gulp.watch('test/spec/**/*.js', ['lint:test']);
});

// inject bower components
gulp.task('wiredep', () => {
  gulp.src('app/styles/*.scss')
    .pipe($.filter(file => file.stat && file.stat.size))
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)+/
    }))
    .pipe(gulp.dest('app/styles'));

  gulp.src('app/*.html')
    .pipe(wiredep({
      exclude: ['bootstrap-sass'],
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest('app'));
});

gulp.task('build', ['lint', 'html', 'images', 'fonts', 'extras', 'data'], () => {
  return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
});

gulp.task('default', () => {
  return new Promise(resolve => {
    dev = false;
    runSequence(['clean', 'wiredep'], 'build', resolve);
  });
});
