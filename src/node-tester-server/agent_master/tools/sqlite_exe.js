const assert = require('assert');
const sqlite = require('sqlite3');

const dbPath = process.argv[2];
const sql = process.argv[3];

let db = new sqlite.Database(dbPath, (err) => {
    if (err) {
        console.log(err.message);
        return;
    }

    db.all(sql, (err, rows) => {
        if (err) {
            console.log(err.message);
            return;
        }

        rows.forEach(row => console.log(JSON.stringify(row)));
    });
});