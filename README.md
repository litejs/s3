
[1]: https://badgen.net/coveralls/c/github/litejs/s3
[2]: https://coveralls.io/r/litejs/s3
[3]: https://badgen.net/packagephobia/install/@litejs/s3
[4]: https://packagephobia.now.sh/result?p=@litejs/s3
[5]: https://badgen.net/badge/icon/Buy%20Me%20A%20Tea/orange?icon=kofi&label
[6]: https://www.buymeacoffee.com/lauriro


LiteJS S3 &ndash; [![Coverage][1]][2] [![Size][3]][4] [![Buy Me A Tea][5]][6]
=========

Dependency-free S3 client when full SDK is not needed.


### Usage


```javascript
var S3 = require("@litejs/s3")
, s3client = new S3({ accessId: ID, secret: SECRET, region: "us-east-2", endpoint: "BUCKET.s3.us-east-2.amazonaws.com" })

// More client initialization examples
, awsDeprecatedPathStyle = new S3({ region: AWS_REGION, accessId: ID, secret: SECRET, bucket: AWS_BUCKET })
, googleCloudStorage = new S3({ accessId: ID, secret: SECRET, region: "auto", endpoint: "storage.googleapis.com" })
, cloudflareR2 = new S3({ accessId: ID, secret: SECRET, region: "auto", endpoint: "MY-ID.r2.cloudflarestorage.com" })


// Use with await (throws without catch)
var data = await s3client.get("test/hello.txt")

// .. or with callback
s3client.get("test/hello.txt", function(err, data) {
	console.log("Got file", data)
})

// .. or stream to client
require("http").createServer(function(req, res) {
	s3client.get("server-test.txt", res).catch(function(err) {
		res.end(err.message)
	})
})

// bucket exists
s3client.stat("test/")
s3client.list("test/", { maxKeys: 20 })
s3client.stat("test/hello.txt")
s3client.put("test/hello.txt", "Hello world!", {
	meta: { key: "User custom metadata" },
}, function(err) {})
s3client.del("test/hello.txt")
```

> Copyright (c) 2022-2025 Lauri Rooden &lt;lauri@rooden.ee&gt;  
[MIT License](https://litejs.com/MIT-LICENSE.txt) |
[GitHub repo](https://github.com/litejs/s3) |
[npm package](https://npmjs.org/package/@litejs/s3) |
[Buy Me A Tea][6]

