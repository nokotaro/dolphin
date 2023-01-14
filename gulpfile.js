/**
 * Gulp tasks
 */

const fs = require('fs');
const gulp = require('gulp');
const swc = require('gulp-swc');
const rimraf = require('rimraf');
const rename = require('gulp-rename');
const cleanCSS = require('gulp-clean-css');
const sass = require('gulp-dart-sass');

const locales = require('./locales');
const swcOptions = JSON.parse(fs.readFileSync('.swcrc', 'utf-8'));

gulp.task('build:ts', () =>
	gulp.src([
			'src/**/*.ts',
			'!./src/client/app/**/*.ts'
	])
		.pipe(swc(swcOptions))
		.pipe(gulp.dest('built'))
);

gulp.task('build:copy:views', () =>
	gulp.src('./src/server/web/views/**/*').pipe(gulp.dest('./built/server/web/views'))
);

gulp.task('build:copy:locales', cb => {
	fs.mkdirSync('./built/client/assets/locales', { recursive: true });

	for (const [lang, locale] of Object.entries(locales)) {
		fs.writeFileSync(`./built/client/assets/locales/${lang}.json`, JSON.stringify(locale), 'utf-8');
	}

	cb();
});

gulp.task('build:copy', gulp.parallel('build:copy:views', 'build:copy:locales', () =>
	gulp.src([
		'./src/emojilist.json',
		'./src/server/web/views/**/*',
		'./src/**/assets/**/*',
		'!./src/client/assets/**/*'
	]).pipe(gulp.dest('./built/'))
));

gulp.task('clean', gulp.parallel(
	cb => rimraf('./built', cb),
	cb => rimraf('./node_modules/.cache', cb)
));

gulp.task('cleanall', gulp.parallel('clean', cb =>
	rimraf('./node_modules', cb)
));

gulp.task('build:client:styles', () =>
	gulp.src('./src/client/style.scss')
		.pipe(sass())
		.pipe(cleanCSS())
		.pipe(gulp.dest('./built/client/assets/'))
);

gulp.task('copy:client', () =>
		gulp.src([
			'./assets/**/*',
			'./src/client/assets/**/*',
		])
			.pipe(rename(path => {
				path.dirname = path.dirname.replace('assets', '.');
			}))
			.pipe(gulp.dest('./built/client/assets/'))
);

gulp.task('build:client', gulp.parallel(
	'build:client:styles',
	'copy:client'
));

gulp.task('build', gulp.parallel(
	'build:ts',
	'build:copy',
	'build:client',
));

gulp.task('default', gulp.task('build'));
