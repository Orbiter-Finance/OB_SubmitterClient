import { SMT } from "../src"
import { ChildNodes } from "../src/smt/smt"
import { sha256 } from "js-sha256"

describe("Sparse Merkle tree", () => {
    
    const hash = (childNodes: ChildNodes):string => sha256(childNodes.join(""))
    const testKeys = ["a", "3", "2b", "20", "9", "17"]

    describe("Create hexadecimal trees", () => {
        it("Should create an empty sparse Merkle tree", () => {
            const tree = new SMT(hash)

            expect(tree.root).toEqual("0")
            expect(true).toEqual(true)
        })
    })
})