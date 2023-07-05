import { Level } from "level"
import { Key, Node, Value } from "./smt";

import {   
    AbstractBatchPutOperation,
    AbstractBatchDelOperation,
    AbstractSublevel, 
} from "abstract-level";

export class LevelStore {

    protected db: Level<string, any>;
    protected nodesSubLevel: AbstractSublevel<
        Level<string, any>,
        string | Buffer | Uint8Array,
        string,
        string
    >;
    protected leavesSubLevel: AbstractSublevel<
        Level<string, any>,
        string | Buffer | Uint8Array,
        string,
        string
    >;
    protected operationCache: (
        | AbstractBatchPutOperation<Level<string, any>, string, any>
        | AbstractBatchDelOperation<Level<string, any>, string>
    )[];

    constructor(db: Level<string, any>, smtName: string) {
        this.db = db
        this.nodesSubLevel = this.db.sublevel(smtName);
        this.leavesSubLevel = this.db.sublevel(smtName + '_leaf');
        this.operationCache = [];
    }

    public clearPrepareOperationCache(): void {
        this.operationCache = [];
    }

    public async getNodes(key: Key): Promise<Key[] | null> {
        try {
            const valStr = await this.nodesSubLevel.get(key)
            return valStr.split(',')
        } catch(error) {
            return null
        }
       
    }

    public async getValues(key: Key): Promise<Value[] | null> {
        try {
            const valStr = await this.leavesSubLevel.get(key)
            return valStr.split(',')
        }   catch(error) {
            return null
        }
        
    }

    public preparePutNodes(key: Key, value: Key[]): void {
        this.operationCache.push({
            type: 'put',
            sublevel: this.nodesSubLevel,
            key: key.toString(),
            value: value.toString()
        });
    }

    public prepareDelNodes(key: Key): void {
       this.operationCache.push({
            type: 'del',
            sublevel: this.nodesSubLevel,
            key: key.toString()
       })
    }

    // public async getValue(path: Key): Promise<V> {
    //     const valueStr = await this.leavesSubLevel.get(path.toString())
    // }

    public preparePutValue(path: Key, value: Node): void {
        this.operationCache.push({
            type: 'put',
            sublevel: this.leavesSubLevel,
            key: path.toString(),
            value: value
        })
    }
    public prepareDelValue(path: Key): void {
        this.operationCache.push({
            type: 'del',
            sublevel: this.leavesSubLevel,
            key: path.toString()
        });
    }
    public async commit(): Promise<void> {
        if (this.operationCache.length > 0) {
            await this.db.batch(this.operationCache)
        }

        this.clearPrepareOperationCache()
    }

    public async getValuesMap(): Promise<Map<string, Node>> {
        let valuesMap = new Map<string, Node>();
        for await (const [key, valueStr] of this.leavesSubLevel.iterator()) {
            valuesMap.set(key, valueStr);

        }
        return valuesMap
    }

    public async getNodesMap(): Promise<Map<string, Node>> {
        let nodesMap = new Map<string, Node>();
        for await (const [key, nodeStr] of this.nodesSubLevel.iterator()) {
            nodesMap.set(key, nodeStr as Node);
        }
        return nodesMap
    }
    
}