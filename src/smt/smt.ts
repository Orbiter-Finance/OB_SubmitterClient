import { checkHex, getFirstCommonElements, getIndexOfLastNonZeroElement, keyToPath } from "./utils";

import { LevelStore } from "./store"
import { Level } from "level";

export type Node = string;
export type Key = Node;
export type Value = Node;
export type EntryMark = Node;

export type SideNodes = Node[];
export type ChildNodes = Node[];

export type Entry = [Key, Value, EntryMark]

export const LEAF_CONTENT_POSITION = 2

export type HashFunction = (childNodes: ChildNodes) => Node;

export interface EntryResponse {
    entry: Entry | Node[]
    matchingEntry?: Entry | Node[]
    sidenodes: SideNodes
}

export interface SMTProof extends EntryResponse{
    root: Node
    membership: boolean
}

export class SMT {

    // The root of the tree
    root: Node
    // Value for zero nodes.
    private zeroNode: Node;
    // Additional entry value to mark the leaf nodes.
    private entryMark: EntryMark
    // protected store;
    private hash: HashFunction;

    private store: LevelStore;

    public static async build(hash: HashFunction, levelDb: Level, smtName: string):Promise<SMT>{
        if(levelDb.status in ['opening', 'closing']) {
            throw Error("db opening or closing")
        }

        if(levelDb.status === 'closed') {
            await levelDb.open()
        }

        const store = new LevelStore(levelDb, smtName??'test')
        const root = await store.getRoot()
        return new SMT(hash, store, root)
    }

    constructor(hash: HashFunction,  store: LevelStore, root: Node | null) {
        this.hash = hash
        this.zeroNode = "0"
        this.entryMark = "1"
        this.root = (root == null) ? this.zeroNode : root
        this.store = store
    }

    private checkParameterType(parameter: Key | Value) {
        if (!checkHex(parameter as string)) {
            throw new Error(`Parameter ${parameter} must be a hexadecimal`)
        }
    }

    private async retrieveEntry(key: Key): Promise<EntryResponse> {
        const path = keyToPath(key)
        const sidenodes: SideNodes = []
        for (let i = 0, node = this.root; node !== this.zeroNode ; i++) {
            const childNodes = await this.store.getNodes(node) as ChildNodes
            const entryNode = await this.store.getValues(node) as Entry
            const direction = path[i]
            // if the third position of the array is not empty the child nodes
            // are an entry of the tree.
            if(entryNode && entryNode[2]) {
                if (entryNode[0] === key) {
                    return { entry: entryNode, sidenodes }
                }
                // The entry found does not have the same key. But the key of this
                // particular entry matches the first 'i' bits of the key passed
                // as parameter and it can be useful in several functions.
                return { entry: [key], matchingEntry: entryNode, sidenodes }
            } else if(childNodes) {
                // When it goes down into the tree and follows the path, in every step
                // a node is chosen between the left and the right child nodes, and the
                // opposite node is saved as side node.
                node = childNodes[direction] as Node
                sidenodes.push(childNodes[Number(!direction)] as Node)
            } else {
                throw new Error(`Key "${key}" not exist`)
            }
            
        }
        // The path led to a zero node.
        return { entry: [key], sidenodes }
    }

    /**
     * Checks if a node is a leaf node.
     * @param node A node of the tree.
     * @returns True if the node is a leaf, false otherwise.
     */
    private async isLeaf(node: Node): Promise<boolean> {
        const childNodes = await this.store.getValues(node)
        

        return !!(childNodes !== null && childNodes[2])
    }

    /**
     * Calculates nodes with a bottom-up approach until it reaches the root node.
     * @param node The node to start from.
     * @param path The path of the key.
     * @param sidenodes The side nodes of the path.
     * @returns The root node.
     */
    private calculateRoot(node: Node, path: number[], sidenodes: SideNodes): Node {
        for (let i = sidenodes.length - 1; i >= 0; i--) {
            const childNodes: ChildNodes = path[i] ? [sidenodes[i], node] : [node, sidenodes[i]]
            node = this.hash(childNodes)
        }

        return node
    }

     /**
     * Gets a key and if the key exists in the tree the function returns the
     * value, otherwise it returns 'undefined'.
     * @param key A key of a tree entry.
     * @returns A value of a tree entry or 'undefined'.
     */
    public async get(key: Key): Promise<Value | undefined> {
        this.checkParameterType(key)
        const { entry } = await this.retrieveEntry(key)
        console.log(`entry ${entry}`)
        return entry[1]
    }

    /**
     * Adds a new entry in the tree. It retrieves a matching entry
     * or a zero node with a top-down approach and then it updates all the
     * hashes of the nodes in the path of the new entry with a bottom-up approach.
     * @param key The key of the new entry.
     * @param value The value of the new entry.
     */
    public async add(key: Key, value: Value) {
        this.checkParameterType(key)
        this.checkParameterType(value)
        
        const { entry, matchingEntry, sidenodes } = await this.retrieveEntry(key)
        if (entry[1] !== undefined) {
            throw new Error(`Key "${key}" already exists`)
        }

        const path = keyToPath(key)

        const node = matchingEntry ? this.hash(matchingEntry) : this.zeroNode

        // If there are side nodes it deletes all the nodes of the path.
        // These nodes will be re-created below with the new hashes.
        if(sidenodes.length > 0) {
            this.deleteOldNodes(node, path, sidenodes)
        }

        // If there is a matching entry, further N zero side nodes are added
        // in the `sidenodes` array, followed by the matching node itself.
        // N is the number of the first matching bits of the paths.
        // This is helpful in the non-membership proof verification
        // as explained in the function below.
        if(matchingEntry) {
            const matchingPath = keyToPath(matchingEntry[0])

            for(let i = sidenodes.length; matchingPath[i] === path[i]; i++) {
                sidenodes.push(this.zeroNode)
            }

            sidenodes.push(node)
        }

        // Adds the new entry and re-creates the nodes of the path with the new hashes
        // with a bottom-up approach. The `addNewNodes` function returns the last node
        // added, which is the root node.
        const newNode = this.hash([key, value, this.entryMark])
        this.store.preparePutValue(newNode, [key, value, this.entryMark].toString())
        await this.store.commit()
        this.root = await this.addNewNodes(newNode, path, sidenodes)
        this.store.prepareUpdateRoot(this.root)
        await this.store.commit()
    }

    /**
     * Updates a value of an entry in the tree. Also in this case
     * all the hashes of the nodes in the path of the entry are updated
     * with a bottom-up approach.
     * @param key The key of the entry.
     * @param value The value of the entry.
     */
    public async update(key: Key, value: Value) {
        this.checkParameterType(key)
        this.checkParameterType(value)

        const { entry, sidenodes } = await this.retrieveEntry(key)

        if (entry[1] === undefined) {
            throw new Error(`Key "${key}" does not exist`)
        }

        const path = keyToPath(key)

        // Deletes the old entry and all the nodes in its path.
        const oldNode = this.hash(entry)
        this.store.prepareDelNodes(oldNode)
        this.deleteOldNodes(oldNode, path, sidenodes)

        // Adds the new entry and re-creates the nodes of the path
        // with the new hashes
        const newNode = this.hash([key, value, this.entryMark])
        this.store.preparePutValue(newNode, [key, value, this.entryMark].toString())

        await this.store.commit()
        this.root = await this.addNewNodes(newNode, path, sidenodes)
        this.store.prepareUpdateRoot(this.root)
        await this.store.commit()
    }

    /**
     * Deletes an entry in the tree. Also in this case all the hashes of
     * the nodes in the path of the entry are updated with a bottom-up approach.
     * @param key The key of the entry.
     */
    public async delete(key: Key) {
        this.checkParameterType(key)

        const { entry, sidenodes } = await this.retrieveEntry(key)

        if(entry[1] === undefined) {
            throw new Error(`Key "${key}" does not exist`)
        }

        const path = keyToPath(key)

        // Deletes the entry
        const node = this.hash(entry)
        this.store.prepareDelValue(node)

        this.root = this.zeroNode

        // If there are side nodes it deletes the nodes of the path and
        // re-creates them with the new hashes.
        if(sidenodes.length > 0) {
            this.deleteOldNodes(node, path, sidenodes)

            // If the last side node is not a leaf node, it adds all the
            // nodes of the path starting from a zero node, otherwise
            // it removes the last non-zero side node from the `sidenodes`
            // array and it starts from it by skipping the last zero nodes.
            if (! await this.isLeaf(sidenodes[sidenodes.length - 1])) {
                this.root = await this.addNewNodes(this.zeroNode, path, sidenodes)
            } else {
                const firstSidenode = sidenodes.pop() as Node
                const i = getIndexOfLastNonZeroElement(sidenodes)

                this.root = await this.addNewNodes(firstSidenode, path, sidenodes, i)
            }

        }

        this.store.prepareUpdateRoot(this.root)
        await this.store.commit()

    }
    
    /**
     * Creates a proof to prove the membership or the non-membership
     * of a tree entry.
     * @param key A key of an existing or a non-existing entry.
     * @returns The membership or the non-membership proof.
     */
    public async createProof(key: Key): Promise<SMTProof> {
        this.checkParameterType(key)

        const { entry, matchingEntry, sidenodes } = await this.retrieveEntry(key)

        // If the key exists the function returns a membership proof, otherwise it
        // returns a non-membership proof with the matching entry.
        return {
            entry,
            matchingEntry,
            sidenodes,
            root: this.root,
            membership: !!entry[1]
        }
    }


    /**
     * Verifies a membership or a non-membership proof.
     * @param proof The proof to verify.
     * @returns True if the proof is valid, false otherwise.
     */

    public verifyProof(proof: SMTProof): boolean {
        // If there is not a matching entry it simply obtains the root
        // hash by using the side nodes and the path of the key.
        if(!proof.matchingEntry) {
            const path = keyToPath(proof.entry[0])
            // If there is not an entry value the proof is a non-membership proof,
            // and in this case, since there is not a matching entry, the node
            // is a zero node. If there is an entry value the proof is a
            // membership proof and the node is the hash of the entry.
            const node = proof.entry[1] !== undefined ? this.hash(proof.entry) : this.zeroNode
            const root = this.calculateRoot(node, path, proof.sidenodes)

            // If the obtained root is equal to the proof root, then the proof is valid.
            return root === proof.root
        } else {
            // If there is a matching entry the proof is definitely a non-membership
            // proof. In this case it checks if the matching node belongs to the tree
            // and then it checks if the number of the first matching bits of the keys
            // is greater than or equal to the number of the side nodes.
            const matchingPath = keyToPath(proof.matchingEntry[0])
            const node = this.hash(proof.matchingEntry)
            const root = this.calculateRoot(node, matchingPath, proof.sidenodes)

            if (root === proof.root) {
                const path = keyToPath(proof.entry[0])
                // Returns the first common bits of the two keys: the
                // non-member key and the matching key.
                const firstMatchingBits = getFirstCommonElements(path, matchingPath)
                // If the non-member key was a key of a tree entry, the depth of the
                // matching node should be greater than the number of the first common
                // bits of the keys. The depth of a node can be defined by the number
                // of its side nodes.
                return proof.sidenodes.length <= firstMatchingBits.length
            }

            return false
        }
    }

    /**
     * Deletes nodes in the tree with a bottom-up approach until it reaches the root node.
     * @param node The node to start from.
     * @param path The path of the key.
     * @param sidenodes The side nodes of the path.
     * @param i The index to start from.
     */
    private async deleteOldNodes(node: Node, path: number[], sidenodes: SideNodes) {
        for(let i = sidenodes.length - 1; i >= 0; i--) {
            const childNodes: ChildNodes = path[i] ? [sidenodes[i], node] : [node, sidenodes[i]]
            node = this.hash(childNodes)

            this.store.prepareDelNodes(node)
            await this.store.commit()
        }
    }

    /**
     * Adds new nodes in the tree with a bottom-up approach until it reaches the root node.
     * @param node The node to start from.
     * @param path The path of the key.
     * @param sidenodes The side nodes of the path.
     * @param i The index to start from.
     * @returns The root node.
     */
    private async addNewNodes(node: Node, path: number[], sidenodes: SideNodes, i = sidenodes.length - 1): Promise<Node> {
        for(; i >= 0; i--) {
            const childNodes: ChildNodes = path[i] ? [sidenodes[i], node] : [node, sidenodes[i]]
            node = this.hash(childNodes)
            this.store.preparePutNodes(node, childNodes)
        }
        await this.store.commit()
        return node
    }

    public async debugTree(): Promise<void> {
        const valuesMap = await this.store.getValuesMap()
        const nodesMap = await this.store.getNodesMap()
        const root = await this.store.getRoot()
        let logStr = `tree Root: ${root}\n`
        logStr += "start print valuesMap\n"
        valuesMap.forEach((value,key) => {
            logStr += `[key] ${key} [value] ${value}\n`
        })
        logStr += "start print nodesMap\n"
        nodesMap.forEach((value,key) => {
            logStr += `[key] ${key} [node] ${value}\n`
        })
        console.log(`${logStr}`)
    }

}