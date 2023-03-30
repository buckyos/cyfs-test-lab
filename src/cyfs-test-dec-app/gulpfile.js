// const gulp = require("gulp");
// const ts = require("gulp-typescript");
// const sourcemaps = require("gulp-sourcemaps");
// const tsProject = ts.createProject("tsconfig.json");

// gulp.task("compile", function() {
//     return tsProject.src()
//         .pipe(sourcemaps.init())
//         .pipe(tsProject())
//         .js
//         .pipe(sourcemaps.write())
//         .pipe(gulp.dest("../../deploy/cyfs-test-dec-app"))
// });

// gulp.task("copy_dec_app1_file", async () => {
//     [
//         gulp.src(["./**/*.js"]).pipe(gulp.dest("../../deploy/cyfs-test-dec-app")),
//         gulp.src(["./**/*.js"]).pipe(gulp.dest("../../deploy/cyfs-test-dec-app")),
//     ];

// });
// gulp.task("copy_dec_app2_file", async () => {
//     [
//         gulp.src(["./**/*.js"]).pipe(gulp.dest("../../deploy/cyfs-test-dec-app")),
//     ];

// });

// gulp.task("build_app1", gulp.series("compile", "copy_dec_app1_file"));


// gulp.task("test", () => {
//    console.info(`gulp test`)
// });