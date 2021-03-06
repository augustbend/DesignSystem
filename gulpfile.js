// Dependencies:
var browserSync = require('browser-sync').create();
var fs = require('fs');
var gulp = require('gulp');
var autoprefixer = require('gulp-autoprefixer');
var gulp_concat = require('gulp-concat');
var cleanCSS = require('gulp-clean-css');
var gulp_rename = require('gulp-rename');
var purify = require('gulp-purifycss');
var pjson = require('./package.json');
var sass = require('gulp-sass');
var version = pjson.version;
var argv = require('minimist')(process.argv.slice(2));
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var buildConfig = require('./config/gulp/config');
var config = require('./patternlab-config.json');
var patternlab = require('patternlab-node')(config);
var htmltidy = require('gulp-htmltidy');

function paths () { return config.paths }

// tasks for deleting files in build-folders
gulp.task('pl-clean:dist', function() {
  return del([
    'dist/**/*',
  ]);
});

gulp.task('pl-clean:public', function() {
  return del([
    'public/*', '!public/fonts', '!public/patternlab-components'
  ]);
});

// Copy data files from source into public folder:
gulp.task('pl-copy:data', function () {
  return gulp.src('source/data/*.json')
    .pipe(gulp.dest(paths().public.root + '/data'));
});

// Copy jQuery distribution from installed package into public JS folder:
gulp.task('pl-copy:jq', function () {
  return gulp.src('node_modules/jquery/dist/jquery.min.js')
  .pipe(gulp.dest(paths().public.js))
});

// Copy image files from source into public images folder:
gulp.task('pl-copy:img', function () {
  return gulp.src(
    ['**/*.gif', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg'],
    { cwd: paths().source.images }
  ).pipe(gulp.dest(paths().public.images));
});

// Copy favicon file from source into public folder:
gulp.task('pl-copy:favicon', function () {
  return gulp.src('favicon.ico', { cwd: paths().source.root })
    .pipe(gulp.dest(paths().public.root));
});

// Create flat designsystem CSS file and put into public CSS folder:
gulp.task('pl-copy:css', function () {
  return gulp.src(paths().source.css + 'style.scss')
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    // We will add this line after removing most of the unused css.
    .pipe(autoprefixer({
        browsers: ['last 2 versions'],
        cascade: false
    }))
    // .pipe(purify(['./public/**/*.js', './public/**/*.html']))
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest(paths().public.css))
    .pipe(browserSync.stream());
});

// Copy Styleguide distribution folder from installed package into public
// styleguide folder:
gulp.task('pl-copy:styleguide', function () {
  return gulp.src(paths().source.styleguide + '**/*')
    .pipe(gulp.dest(paths().public.root))
    .pipe(browserSync.stream()).on('end', function () {
      gulp.src('./source/images/lab5.png')
        .pipe(gulp.dest('./public/styleguide/images'))
    });
});

// Create flat distribution CSS file (no Patternlab CSS or styleguide UI CSS)
// and copy into distribution folder:
gulp.task('pl-copy:distribution-css', function (done) {
  fs.readFile('./source/css/style.dist.scss', 'utf-8',
    function (err, custom) {
      if (err) {
        console.log(err);
      }

      var src = custom.replace('@import "scss/episerver/profile-presentation";',
        '// Automatically removed');
      src = src.replace('@import "scss/prototype-only/prototype-only";',
        '// Automatically removed');
      src = src.replace('@import "scss/episerver/episerver";',
        '// Automatically removed');
      fs.writeFileSync('./source/css/style-temp.scss', src);
      gulp.src(paths().source.css + 'style-temp.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
        }))
        .pipe(gulp_rename('style.css'))
        .pipe(gulp.dest('dist/css'))
        .pipe(cleanCSS())
        .pipe(gulp_rename('style.min.css'))
        .pipe(gulp.dest('dist/css'));
      done();
    }
    // TODO: Delete style-temp.scss from source folder
  );
});

// Create distribution CSS file for EPI and copy into distribution folder:
gulp.task('pl-copy:distribution-epi', function (done) {;
  fs.readFile('./source/css/scss/episerver/_episerver.scss', 'utf-8',
    function (err, src) {
      if (err) {
        console.log(err);
      }
      fs.writeFileSync('./source/css/scss/episerver/epi-temp.scss', src);
      gulp.src(paths().source.epi + 'epi-temp.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp_rename('epi.css'))
        .pipe(gulp.dest('dist/css'))
        .pipe(cleanCSS())
        .pipe(gulp_rename('epi.min.css'))
        .pipe(gulp.dest('dist/css'));
      done();
    }
    // TODO: Delete epi-temp.scss from source folder
  );
});

// Create distribution CSS file for "Profilmanual" and copy into distribution folder:
gulp.task('pl-copy:distribution-profile', function (done) {
  fs.readFile('./source/css/scss/episerver/_profile-presentation.scss', 'utf-8',
    function (err, src) {
      if (err) {
        console.log(err);
      }
      fs.writeFileSync('./source/css/scss/episerver/profile-temp.scss', src);
      gulp.src(paths().source.epi + 'profile-temp.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp_rename('profile.css'))
        .pipe(gulp.dest('dist/css'))
        .pipe(cleanCSS())
        .pipe(gulp_rename('profile.min.css'))
        .pipe(gulp.dest('dist/css'));
      done();
    }
    // TODO: Delete profile-temp.scss from source folder
  );
});

// Create distribution JS (bundles all JS resources for production, except for
// jQuery) and copy into distribution folder:
gulp.task('pl-copy:distribution-infoportal-js', function () {
  return gulp.src(buildConfig.infoportal.jsFiles.files)
    .pipe(gulp_concat('concat.js'))
    .pipe(gulp_rename(buildConfig.infoportal.jsFiles.filename))
    .pipe(gulp.dest('dist/js'));
});

// Create distribution JS (bundles all JS resources for production, except for
// jQuery) and copy into distribution folder:
gulp.task('pl-copy:distribution-infoportal-vendor-js', function () {
  return gulp.src(buildConfig.infoportal.vendorJsFiles.files)
    .pipe(gulp_concat('concat.js'))
    .pipe(gulp_rename(buildConfig.infoportal.vendorJsFiles.filename))
    .pipe(gulp.dest('dist/js'));
});

// Create vendor distibution for Portal. Custom js will be in a different file
gulp.task('pl-copy:distribution-portal-vendor-js', function () {
  return gulp.src(buildConfig.portal.vendorJsFiles.files)
    .pipe(gulp_concat('concat.js'))
    .pipe(gulp_rename(buildConfig.portal.vendorJsFiles.filename))
    .pipe(gulp.dest('dist/js'));
});

// Create custom js distibution for Portal.
gulp.task('pl-copy:distribution-portal-js', function () {
  return gulp.src(buildConfig.portal.jsFiles.files)
    .pipe(gulp_concat('concat.js'))
    .pipe(gulp_rename(buildConfig.portal.jsFiles.filename))
    .pipe(gulp.dest('dist/js'));
});

// Flatten development JS and copy into public JS folder:
gulp.task('pl-copy:designsystemdev-js', function () {
  return gulp.src(buildConfig.altinnDev.jsFiles.files)
    .pipe(gulp_concat('concat.js')).pipe(gulp_rename(buildConfig.altinnDev.jsFiles.filename))
    .pipe(gulp.dest('public/js'));
});

// Flatten development JS and copy into public JS folder:
gulp.task('pl-copy:designsystemdev-vendor-js', function () {
  return gulp.src(buildConfig.altinnDev.vendorJsFiles.files)
    .pipe(gulp_concat('concat.js')).pipe(gulp_rename(buildConfig.altinnDev.vendorJsFiles.filename))
    .pipe(gulp.dest('public/js'));
});

// Create custom js distibution for Portal.
gulp.task('pl-copy:distribution-patterns', function () {
  return gulp.src('public/patterns/**')
    .pipe(gulp.dest('dist/patterns'));
});

// Copy the images folder
gulp.task('pl-copy:distribution-images', function () {
  return gulp.src('public/images/**')
    .pipe(gulp.dest('dist/images'));
});

// Create custom js distibution for Portal.
gulp.task('pl-copy:distribution-portal-js-modules', function () {
  return gulp.src(buildConfig.portal.jsFiles.files)
    .pipe(gulp.dest('dist/js/modules'));
});

function getConfiguredCleanOption () {
  return config.cleanPublic
}

function build (done) {
  patternlab.build(done, getConfiguredCleanOption());
}

gulp.task('pl-assets', gulp.series(
  gulp.parallel(
    'pl-copy:designsystemdev-js',
    'pl-copy:designsystemdev-vendor-js'
  ),
    function (done) {
      done();
    }
  )
);

// See quick ref for Tidy params: http://api.html-tidy.org/tidy/quickref_5.4.0.html
gulp.task('tidy-fragments', function() {
  return gulp.src([paths().public.patterns + '**/*markup-only.html'])
    .pipe(htmltidy({dropEmptyElements: false,
                    dropProprietaryAttributes: false,
                    forceOutput: true,
                    hideComments: true,
                    indent: true,
                    indentSpaces: 2,
                    mergeDivs: false,
                    mergeEmphasis: false,
                    mergeSpans: false,
                    outputHtml: true,
                    preserveEntities: true,
                    showBodyOnly: true,
                    strictTagsAttributes: false,
                    tidyMark: false,
                    verticalSpace: true,
                    wrap: 260}))
    .pipe(gulp.dest(paths().public.patterns));
});

gulp.task('tidy-pages', function() {
  return gulp.src([paths().public.root + '**/*.html', '!' + paths().public.root + '**/*markup-only.html'])
    .pipe(htmltidy({doctype: 'html5',
                    dropEmptyElements: false,
                    dropProprietaryAttributes: false,
                    forceOutput: true,
                    hideComments: true,
                    indent: true,
                    indentSpaces: 2,
                    mergeDivs: false,
                    mergeEmphasis: false,
                    mergeSpans: false,
                    outputHtml: true,
                    preserveEntities: true,
                    showBodyOnly: false,
                    strictTagsAttributes: false,
                    tidyMark: false,
                    verticalSpace: false,
                    wrap: 260}))
    .pipe(gulp.dest(paths().public.root));
});

gulp.task('patternlab:version', function (done) {
  patternlab.version();
  done();                                                                                                                                                                 
});

gulp.task('patternlab:help', function (done) {
  patternlab.help();
  done();
});

gulp.task('patternlab:patternsonly', function (done) {
  patternlab.patternsonly(done, getConfiguredCleanOption());
});

gulp.task('patternlab:liststarterkits', function (done) {
  patternlab.liststarterkits();
  done();
});

gulp.task('patternlab:loadstarterkit', function (done) {
  patternlab.loadstarterkit(argv.kit, argv.clean);
  done();
});

gulp.task('patternlab:build', gulp.series('pl-assets', build, function (done) {
  done();
}));

gulp.task('patternlab:prebuild',
  gulp.series(
    'pl-copy:jq',
    'pl-copy:img',
    'pl-copy:favicon',
    'pl-copy:css',
    'pl-copy:styleguide',
    'pl-copy:data',
    function (done) { done(); }
  )
);

function getSupportedTemplateExtensions () {
  var engines =
    require('./node_modules/patternlab-node/core/lib/pattern_engines');
  return engines.getSupportedFileExtensions();
}

function getTemplateWatches () {
  return getSupportedTemplateExtensions().map(function (dotExtension) {
    return paths().source.patterns + '**/*' + dotExtension;
  });
}

function reload () {
  browserSync.reload();
}

function watch () {
  gulp.watch(paths().source.css + '**/*.scss', { awaitWriteFinish: true })
    .on('change', gulp.series('pl-copy:css', reload));
  gulp.watch(paths().source.styleguide + '**/*.*', { awaitWriteFinish: true })
    .on('change', gulp.series('pl-copy:styleguide', reload));
  gulp.watch([paths().source.js + 'production/**/*.js', paths().source.js + 'development/**/*.js'])
    .on('change', gulp.series('pl-copy:designsystemdev-js', reload));
  // gulp.watch(paths().source.js + 'development/**/*.js')
  //   .on('change', gulp.series('pl-copy:distribution-js', 'pl-copy:distribution-vendor-portal-js','pl-copy:distribution-portal-js', 'pl-copy:designsystemdev-js', reload));

  var patternWatches = [
    paths().source.patterns + '**/*.json',
    paths().source.patterns + '**/*.md',
    paths().source.data + '*.json',
    paths().source.images + '/*',
    paths().source.meta + '*',
    paths().source.annotations + '/*'
  ].concat(getTemplateWatches());

  gulp.watch(patternWatches, { awaitWriteFinish: true }).on('change', gulp.series(build, reload));
}

gulp.task('patternlab:connect', gulp.series(function (done) {
  browserSync.init({
    server: { baseDir: paths().public.root },
    snippetOptions: { blacklist: ['/index.html', '/', '/?*'] },
    notify: {
      styles: [
        'display: none', 'padding: 15px', 'font-family: sans-serif',
        'position: fixed', 'font-size: 1em', 'z-index: 9999', 'bottom: 0px',
        'right: 0px', 'border-top-left-radius: 5px',
        'background-color: #1B2032', 'opacity: 0.4', 'margin: 0',
        'color: white', 'text-align: center'
      ]
    }
  }, function () { console.log('PATTERN LAB NODE WATCHING FOR CHANGES') });
  done();
}));

gulp.task('patternlab:watch', gulp.series('patternlab:build', watch));
gulp.task('patternlab:serve',
  gulp.series(
    'pl-clean:public',
    'patternlab:prebuild',
    'patternlab:build',
    /*gulp.parallel(
      'tidy-pages',
      'tidy-fragments'
    ),*/
    'patternlab:connect',
    watch
  )
);
gulp.task('dist',
  gulp.series(
    'pl-clean:dist',
    'patternlab:prebuild',
    'patternlab:build',
    'pl-copy:distribution-css',
    'pl-copy:distribution-images',
    'pl-copy:distribution-epi',
    'pl-copy:distribution-profile',
    'pl-copy:distribution-patterns',
    'pl-copy:distribution-portal-js',
    'pl-copy:distribution-portal-vendor-js',
    'pl-copy:distribution-infoportal-js',
    'pl-copy:distribution-infoportal-vendor-js',
    'pl-copy:distribution-portal-js-modules'
  )
);
gulp.task('default', gulp.series('patternlab:serve'));
