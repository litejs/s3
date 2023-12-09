
[1]: https://badgen.net/coveralls/c/github/litejs/s3
[2]: https://coveralls.io/r/litejs/s3
[3]: https://badgen.net/packagephobia/install/@litejs/s3
[4]: https://packagephobia.now.sh/result?p=@litejs/s3
[5]: https://badgen.net/badge/icon/Buy%20Me%20A%20Tea/orange?icon=kofi&label
[6]: https://www.buymeacoffee.com/lauriro


LiteJS S3 &ndash; [![Coverage][1]][2] [![Size][3]][4] [![Buy Me A Tea][5]][6]
=========

Minimal S3 client for places, where full SDK functionality is not needed.

 - No dependencies


### Usage


```javascript
var S3 = require("@litejs/s3")
, s3client = new S3({
	region: AWS_REGION,
	accessId: AWS_ID,
	secret: AWS_SECRET,
	bucket: AWS_BUCKET
})

// Use with await
var data = await s3client.get("test/hello.txt")

// .. or with callback
s3client.get("test/hello.txt", function(err, data) {
	console.log("Got file", data)
})

// bucket exists
s3client.stat("test/")
s3client.list("test/")
s3client.stat("test/hello.txt")
s3client.get("test/hello.txt")
s3client.del("test/hello.txt")
```


> Copyright (c) 2022-2023 Lauri Rooden &lt;lauri@rooden.ee&gt;  
[MIT License](https://litejs.com/MIT-LICENSE.txt) |
[GitHub repo](https://github.com/litejs/s3) |
[npm package](https://npmjs.org/package/@litejs/s3) |
[Buy Me A Tea][6]

