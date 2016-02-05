var CSV, _, aH, argv, debug, f, files, fn, fs, header_column, i, len, merged_headers, readers,
  slice = [].slice;

CSV = require('csv');

debug = require("debug")("csv-join-columns");

fs = require("fs");

_ = require("underscore");

argv = require('yargs').options({
  sort: {
    describe: "Sort Columns by Column Name?",
    "default": false,
    boolean: true
  },
  "header-column": {
    describe: "Do CSVs contain a header column that should be preserved?",
    "default": true,
    boolean: true
  }
}).help('h').alias('h', 'help').demand(1).argv;

files = argv._;

debug("Files is " + files);

readers = [];

header_column = null;

merged_headers = null;

aH = _.after(files.length, function() {
  var all_columns, dataF, hcolumns, obj, output_csv;
  debug("All files have reported headers.");
  if (argv['header-column']) {
    hcolumns = _.uniq((function() {
      var i, len, results;
      results = [];
      for (i = 0, len = readers.length; i < len; i++) {
        obj = readers[i];
        results.push(obj.headers[0]);
      }
      return results;
    })());
    if (hcolumns.length > 1) {
      console.error("--header-column enabled, but not all header columns match. Found: " + hcolumns);
      process.exit(1);
    }
    debug("Header columns match. Found " + hcolumns[0]);
    header_column = hcolumns[0];
  }
  all_columns = _.union.apply(_, (function() {
    var i, len, results;
    results = [];
    for (i = 0, len = readers.length; i < len; i++) {
      obj = readers[i];
      results.push(obj.headers);
    }
    return results;
  })());
  debug("All columns is: " + all_columns);
  if (argv.sort) {
    all_columns = header_column ? [header_column].concat(slice.call(all_columns.slice(1).sort())) : all_columns.sort();
    debug("Sorted columns is: " + all_columns);
  }
  output_csv = CSV.stringify();
  output_csv.pipe(process.stdout);
  output_csv.write(all_columns);
  dataF = function() {
    var h, idx_mapping, transform;
    obj = readers.shift();
    if (!obj) {
      debug("Done!");
      output_csv.end();
      process.exit();
    }
    obj.csv.once("end", function() {
      return dataF();
    });
    idx_mapping = (function() {
      var i, len, ref, results;
      ref = obj.headers;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        h = ref[i];
        results.push(all_columns.indexOf(h));
      }
      return results;
    })();
    transform = CSV.transform(function(data) {
      var i, idx, len, out, v;
      out = Array(all_columns.length);
      for (idx = i = 0, len = data.length; i < len; idx = ++i) {
        v = data[idx];
        out[idx_mapping[idx]] = v;
      }
      return out;
    });
    return obj.csv.pipe(transform).pipe(output_csv, {
      end: false
    });
  };
  return dataF();
});

fn = function(f) {
  var csv, obj;
  debug("Opening " + f);
  csv = CSV.parse();
  obj = {
    headers: null,
    file: f,
    csv: csv
  };
  readers.push(obj);
  csv.once("readable", function() {
    var fheaders;
    fheaders = csv.read();
    debug("Headers for " + f + " are " + fheaders);
    obj.headers = fheaders;
    return aH();
  });
  return fs.createReadStream(f).pipe(csv);
};
for (i = 0, len = files.length; i < len; i++) {
  f = files[i];
  fn(f);
}

//# sourceMappingURL=runner.js.map
