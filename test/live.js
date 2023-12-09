

describe("S3 live on {0} {1}", [
	[ "AWS", "eu-north-1" ],
	[ "R2", "auto" ],
], function(provider, region) {
	var S3 = require("..")
	, ID = process.env["S3_" + provider + "_ID"]
	, SECRET = process.env["S3_" + provider + "_SECRET"]
	, ENDPOINT = process.env["S3_" + provider + "_ENDPOINT"]

	if (!ID || !SECRET || !ENDPOINT) return "skip"

	var s3client = new S3({
		bucket: "litejs-test",
		region: region,
		endpoint: ENDPOINT,
		accessId: ID,
		secret: SECRET,
	})
	, fileName = "gh-action-test1.txt"
	, content = "Hello " + Math.random()

	it("should upload a file", function(assert) {
		assert.setTimeout(5000)
		s3client.put(fileName, content, function(err, data) {
			assert.notOk(err)
			assert.end()
		})
	})

	it("should get a file from bucket", function(assert) {
		s3client.get(fileName, function(err, data) {
			assert.notOk(err)
			assert.equal(data, content)
			assert.end()
		})
	})

	it("should delete a file", function(assert) {
		s3client.del(fileName, function(err) {
			assert.notOk(err)
			assert.end()
		})
	})
})

