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
        .pipe(gulp.dest("deploy/"))
});

gulp.task("cpoy_file", async () => {
    [
        gulp.src(["./node_tester_app/**/*.js", "./node_tester_app/**/*.json","./node_tester_app/**/*.prisma"])
            .pipe(gulp.dest("./deploy/node_tester_app")),
        gulp.src(["./node_tester_service/**/*.js", "./node_tester_service/**/*.json","./node_tester_service/**/*.prisma"])
            .pipe(gulp.dest("./deploy/node_tester_service")),
    ];

});

gulp.task("build_app", gulp.series("compile", "cpoy_file"));


gulp.task("test", () => {
   console.info(`gulp test`)
});