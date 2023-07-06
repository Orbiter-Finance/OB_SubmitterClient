import { Level } from "level"
import { SMT } from "../src"
import { ChildNodes } from "../src/smt/smt"
import { sha256 } from "js-sha256"

import fs from 'fs';

function deleteDirectory(path: string) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach((file) => {
      const curPath = `${path}/${file}`;
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteDirectory(curPath); 
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}


describe("Sparse Merkle tree", () => {
    
    const hash = (childNodes: ChildNodes):string => sha256(childNodes.join(""))
    const testKeys = ["a", "3", "2b", "20", "9", "17"]
    let levelDb: Level
    const dbPath = './db'
    let tree: SMT

    // beforeAll(async () => {
    //     deleteDirectory(dbPath)
    //     levelDb = new Level<string, any>('./db')
    //     tree = await SMT.build(hash, levelDb, 'test')
    // });

    test("Should create an empty sparse Merkle tree", async () => {
        deleteDirectory(dbPath)
        levelDb = new Level<string, any>('./db')
        tree = await SMT.build(hash, levelDb, 'test')
        expect(tree.root).toEqual("0")
        expect(true).toEqual(true)
    })

    test("Should add a new entry", async () => {
        deleteDirectory(dbPath)
        levelDb = new Level<string, any>('./db')
        tree = await SMT.build(hash, levelDb, 'test')
        const oldRoot = tree.root

        await tree.add("2", "a")
    
        expect(tree.root).not.toEqual(oldRoot)
    })


    test("Should add 6 new entries and create the correct root hash", async () => {
        deleteDirectory(dbPath)
        levelDb = new Level<string, any>('./db')
        tree = await SMT.build(hash, levelDb, 'test')
        for (const key of testKeys) {
            await tree.add(key, key)
        }

        expect(tree.root).toEqual("40770450d00520bdab58e115dd4439c20cd39028252f3973e81fb15b02eb28f7")
    })

    test("Should add specific new entries and create the correct roo", async () => {
        deleteDirectory(dbPath)
        levelDb = new Level<string, any>('./db')
        tree = await SMT.build(hash, levelDb, 'test')
        await tree.add(testKeys[0], testKeys[0])
        await tree.add(testKeys[2], testKeys[2])
        await tree.add(testKeys[5], testKeys[5])

        expect(tree.root).toEqual("5d2bfda7c24d9e9e59fe89a271f7d0a3435892c98bc1121b9b590d800deeca10")
    })


   
    // it("Should not add a new entry with an existing key", async () => {
    //     // const tree = await SMT.build(hash, levelDb, 'test')

    //     await tree.add("2", "b")
    //     const fun = async () => await tree.add("2", "a")

    //     expect(fun).toThrow()
    // })

    describe("Get values from the tree", () => {
        
        test("Should get a value from the tree using an existing key", async () => {
            deleteDirectory(dbPath)
            levelDb = new Level<string, any>('./db')
            tree = await SMT.build(hash, levelDb, 'test')
            await tree.add("2aaa", "a")
            const value = await tree.get("2aaa")

            expect(value).toEqual("a")
        })

        test("Should not get a value from the tree using a non-existing key", async () => {
            deleteDirectory(dbPath)
            levelDb = new Level<string, any>('./db')
            tree = await SMT.build(hash, levelDb, 'test')

            // await tree.debugTree()

            // await tree.add("2b", "2befadd")

            // const valueOld = await tree.get("2b")

            // expect(valueOld).toEqual("a")

            // await tree.add("2", "b")
            const value = await tree.get("1")

            expect(value).toBeUndefined()
        })
    })

    describe("Update values in the tree", () => {
        test("Should update a value of an existing key", async () => {
            deleteDirectory(dbPath)
            levelDb = new Level<string, any>('./db')
            tree = await SMT.build(hash, levelDb, 'test')
            await tree.debugTree()
            await tree.add("2", "a")
            await tree.update("2", "5")

            expect(tree.root).toEqual("c75d3f1f5bcd6914d0331ce5ec17c0db8f2070a2d4285f8e3ff11c6ca19168ff")
        })

        // it("Should not update a value with a non-existing key", async() => {
        

        //     const fun = async () => await tree.update("1", "5")

        //     expect(fun).toThrow()
        // })
    })

    describe("Delete entries from the tree", () => {
        test("Should delete an entry with an existing key", async () => {
            deleteDirectory(dbPath)
            levelDb = new Level<string, any>('./db')
            tree = await SMT.build(hash, levelDb, 'test')
            await tree.add("2", "a")
            await tree.delete("2")
            expect(tree.root).toEqual("0")
        })

        test("Should delete 3 entries and create the correct root hash", async () => {
            deleteDirectory(dbPath)
            levelDb = new Level<string, any>('./db')
            tree = await SMT.build(hash, levelDb, 'test')
            for (const key of testKeys) {
                await tree.add(key, key)
            }


            await tree.delete(testKeys[1])
            await tree.delete(testKeys[3])
            await tree.delete(testKeys[4])

            expect(tree.root).toEqual("5d2bfda7c24d9e9e59fe89a271f7d0a3435892c98bc1121b9b590d800deeca10")
        })

        // it("Should not delete an entry with a non-existing key", () => {

        //     const fun = async () => await tree.delete("1")

        //     expect(fun).toThrow()
        // })
    })

    describe("Create Merkle proofs and verify them", () => {
        test("Should create some Merkle proofs and verify them", async () => {
            deleteDirectory(dbPath)
            levelDb = new Level<string, any>('./db')
            tree = await SMT.build(hash, levelDb, 'test')
            for (const key of testKeys) {
                await tree.add(key, key)
            }

            for (let i = 0; i < 100; i++) {
                const randomKey = Math.floor(Math.random() * 100).toString(16)
                const proof = await tree.createProof(randomKey)

                expect(tree.verifyProof(proof)).toBeTruthy()
            }

            const proof = await tree.createProof("3")
            expect(tree.verifyProof(proof)).toBeTruthy()

        })

        test("Should not verify a wrong Merkle proof", async () => {
            deleteDirectory(dbPath)
            levelDb = new Level<string, any>('./db')
            tree = await SMT.build(hash, levelDb, 'test')
            for (const key of testKeys) {
                await tree.add(key, key)
            }

            const proof = await tree.createProof("19")
            proof.matchingEntry = ["20", "a"]

            expect(tree.verifyProof(proof)).toBeFalsy()
        })
    })
})