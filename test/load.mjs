
import S3 from "../s3.js"

describe("Run as ESM module", () => {
	it("should export function", assert => {
		assert.type(S3, "function")
		assert.end()
	})
})

