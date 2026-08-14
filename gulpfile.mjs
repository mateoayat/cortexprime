import gulp from 'gulp'
import prefix from 'gulp-autoprefixer'
import dartSass from 'sass'
import gulpSass from 'gulp-sass'

const sass = gulpSass(dartSass)

/* ----------------------------------------- */
/*  Compile Sass
/* ----------------------------------------- */

const SYSTEM_SCSS = ['scss/**/*.scss']

function compileScss () {
  return gulp.src(SYSTEM_SCSS)
    .pipe(
      sass({ style: 'expanded' })
        .on('error', sass.logError)
    )
    .pipe(prefix({ cascade: false }))
    .pipe(gulp.dest('./css'))
}

const css = gulp.series(compileScss)

/* ----------------------------------------- */
/*  Watch Updates
/* ----------------------------------------- */

function watchUpdates () {
  gulp.watch(SYSTEM_SCSS, css)
}

/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

export { css }
export default gulp.series(compileScss, watchUpdates)
