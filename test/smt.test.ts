import { Level } from "level"
import { SMT } from "../src"
import { ChildNodes } from "../src/smt/smt"
import { sha256 } from "js-sha256"

describe("Sparse Merkle tree", () => {
    
    const hash = (childNodes: ChildNodes):string => sha256(childNodes.join(""))
    const testKeys = ["a", "3", "2b", "20", "9", "17"]
    const levelDb = new Level<string, any>('./db')

    let tree: SMT

    beforeEach(async () => {
        tree = await SMT.build(hash, levelDb, 'test')
    });
    

    it("Should create an empty sparse Merkle tree", async () => {

        expect(tree.root).toEqual("0")
        expect(true).toEqual(true)
    })

    it("Should add a new entry", async () => {
        const oldRoot = tree.root

        await tree.add("2", "a")
    
        expect(tree.root).not.toEqual(oldRoot)
    })


    it("Should add 6 new entries and create the correct root hash", async () => {
        for (const key of testKeys) {
            await tree.add(key, key)
        }

        expect(tree.root).toEqual("40770450d00520bdab58e115dd4439c20cd39028252f3973e81fb15b02eb28f7")
    })


    // describe("Add new entries (key/value) in the tree", () => {

    //     it("Should not add a new entry with an existing key", async () => {
    //         // const tree = await SMT.build(hash, levelDb, 'test')

    //         await tree.add("2", "b")
    //         const fun = async () => await tree.add("2", "a")

    //         expect(fun).toThrow()
    //     })

    // })

    // describe("Get values from the tree", () => {
    //     it("Should get a value from the tree using an existing key", () => {
    //         const tree = new SMT(hash)

    //         tree.add("2", "a")
    //         const value = tree.get("2")

    //         expect(value).toEqual("a")
    //     })

    //     it("Should not get a value from the tree using a non-existing key", () => {
    //         const tree = new SMT(hash)

    //         tree.add("2", "a")
    //         const value = tree.get("1")

    //         expect(value).toBeUndefined()
    //     })
    // })

    // describe("Update values in the tree", () => {
    //     it("Should update a value of an existing key", () => {
    //         const tree = new SMT(hash)

    //         tree.add("2", "a")
    //         tree.update("2", "5")

    //         expect(tree.root).toEqual("c75d3f1f5bcd6914d0331ce5ec17c0db8f2070a2d4285f8e3ff11c6ca19168ff")
    //     })

    //     it("Should not update a value with a non-existing key", () => {
    //         const tree = new SMT(hash)

    //         const fun = () => tree.update("1", "5")

    //         expect(fun).toThrow()
    //     })
    // })

    // describe("Delete entries from the tree", () => {
    //     it("Should delete an entry with an existing key", () => {
    //         const tree = new SMT(hash)

    //         tree.add("2", "a")
    //         tree.delete("2")

    //         expect(tree.root).toEqual("0")
    //     })

    //     it("Should delete 3 entries and create the correct root hash", () => {
    //         const tree = new SMT(hash)

    //         for (const key of testKeys) {
    //             tree.add(key, key)
    //         }

    //         tree.delete(testKeys[1])
    //         tree.delete(testKeys[3])
    //         tree.delete(testKeys[4])

    //         expect(tree.root).toEqual("5d2bfda7c24d9e9e59fe89a271f7d0a3435892c98bc1121b9b590d800deeca10")
    //     })

    //     it("Should not delete an entry with a non-existing key", () => {
    //         const tree = new SMT(hash)

    //         const fun = () => tree.delete("1")

    //         expect(fun).toThrow()
    //     })
    // })

    // describe("Create Merkle proofs and verify them", () => {
    //     it("Should create some Merkle proofs and verify them", async () => {
    //         const tree = new SMT(hash)

    //         for (const key of testKeys) {
    //             tree.add(key, key)
    //         }

    //         for (let i = 0; i < 100; i++) {
    //             const randomKey = Math.floor(Math.random() * 100).toString(16)
    //             const proof = await tree.createProof(randomKey)

    //             expect(tree.verifyProof(proof)).toBeTruthy()
    //         }

    //         tree.add("12", "1")

    //         const proof = await tree.createProof("6")
    //         expect(tree.verifyProof(proof)).toBeTruthy()
    //     })

    //     it("Should not verify a wrong Merkle proof", async () => {
    //         const tree = new SMT(hash)

    //         for (const key of testKeys) {
    //             tree.add(key, key)
    //         }

    //         const proof = await tree.createProof("19")
    //         proof.matchingEntry = ["20", "a"]

    //         expect(tree.verifyProof(proof)).toBeFalsy()
    //     })
    // })
})