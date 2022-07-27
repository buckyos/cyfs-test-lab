const assert = require('assert');

class Node {
    constructor(key, value) {
        this.prev = null;
        this.next = null;
        this.key = key;
        this.value = value;
    }
}

class LRUMap {
    constructor(size) {
        this.MAX_SIZE = size;
        this._map = new Map();
        this._header = null;
        this._tail = null;
    }

    get size() {
        return this._map.size;
    }

    set(key, value) {
        let _map = this._map;
        let node;
        if (_map.has(key)) {
            node = _map.get(key);
            node.value = value;

        } else {
            if (this.size >= this.MAX_SIZE) this.removeLast();
            node = new Node(key, value);
            _map.set(key, node);
        }
        this.moveFirst(node);
    }

    get(key) {
        let node = this._map.get(key);
        if (node) {
            this.moveFirst(node);
            return node.value;
        } else {
            return null;
        }
    }

    clear() {
        this._map.clear();
        let node = this._header;
        let tmp;
        while (node) {
            tmp = node;
            node = node.next;
            tmp.prev = null;
            tmp.next = null;
        }
        this._header = null;
        this._tail = null;
    }

    moveFirst(node) {
        let _header = this._header;
        if (node.prev === null) {
            if (_header === node) {
                return;

            } else {
                if (_header) {
                    _header.prev = node;
                } else {
                    // CASE: this._tail === null
                    this._tail = node;
                }
                node.next = _header;
                this._header = node;
            }

        } else {
            node.prev.next = node.next;
            if (node.next) {
                node.next.prev = node.prev;
            } else {
                this._tail = node.prev;
            }

            node.prev = null;
            
            if (_header) _header.prev = node;
            node.next = _header;
            this._header = node;
        }
        // assert(this.size === this.linkSize, `LRUMap link size ${this.linkSize} donot match map size ${this.size}`);
    }

    removeLast() {
        let last = this._tail;
        if (last === null) return;

        this._tail = last.prev;
        if (last.prev) {
            last.prev.next = null;
        } else {
            this._header = null;
        }
        this._map.delete(last.key);
    }
    
    *[Symbol.iterator]() {
        let node = this._header;
        while (node) {
            yield node;
            node = node.next;
        }
    }    

    get linkSize() {
        let node = this._header;
        let i;
        for (i=0; node; node=node.next) {
            i++;
        }
        return i;
    }
}

module.exports = LRUMap;

function test() {
    let lru = new LRUMap(3);
    lru.set(1, 'hi');
    console.log(lru.get(1));
    lru.set(2, 'how');
    lru.set(3, 'are');
    lru.set(4, 'you');
    console.log(lru.get(2));
    console.log(lru.get(3));
    console.log(lru.get(4));
    lru.set(2, '?');
    console.log(lru.get(3));
    console.log(lru.get(1));

    assert(lru.size === 3, `got ${lru.size}`);
    for (let n of lru) {
        if (n) process.stdout.write(` -> ${n.key}`);
    }
    process.stdout.write('\n');
    
    for (let n of lru) {
        if (n) process.stdout.write(` -> ${n.value}`);
    }
    process.stdout.write('\n');

    lru.clear();

    for (let n of lru) {
        if (n) process.stdout.write(` -> ${n.value}`);
    }
    process.stdout.write('Empty\n');

    lru = new LRUMap(1);
    lru.set(1, 'hi');
    lru.set(2, 'how');
    lru.set(3, 'are');
    console.log(lru.get(1));
    console.log(lru.size);
}

if (require.main === module) {
    test();
}
