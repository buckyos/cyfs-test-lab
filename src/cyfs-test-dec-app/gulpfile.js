const gulp = require("gulp");
const ts = require("gulp-typescript");
const sourcemaps = require("gulp-sourcemaps");
const tsProject = ts.createProject("tsconfig.json");

gulp.task("compile", function() {
    return tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .js
        .pipe(sourcemaps.write())
        .pipe(gulp.dest("../../deploy/cyfs_test_app"))
});

gulp.task("cpoy_file", async () => {
    [
        gulp.src(["./**/*.js", "./*.json", "./*.cfg", "./.cyfs/*.obj"])
            .pipe(gulp.dest("../../deploy/cyfs_test_app")),
        gulp.src(["./.cyfs/*"])
            .pipe(gulp.dest("../../deploy/cyfs_test_app")),
    ];

});

gulp.task("build_app", gulp.series("compile", "cpoy_file"));


gulp.task("test", () => {
   console.info(`gulp test`)
});