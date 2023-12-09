

describe("S3 Mock", function() {
	var S3 = require("..")
	, AWS_ID = "AKIAIOSFODNN7EXAMPLE"
	, AWS_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
	, AWS_REGION = "eu-central-1"
	, AWS_BUCKET = "buck-1"
	, fakeStorage = {
		"https://s3-eu-central-1.amazonaws.com/buck-1/": "<>",
		"https://s3-eu-central-1.amazonaws.com/buck-1/file1.txt": "Hello",
		"https://s3-eu-central-1.amazonaws.com/a/?list-type=2&max-keys=10&prefix=":
		'<?xml version="1.0" encoding="UTF-8"?><Error><Code>InvalidBucketName</Code><Message>The specified bucket is not valid.</Message><BucketName>a</BucketName><RequestId>Q4T6PZWDG38ABGDS</RequestId><HostId>yQ1ESNjLMN5eOb5nJIdgHHvtxclAX5t2DElg0UqVJZ+DR5aMocJkzmtwWIAcwcErWcpqQFjXEE0=</HostId></Error>',
		"https://s3-eu-central-1.amazonaws.com/aaa/?list-type=2&max-keys=10&prefix=":
		'<?xml version="1.0" encoding="UTF-8"?><Error><Code>PermanentRedirect</Code><Message>The bucket you are attempting to access must be addressed using the specified endpoint. Please send all future requests to this endpoint.</Message><Endpoint>s3.amazonaws.com</Endpoint><Bucket>aaa</Bucket><RequestId>EMZH6M0NJJZVRAVT</RequestId><HostId>ugvCvJQ9gZhsWgZqK4qxXuF75k3XEbEtjP8OEEcSikCc5CHRk1Dr3ijH0M7nHEtzLkfSmwmAOEA=</HostId></Error>',
		"https://s3-eu-central-1.amazonaws.com/aaa-bbb/?list-type=2&max-keys=10&prefix=":
		'<?xml version="1.0" encoding="UTF-8"?><Error><Code>NoSuchBucket</Code><Message>The specified bucket does not exist</Message><BucketName>aaa-bbb</BucketName><RequestId>YNKQQ5CHEY8T1NJW</RequestId><HostId>amI3UsqQ6kbks0QA799a0mtfeMxBAL2eyJ73zf73A+tyohffySVep8pjfe0uxaNzIcxhRuZmLOA=</HostId></Error>',
		"https://s3-eu-central-1.amazonaws.com/buck-list/?list-type=2&max-keys=10&prefix=":
		'<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>buck-list</Name><Prefix></Prefix><NextContinuationToken>18AYKGrNU+eEyBpQpLqmP7sa97tujeSo6WioT9GWV9zwYJpFFPgWpWURUW/dtYLR3eU5JD6IGyi+yR8gW5AobRQ==</NextContinuationToken><KeyCount>2</KeyCount><MaxKeys>2</MaxKeys><IsTruncated>true</IsTruncated><Contents><Key>.env</Key><LastModified>2022-04-19T11:43:10.000Z</LastModified><ETag>&quot;f030741faa47308e37d5e0671c5a4228&quot;</ETag><Size>6717</Size><StorageClass>STANDARD</StorageClass></Contents><Contents><Key>hello.txt</Key><LastModified>2022-03-14T13:15:29.000Z</LastModified><ETag>&quot;d41d8cd98f00b204e9800998ecf8427e&quot;</ETag><Boo/><Arr>0</Arr><Arr>1</Arr><Size>0</Size><StorageClass>STANDARD</StorageClass></Contents></ListBucketResult>'
	}

	function fakeRequest(url, opts, next) {
		var listeners = {}
		, response = {
			statusCode: 200,
			headers: {},
			on: function(ev, fn) {
				listeners[ev] = fn
			}
		}
		return {
			end: function(data) {
				next(response)
				setTimeout(respond, 0)
			}
		}
		function respond() {
			response.statusCode = 404
			if (fakeStorage[url]) {
				response.statusCode = 200
				response.headers["content-length"] = fakeStorage[url].length
				if (fakeStorage[url].charAt(0) === "<") response.headers["content-type"] = "application/xml"
				listeners.data(fakeStorage[url])
			}
			listeners.end()
		}
	}

	function mockedClient(mock, opts) {
		mock.time("2022-04-23T13:09:29.960Z")
		return S3(Object.assign({
			region: AWS_REGION,
			accessId: AWS_ID,
			secret: AWS_SECRET,
			client: {
				request: mock.fn(fakeRequest)
			}
		}, opts))
	}

	describe.assert.fnCalled = function(s3client, seq, url, opts) {
		this.equal(s3client.client.request.calls[seq].args[0], url)
		this.equal(s3client.client.request.calls[seq].args[1], opts)
	}

	it("should accept {0} protocol", "http,https", function(proto, assert) {
		var s3client = new S3({ protocol: proto })
		assert.strictEqual(s3client.client, require(proto))
		assert.end()
	})

	it("should get a file without a bucket", function(assert, mock) {
		var s3client = mockedClient(mock)

		s3client.get("buck-1/file1.txt", null, function(err, data) {
			assert.notOk(err)
			assert.equal(data, "Hello")
			assert.own(s3client.client.request, {
				called: 1,
				errors: 0
			})
			assert.fnCalled(s3client, 0, "https://s3-eu-central-1.amazonaws.com/buck-1/file1.txt", {
				method: "GET",
				headers: {
					"host": "s3-eu-central-1.amazonaws.com",
					"x-amz-date": "20220423T130929Z",
					"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
					"Authorization": "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20220423/eu-central-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=c0fc0f277bb492d0c91af0e9d27092591f1b13c8f20b058226fc91d7c013d1a5"
				}
			})
			assert.end()
		})
		mock.tick()
	})

	it("should get a file from bucket", function(assert, mock) {
		var s3client = mockedClient(mock, { bucket: "buck-1", userAgent: "Dummy/1.0" })

		s3client.get("file1.txt", null, function(err, data) {
			assert.notOk(err)
			assert.equal(data, "Hello")
			assert.own(s3client.client.request, {
				called: 1,
				errors: 0
			})
			assert.fnCalled(s3client, 0, "https://s3-eu-central-1.amazonaws.com/buck-1/file1.txt", {
				method: "GET",
				headers: {
					"host": "s3-eu-central-1.amazonaws.com",
					"User-Agent": "Dummy/1.0",
					"x-amz-date": "20220423T130929Z",
					"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
					"Authorization": "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20220423/eu-central-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=c0fc0f277bb492d0c91af0e9d27092591f1b13c8f20b058226fc91d7c013d1a5"
				}
			})
			assert.end()
		})
		mock.tick()
	})

	it("should stat existing bucket", function(assert, mock) {
		async function run() {
			var s3client = mockedClient(mock, {bucket: "buck-1"})
			, stat = await s3client.stat()
			assert.equal(stat, {"size":2,"mtime":new Date("2022-04-23T13:09:29.960Z"),"etag":undefined})
		}
		return run()
	})

	it("should stat a non-existing bucket", function(assert, mock) {
		var s3client = mockedClient(mock, {bucket: "buck-2"})

		s3client.stat(null, null, function(err, data) {
			assert.equal(err, Error("Bucket not found"))
			assert.notOk(data)
			assert.own(s3client.client.request, {
				called: 1,
				errors: 0
			})
			assert.fnCalled(s3client, 0, "https://s3-eu-central-1.amazonaws.com/buck-2/", {
				method: "HEAD",
				headers: {
					"host": "s3-eu-central-1.amazonaws.com",
					"x-amz-date": "20220423T130929Z",
					"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
					"Authorization": "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20220423/eu-central-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=0beac7539f091f6639599716f45739c55abf9544f39780bfae2bf92da2c35847"
				}
			})
			assert.end()
		})
		mock.tick()
	})

	it("should stat a existing file from bucket", function(assert, mock) {
		var s3client = mockedClient(mock, {bucket: "buck-1"})

		s3client.stat("file1.txt", null, function(err, data) {
			assert.notOk(err)
			assert.own(data, { size: 5 })
			assert.own(s3client.client.request, {
				called: 1,
				errors: 0
			})
			assert.fnCalled(s3client, 0, "https://s3-eu-central-1.amazonaws.com/buck-1/file1.txt", {
				method: "HEAD",
				headers: {
					"host": "s3-eu-central-1.amazonaws.com",
					"x-amz-date": "20220423T130929Z",
					"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
					"Authorization": "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20220423/eu-central-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=f77ab4962fa59ed8823503a65a552cb51a5be67589504e314fdb21340a0d71a1"
				}
			})
			assert.end()
		})
		mock.tick()
	})

	it("should stat a non-existing file from bucket", function(assert, mock) {
		var s3client = mockedClient(mock, {bucket: "buck-1"})

		s3client.stat("none.txt", null, function(err, data) {
			assert.equal(err, Error("File not found"))
			assert.notOk(data)
			assert.own(s3client.client.request, {
				called: 1,
				errors: 0
			})
			assert.fnCalled(s3client, 0, "https://s3-eu-central-1.amazonaws.com/buck-1/none.txt", {
				method: "HEAD",
				headers: {
					"host": "s3-eu-central-1.amazonaws.com",
					"x-amz-date": "20220423T130929Z",
					"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
					"Authorization": "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20220423/eu-central-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=a267714c9315bbd470114c8ffa9b378d15ef40d83af2e5ff8c294ff837044606"
				}
			})
			assert.end()
		})
		mock.tick()
	})

	it("should upload a file", function(assert, mock) {
		var s3client = mockedClient(mock, {bucket: "buck-1"})

		s3client.put("file1.txt", "Hello world", function(err, data) {
			assert.notOk(err)
			assert.own(s3client.client.request, {
				called: 1,
				errors: 0
			})
			assert.fnCalled(s3client, 0, "https://s3-eu-central-1.amazonaws.com/buck-1/file1.txt", {
				method: "PUT",
				headers: {
					"host": "s3-eu-central-1.amazonaws.com",
					"Content-Length": 11,
					"x-amz-date": "20220423T130929Z",
					"x-amz-content-sha256": "64ec88ca00b268e5ba1a35678a1b5316d212f4f366b2477232534a8aeca37f3c",
					"Authorization": "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20220423/eu-central-1/s3/aws4_request, SignedHeaders=content-length;host;x-amz-content-sha256;x-amz-date, Signature=7c3d078bb4da25b219264e060bea329836f27487477060d289daeca60435f9bc"
				}
			})
			assert.end()
		})
		mock.tick()
	})

	it("should list files", function(assert, mock) {
		var s3client = mockedClient(mock, {bucket: "buck-list"})

		s3client.list("", null, function(err, data) {
			assert.notOk(err)
			assert.own({
				name: "buck-list",
				prefix: "",
				nextContinuationToken: "18AYKGrNU+eEyBpQpLqmP7sa97tujeSo6WioT9GWV9zwYJpFFPgWpWURUW/dtYLR3eU5JD6IGyi+yR8gW5AobRQ==",
				keyCount: "2",
				maxKeys: "2",
				isTruncated: "true",
				contents: [
					{
						"Key": ".env",
						"LastModified": "2022-04-19T11:43:10.000Z",
						"ETag": "&quot;f030741faa47308e37d5e0671c5a4228&quot;",
						"Size": "6717",
						"StorageClass": "STANDARD"
					},
					{
						"Key": "hello.txt",
						"LastModified": "2022-03-14T13:15:29.000Z",
						"ETag": "&quot;d41d8cd98f00b204e9800998ecf8427e&quot;",
						"Size": "0",
						"StorageClass": "STANDARD"
					}
				]
			})
			assert.own(s3client.client.request, {
				called: 1,
				errors: 0
			})
			assert.fnCalled(s3client, 0, "https://s3-eu-central-1.amazonaws.com/buck-list/?list-type=2&max-keys=10&prefix=", {
				method: "GET",
				headers: {
					"host": "s3-eu-central-1.amazonaws.com",
					"x-amz-date": "20220423T130929Z",
					"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
					"Authorization": "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20220423/eu-central-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=94ff79fa807c4b865d476c359e54f58d279a6525fb1a0f1e0ecf0fd5f80bd61c"
				}
			})
			assert.end()
		})
		mock.tick()
	})

	it("should handle invalid bucket name", function(assert, mock) {
		var s3client = mockedClient(mock, {bucket: "a"})

		s3client.stat("", null, function(err, data) {
			assert.own(err, { message: "Bucket not found" })
			assert.notOk(data)
			assert.own(s3client.client.request, {
				called: 1,
				errors: 0
			})
			assert.fnCalled(s3client, 0, "https://s3-eu-central-1.amazonaws.com/a/", {
				method: "HEAD",
				headers: {
					"host": "s3-eu-central-1.amazonaws.com",
					"x-amz-date": "20220423T130929Z",
					"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
					"Authorization": "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20220423/eu-central-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=e5c62c6e40d8ef5bfa00b425754f4f81e5399a28a0a69924507e55ac74bb87ba"
				}
			})
			assert.end()
		})
		mock.tick()
	})

	it("should get signed url", function(assert, mock) {
		var s3client = mockedClient(mock, {bucket: "buck-1"})

		assert.equal(
			s3client.url("hello.txt", { expires: 24*60*60 }),
			"https://s3-eu-central-1.amazonaws.com/buck-1/hello.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20220423%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20220423T130929Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=f73cf5288c0c7049b17fb136505359fecb13051e67c42d77e657f15d63c3edef"
		)
		assert.own(s3client.client.request, {
			called: 0,
			errors: 0
		})
		assert.end()
	})
	it("should get xml", function(assert, mock) {

		assert.equal(
			S3.getXml("ListBucketResult"),
			'<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"></ListBucketResult>'
		)
		assert.equal(
			S3.getXml("Error", {Code: 123, Message: "Nothing here"}),
			'<?xml version="1.0" encoding="UTF-8"?><Error xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Code>123</Code><Message>Nothing here</Message></Error>'
		)
		assert.end()
	})
})

