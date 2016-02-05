CSV = require 'csv'
debug = require("debug")("csv-join-columns")
fs = require "fs"
_ = require "underscore"

argv = require('yargs')
    .options
        sort:
            describe:   "Sort Columns by Column Name?"
            default:    false
            boolean:    true
        "header-column":
            describe:   "Do CSVs contain a header column that should be preserved?"
            default:    true
            boolean:    true
    .help('h')
    .alias('h','help')
    .demand(1)
    .argv

files = argv._

debug "Files is #{files}"

readers = []

header_column = null
merged_headers = null

aH = _.after files.length, ->
    debug "All files have reported headers."

    if argv['header-column']
        # With the header column option enabled, we need to make sure that
        # column 0 is the same in all header rows. If so, we'll treat that
        # column specially

        hcolumns = _.uniq(obj.headers[0] for obj in readers)

        if hcolumns.length > 1
            console.error "--header-column enabled, but not all header columns match. Found: #{hcolumns}"
            process.exit(1)

        debug "Header columns match. Found #{ hcolumns[0] }"

        header_column = hcolumns[0]

    # -- Create a full column list -- #

    all_columns = _.union((obj.headers for obj in readers)... )

    debug "All columns is: #{ all_columns }"

    # -- Sort the columns? -- #

    if argv.sort
        all_columns = if header_column
            [header_column,all_columns[1..].sort()...]
        else
            all_columns.sort()

        debug "Sorted columns is: #{ all_columns }"

    # -- Set up our output -- #

    output_csv = CSV.stringify()
    output_csv.pipe(process.stdout)

    output_csv.write all_columns

    # -- Run the data -- #

    dataF = ->
        obj = readers.shift()

        if !obj
            debug "Done!"
            output_csv.end()
            process.exit()

        obj.csv.once "end", ->
            dataF()

        # -- find index mappings for this file's headers -- #

        idx_mapping = (all_columns.indexOf(h) for h in obj.headers)

        transform = CSV.transform (data) ->
            out = Array(all_columns.length)
            out[ idx_mapping[idx] ] = v for v,idx in data
            out

        obj.csv.pipe(transform).pipe(output_csv, end:false)

    dataF()


for f in files
    do (f) ->
        debug "Opening #{f}"
        csv = CSV.parse()
        csv.once "readable", ->
            # consume one line...
            fheaders = csv.read()
            debug "Headers for #{f} are #{fheaders}"

            readers.push headers:fheaders, file:f, csv:csv
            aH()

        fs.createReadStream(f).pipe(csv)


