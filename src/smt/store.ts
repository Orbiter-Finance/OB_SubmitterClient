
interface Store<K, V> {

    getNodes(key: K): Promise<V>;

    prePutNodes(key: K, value: V): void;

    preDelNodes(key: K): void;

    getValue(key: K)

}