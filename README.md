# csv-join-columns

Take a set of CSV files with partially-overlapping columns and merge them by
intelligently joining column headers.

For instance, say you have:

csvA.txt:
```
Date,A,B,C
2015-12-01,5,7,9
```

csvB.txt:
```
Date,B,C,D
2015-12-01,4,3,2
```

Running `csv-join-columns csvA.txt csvB.txt` will produce:

```
Date,A,B,C,D
2015-12-01,5,7,9,
2015-12-01,,4,3,2
```