
[1]: https://badgen.net/coveralls/c/github/litejs/s3
[2]: https://coveralls.io/r/litejs/s3
[3]: https://badgen.net/packagephobia/install/@litejs/s3
[4]: https://packagephobia.now.sh/result?p=@litejs/s3
[5]: https://badgen.net/badge/icon/Buy%20Me%20A%20Tea/orange?icon=kofi&label
[6]: https://www.buymeacoffee.com/lauriro



S3 client &ndash;  [![Coverage][1]][2] [![size][3]][4] [![Buy Me A Tea][5]][6]
=========

Minimal S3 client intended for files up to 5GB (that fit to memory).

 - No dependencies

### Installation

In Node.js `npm install @litejs/s3`

```javascript
var S3 = require("@litejs/s3")
, s3client = new S3({
	region: AWS_REGION,
	accessId: AWS_ID,
	secret: AWS_SECRET,
	bucket: AWS_BUCKET
})
```

### Usage


```javascript
// Use with await
var data = await s3client.get("test/hello.txt")

// .. or with callback
s3client.get("test/hello.txt", function(err, data) {
	console.log("Got file", data)
})
```

```javascript
// bucket exists
s3client.stat("test/hello.txt")
s3client.list("test/")
s3client.stat("test/hello.txt")
s3client.get("test/hello.txt")
s3client.del("test/hello.txt")
```

## External links

[GitHub repo](https://github.com/litejs/s3) |
[npm package](https://npmjs.org/package/@litejs/s3)


## Licence

Copyright (c) 2022 Lauri Rooden &lt;lauri@rooden.ee&gt;  
[The MIT License](http://lauri.rooden.ee/mit-license.txt)


