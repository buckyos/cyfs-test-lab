
import assert = require('assert');
import * as cyfs from "../cyfs"
async function main() {
    let id1 = cyfs.DeviceId.from_base_58("5aSixgLqFDXW3JqnZek9ZGb6be4kZsu7ahq7vSXZWgCa").unwrap()
    let id2 = cyfs.DeviceId.from_base_58("5aSixgLqFDXW3JqnZek9ZGb6be4kZsu7ahq7vSXZWgCa").unwrap()
    assert.equal(id1.to_base_58(),id2.to_base_58())
}
main()