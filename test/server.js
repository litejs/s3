
// run: (export `cat .env` && node test/server.js)

var S3 = require("..")
, s3client = new S3({
	bucket: "litejs-test",
	region: "auto",
	endpoint: process.env["S3_R2_ENDPOINT"],
	accessId: process.env["S3_R2_ID"],
	secret: process.env["S3_R2_SECRET"],
})

require("http").createServer(function(req, res) {
	s3client.get("server-test.txt", res).catch(function(err) {
		res.end(err.message)
	})
})
.listen(8083)


