

describe("S3 live on {0} {1}", [
	[ "AWS", "eu-north-1", true ],
	[ "AWS", "eu-north-1", false ],
	[ "R2", "auto", false ],
	[ "R2", "auto", true ],
	[ "B2", "eu-central-003", false ],
	[ "B2", "eu-central-003", true ],
	[ "GOOG", "auto", false ],
	[ "TIGRIS", "auto", false ],
	//[ "STORJ", "global", false ],
], function(provider, region, virtualStyle) {
	var S3 = require("..")
	, child = require("child_process")
	, fs = require("fs")
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

	it("should upload a file with metadata", async function(assert) {
		assert.setTimeout(5000)
		await s3client.put("test-user-metadata.txt", "Metadata", {
			"x-amz-meta-b": "B",
			meta: {
				hello: "a"
			}
		})
		var head = await s3client.stat("test-user-metadata.txt")

		// AWS accepts custom metadata in url
		// -> PUT /test-metadata.txt?x-amz-meta-a=A { 'x-amz-meta-b': 'B' }
		// <- HEAD /test-metadata.txt { 'x-amz-meta-a': 'A', 'x-amz-meta-b': 'B' }
		// Other providers do not
		// assert.equal(head["x-amz-meta-b"], "B")
		assert.equal(head["x-amz-meta-hello"], "a")
		await s3client.del("test-user-metadata.txt")
	})

	it("should stat file", [
		[ fileName, null, {"size":content.length} ],
		[ "none.txt", Error("The specified key does not exist."), undefined ],
	], function(name, expErr, expData, assert) {
		assert.setTimeout(5000)
		s3client.stat(name, function(err, data) {
			assert.equal(err, expErr)
			if (expData) assert.own(data, expData)
			else assert.equal(data, expData)
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

	it("should list files", function(assert) {
		assert.setTimeout(5000)
		s3client.list("", null, function(err, data) {
			assert.notOk(err)
			assert.type(data, "object")
			assert.type(data.contents, "array")
			assert.ok(data.keyCount > 0)
			assert.end()
		})
	})

	it("should list files with prefix", function(assert) {
		assert.setTimeout(5000)
		s3client.list("not-existing/", null, function(err, data) {
			assert.notOk(err)
			assert.type(data, "object")
			assert.equal(data.keyCount, 0)
			assert.end()
		})
	})

	it("should stream a file", async function(assert) {
		assert.setTimeout(5000)
		var name = "./stream-" + fileName
		, writeTo = fs.createWriteStream(name)
		await s3client.get(fileName, writeTo)
		assert.equal(fs.readFileSync(name, "utf8"), content)

		var readFrom = fs.createReadStream(name)
		, stat = fs.statSync(name)
		readFrom.length = stat.size

		await s3client.put("streamed-" + fileName, readFrom)

		assert.equal(await s3client.get("streamed-" + fileName), content)

		fs.unlinkSync(name)
	})

	describe("Presigned URL", function() {
		var content = "Hello " + Math.random()
		, fileName = "gh-action/signed-url.txt"

		it("should put file", function(assert) {
			var url = s3client.sign("PUT", fileName, { expires: 5*60 }).url
			assert.setTimeout(5000)
			assert.equal(child.execSync("curl -s -X PUT -H 'Content-Type: text/plain' -d '" + content + "' '" + url + "'").toString("utf8"), "")
			assert.end()
		})

		it("should get file", function(assert) {
			var url = s3client.sign("GET", fileName).url
			assert.setTimeout(5000)
			assert.equal(child.execSync("curl -s '" + url + "'").toString("utf8"), content)
			assert.end()
		})

		it("should delete file", function(assert) {
			var url = s3client.sign("DELETE", fileName).url
			assert.setTimeout(5000)
			assert.equal(child.execSync("curl -s -X DELETE '" + url + "'").toString("utf8"), "")
			assert.end()
		})
	})

	it("should get error on streaming non-existing file", async function(assert, mock) {
		assert.setTimeout(5000)

		var name = "./" + fileName
		, writeTo = fs.createWriteStream(name)
		try {
			await s3client.get("non-existing-" + fileName, writeTo)
		} catch(err) {
			assert.ok(err)
			assert.anyOf(err.message, [ "The specified key does not exist.", "Key not found" ])
		}
	})

	it("should catch error on streaming", function(assert, mock) {
		assert.setTimeout(5000)

		var name = "./" + fileName
		, writeTo = fs.createWriteStream(name)
		return s3client.get("non-existing-" + fileName, writeTo).catch(function(err) {
			assert.ok(err)
			assert.anyOf(err.message, [ "The specified key does not exist.", "Key not found" ])
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
		assert.plan(2)
		s3client.del("non-existing-" + fileName, function(err) {
			if (provider === "GOOG") assert.ok(err)
			else assert.notOk(err)
		})
		s3client.del(fileName, function(err) {
			assert.notOk(err)
		})
	})
})

