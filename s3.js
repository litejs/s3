
var crypto = require("crypto")
, expectArray = {
	contents: true
}

module.exports = S3
S3.getXml = getXml

function S3(opts) {
	if (!(this instanceof S3)) return new S3(opts)
	Object.assign(this, {
		protocol: "https",
		client: require(opts.protocol === "http" ? "http" : "https"),
		endpoint: "s3." + opts.region + ".amazonaws.com",
		del: req.bind(this, "DELETE"),
		get: req.bind(this, "GET"),
		stat: req.bind(this, "HEAD")
	}, opts)
}

S3.prototype = {
	list: function(path, opts, next) {
		return this.get("", Object.assign({
			prefix: path || "",
			listType: 2,
			maxKeys: 10
		}, opts), next)
	},
	put: function(path, data, opts, next) {
		return req.call(this, "PUT", path, opts, next, data)
	},
	url: function(path, opts) {
		return awsSig(this, "GET", path, opts, "X-Amz-", { host: this.endpoint }, awsDate(), "UNSIGNED-PAYLOAD").url
	}
}

function hash(data) {
	return crypto.createHash("sha256").update(data).digest("hex")
}
function hmac(key, data) {
	return crypto.createHmac("sha256", key).update(data).digest()
}
function awsDate() {
	// YYYYMMDDTHHmmssZ
	return new Date().toISOString().replace(/-|:|\.\d*/g, "")
}
function awsSig(s3, method, path, _opts, optsPrefix, headers, longDate, contentHash) {
	path = (path || "").replace(/^\/*/, (s3.bucket ? "/" + s3.bucket + "/" : "/"))
	var ALGO = "AWS4-HMAC-SHA256"
	, shortDate = longDate.slice(0, 8)
	, scope = shortDate + "/" + s3.region + "/s3/aws4_request"
	, sortedHeaders = Object.keys(headers).sort()
	, out = {
		Algorithm: ALGO,
		Credential: s3.accessId + "/" + scope,
		Date: longDate,
		Expires: 7 * 24 * 60 * 60,
		SignedHeaders: sortedHeaders.join(";").toLowerCase()
	}
	, opts = assignDashCase(optsPrefix ? out : {}, _opts)
	, query = Object.keys(opts).map(queryEnc).sort().join("&") || ""
	, canonical = [
		method,
		path,
		query,
		sortedHeaders.map(headerEnc).join("\n") + "\n",
		out.SignedHeaders,
		contentHash
	].join("\n")
	, signString = [
		ALGO,
		longDate,
		scope,
		hash(canonical)
	].join("\n")
	, signKey = hmac(hmac(hmac(hmac("AWS4" + s3.secret, shortDate), s3.region), "s3"), "aws4_request")

	out.sig = hmac(signKey, signString).toString("hex").toLowerCase()
	out.url = s3.protocol + "://" + s3.endpoint + path + (query ? "?" + query : "") + (optsPrefix ? "&X-Amz-Signature=" + out.sig : "")
	out.auth = ALGO + " Credential=" + out.Credential + ", SignedHeaders=" + out.SignedHeaders + ", Signature=" + out.sig
	return out
	function assignDashCase(target, source) {
		if (source) Object.keys(source).forEach(function(key) {
			target[
				key === "expires" ? "Expires" : key.replace(/[A-Z]/g, "-$&").toLowerCase().replace(/^-/, "")
			] = source[key]
		})
		return target
	}
	function queryEnc(key) {
		return optsPrefix + key + "=" + encodeURIComponent(opts[key])
	}
	function headerEnc(header) {
		return header.toLowerCase() + (":" + headers[header]).replace(/ +/g, " ")
	}
}
function req(method, path, opts, next, data) {
	if (typeof opts === "function") {
		next = opts
		opts = null
	}
	var s3 = this
	, longDate = awsDate()
	, contentHash = data ? hash(data) : "UNSIGNED-PAYLOAD"
	, headers = {
		host: s3.endpoint,
		"x-amz-date": longDate,
		"x-amz-content-sha256": contentHash
	}
	if (data) {
		headers["Content-Length"] = data.length
	}
	var signed = awsSig(s3, method, path, opts, "", headers, longDate, contentHash)
	headers.Authorization = signed.auth
	// Add after signature to exclude from signing
	if (s3.userAgent) headers["User-Agent"] = s3.userAgent
	if (!next) return new Promise(makeReq)
	makeReq(next.bind(null, null), next)
	function makeReq(resolve, reject) {
		s3.client.request(signed.url, { method: method, headers: headers }, handle).end(data)
		function handle(res) {
			var data = ""
			res.on("data", function(chunk) {
				data += chunk.toString("utf8")
			})
			res.on("end", function() {
				if (res.statusCode > 299) {
					data = method !== "HEAD" && parseXml(data).error || (
						path ? "The specified key does not exist." : "The specified bucket is not valid."
					)
					return reject(Error(data.message || data))
				}
				data = method === "HEAD" ? {
					size: +res.headers["content-length"],
					mtime: new Date(res.headers["last-modified"]),
					etag: res.headers.etag
				} : parseXml(data)
				resolve(data.listBucketResult || data.error || data)
			})
			res.on("error", reject)
		}
	}
}
function parseXml(str) {
	var key, val
	, json = {}
	, re = /<(\w)([-\w]+)(?:\/|[^>]*>((?:(?!<\1)[\s\S])*)<\/\1\2)>/gm
	for (; (val = re.exec(str)); ) {
		key = val[1].toLowerCase() + val[2]
		val = val[3] != null ? parseXml(val[3]) : true
		if (Array.isArray(json[key])) json[key].push(val)
		else json[key] = json[key] != null ? [json[key], val] : expectArray[key] ? [val] : val
	}
	return key ? json : str
}
function getXml(root, json) {
	return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + nest(root, json || "", " xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\"")
	function nest(key, val, attrs) {
		return "<" + key + attrs + ">" +
			(isObj(val) || Array.isArray(val) ? Object.entries(val).map(entryeMap).join("") : val) +
			"</" + key + ">"
	}
	function entryeMap(e) {
		return nest(e[0], e[1], "")
	}
}
function isObj(obj) {
	return !!obj && obj.constructor === Object
}

