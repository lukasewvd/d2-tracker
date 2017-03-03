const gulp = require('gulp');
const templateCache = require('gulp-angular-templatecache');

gulp.task('build-templates', function () {
  return gulp.src('src/templates/**/*.html')
    .pipe(templateCache({
        root: './templates',
        filename: 'dhis2.angular.templates.js',
        module: 'd2Templates',
        standalone: true,
    }))
    .pipe(gulp.dest('lib'));
});

gulp.task('copy', function () {
    return gulp.src('src/*.js')
        .pipe(gulp.dest('./lib'));
});

gulp.task('watch', function () {
    gulp.watch('src/**.js', ['copy']);
    gulp.watch('src/templates/**/*.html', ['build-templates']);
});

gulp.task('default', ['copy', 'build-templates']);