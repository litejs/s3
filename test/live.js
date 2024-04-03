

describe("S3 live on {0} {1}", [
	[ "AWS", "eu-north-1", false ],
	[ "AWS", "eu-north-1", true ],
	[ "R2", "auto", false ],
	[ "B2", "eu-central-003", false ],
	[ "B2", "eu-central-003", true ],
	[ "GOOG", "auto", false ],
	//[ "STORJ", "global", false ],
], function(provider, region, virtualStyle) {
	var S3 = require("..")
	, bucket = "litejs-test"
	, ID = process.env["S3_" + provider + "_ID"]
	, SECRET = process.env["S3_" + provider + "_SECRET"]
	, ENDPOINT = process.env["S3_" + provider + "_ENDPOINT"]

	if (ENDPOINT && virtualStyle) {
		// https://s3.region-code.amazonaws.com/bucket-name/key-name - Path-style requests
		// https://bucket-name.s3.region-code.amazonaws.com/key-name - Virtual-hosted–style requests
		ENDPOINT = bucket + "." + ENDPOINT
		bucket = null
	}

	if (!ID || !SECRET || !ENDPOINT) return "skip"

	var s3client = new S3({
		bucket: bucket,
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

	it("should stat file", [
		[ "none.txt", Error("The specified key does not exist."), undefined ],
	], function(name, expErr, expData, assert) {
		assert.setTimeout(5000)
		s3client.stat("none.txt", null, function(err, data) {
			assert.equal(err, expErr)
			assert.equal(data, expData)
			assert.end()
		})
	})

	it("should get a file from bucket", function(assert) {
		assert.setTimeout(5000)
		s3client.get(fileName, function(err, data) {
			assert.notOk(err)
			assert.equal(data, content)
			assert.end()
		})
	})

	it("should get error on non-existing file", function(assert, mock) {
		assert.setTimeout(5000)
		s3client.get("non-existing-" + fileName, function(err, data) {
			// Blackblaze returns "Key not found"
			assert.ok(err)
			assert.anyOf(err.message, [ "The specified key does not exist.", "Key not found" ])
			assert.notOk(data)
			assert.end()
		})
	})

	it("should delete a file", function(assert) {
		assert.setTimeout(5000)
		s3client.del(fileName, function(err) {
			assert.notOk(err)
			assert.end()
		})
	})
})

