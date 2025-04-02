


module.exports = function S3(opts) {
	if (!(this instanceof S3)) return new S3(opts)

	var s3 = this
	, crypto = require("crypto")
	, client = opts.client || require(opts.protocol === "http" ? "http" : "https")
	// YYYYMMDDTHHmmssZ
	, awsDate = () => new Date().toISOString().replace(/-|:|\.\d*/g, "")
	, hash = data => crypto.createHash("sha256").update(data).digest("hex")
	, hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest()
	, isFn = fn => typeof fn === "function"
	, isObj = obj => !!obj && obj.constructor === Object
	, isStream = stream => stream && isFn(stream.pipe)

	Object.assign(s3, {
		protocol: "https",
		region: "auto",
		endpoint: "s3." + opts.region + ".amazonaws.com",
		del: req.bind(s3, "DELETE", null),
		get: req.bind(s3, "GET", null),
		list: function(path, opts, next) {
			if (isFn(opts)) {
				next = opts
				opts = null
			}
			return req("GET", null, "", Object.assign({
				prefix: path || "",
				listType: 2,
				maxKeys: 10
			}, opts), next)
		},
		put: (path, data, opts, next) => req("PUT", data, path, opts, next),
		sign: function(method, path, opts, contentHash) {
			var signed = awsSig(method, path, opts, "X-Amz-", {}, awsDate(), contentHash || "UNSIGNED-PAYLOAD")
			signed.url += "&X-Amz-Signature=" + signed.Signature
			return signed
		},
		stat: req.bind(s3, "HEAD", null),
		url: (path, opts) => s3.sign("GET", path, opts).url
	}, opts)

	function awsSig(method, path, _opts, optsPrefix, headers, longDate, contentHash) {
		path = (path || "").replace(/^\/*/, (s3.bucket ? "/" + s3.bucket + "/" : "/"))
		headers.host = s3.endpoint
		var ALGO = "AWS4-HMAC-SHA256"
		, shortDate = longDate.slice(0, 8)
		, scope = shortDate + "/" + s3.region + "/s3/aws4_request"
		, sortedHeaders = Object.keys(assignDashCase(headers, _opts && _opts.meta, "x-amz-meta-")).sort()
		, out = {
			Algorithm: ALGO,
			Credential: s3.accessId + "/" + scope,
			Date: longDate,
			Expires: 7 * 24 * 60 * 60,
			SignedHeaders: sortedHeaders.join(";").toLowerCase()
		}
		, opts = assignDashCase(optsPrefix ? out : {}, _opts, "")
		, query = Object.keys(opts).map(
			key => optsPrefix + key + "=" + encodeURIComponent(opts[key])
		).sort().join("&") || ""
		, canonical = [
			method,
			path,
			query,
			sortedHeaders.map(
				header => header.toLowerCase() + (":" + headers[header]).replace(/ +/g, " ")
			).join("\n") + "\n",
			out.SignedHeaders,
			contentHash
		].join("\n")

		out.Signature = hmac(hmac(hmac(hmac(hmac("AWS4" + s3.secret, shortDate), s3.region), "s3"), "aws4_request"), [
			ALGO,
			longDate,
			scope,
			hash(canonical)
		].join("\n")).toString("hex").toLowerCase()
		out.url = s3.protocol + "://" + s3.endpoint + path + (query ? "?" + query : "")
		out.auth = ALGO + " Credential=" + out.Credential + ", SignedHeaders=" + out.SignedHeaders + ", Signature=" + out.Signature
		return out
		function assignDashCase(target, source, prefix) {
			if (source) Object.keys(source).forEach(key => {
				var headerName = prefix + (key === "expires" ? "Expires" : key.replace(/\B[A-Z]/g, "-$&").toLowerCase())
				if (!isObj(source[key])) target[headerName] = source[key]
			})
			return target
		}
	}
	function req(method, data, path, opts, next) {
		if (isFn(opts) || isStream(opts)) {
			next = opts
			opts = null
		}
		var longDate = awsDate()
		, contentHash = data && !isStream(data) ? hash(data) : "UNSIGNED-PAYLOAD"
		, headers = {
			"x-amz-date": longDate,
			"x-amz-content-sha256": contentHash
		}
		if (data && data.length) {
			headers["Content-Length"] = data.length
		}
		var signed = awsSig(method, path, opts, "", headers, longDate, contentHash)
		headers.Authorization = signed.auth
		// Add after signature to exclude from signing
		if (s3.userAgent) headers["User-Agent"] = s3.userAgent
		if (!isFn(next)) return new Promise(makeReq)
		makeReq(next.bind(null, null), next)
		function makeReq(resolve, reject) {
			var req = client.request(signed.url, { method: method, headers: headers }, handle)
			if (isStream(data)) data.pipe(req)
			else req.end(data)
			function handle(res) {
				res.on("error", reject)
				if (res.statusCode === 200 && isStream(next)) {
					res.pipe(next)
					return res.on("end", resolve)
				}
				var data = ""
				res.on("data", chunk => data += chunk)
				res.on("end", () => {
					if (res.statusCode > 299) {
						data = method !== "HEAD" && parseXml(data).error || (
							path ? "The specified key does not exist." : "The specified bucket is not valid."
						)
						return reject(Error(data.message || data))
					}
					data = method === "HEAD" ? Object.assign({
						size: +res.headers["content-length"],
						mtime: new Date(res.headers["last-modified"]),
					}, res.headers) : parseXml(data)
					resolve(data.listBucketResult || data.error || data)
				})
			}
		}
	}
	function parseXml(str) {
		var key, val
		, json = {}
		, re = /<(\w)([-\w]*)(?:\/|[^>]*>((?:(?!<\1\2)[\s\S])*)<\/\1\2)>/gm
		for (; (val = re.exec(str)); ) {
			key = val[1].toLowerCase() + val[2]
			val = val[3] === "" ? "" : val[3] == null || val[3] === "true" ? true : val[3] === "false" ? false : val[3] == +val[3] ? +val[3] : parseXml(val[3])
			if (Array.isArray(json[key])) json[key].push(val)
			else json[key] = json[key] != null ? [json[key], val] : key === "contents" ? [val] : val
		}
		return key ? json : str
	}
}

