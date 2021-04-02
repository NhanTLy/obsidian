class Node {
    constructor(key, value) {
        this.key = key;
        this.value = value;
        this.freq = 1;
    }
}

class LFUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.currentSize = 0;
        this.least = 0;
        this.hashMap = new Map();
        this.hashMap.set('ROOT_QUERY', {});
        this.hashMap.set('ROOT_MUTATION', {});
        this.freqMap = new Map();
    }

    put(key, value) {
        // check to see if it is in cache
        let result = this.hashMap.get(key);
        // if not
        if (!result) {
            // check to see if current size is over capacity
            if (this.currentSize > this.capacity) {
                // delete all keys that are least frequently used
                let arrToDelete = this.freqMap.get(this.least);
                arrToDelete.forEach(key => {
                    this.hashMap.delete(key);
                    // decrease current size once for every key deleted
                    this.currentSize--;
                });
                // reset array at this count
                this.freqMap.set(this.least, []);
            }
            this.hashMap.set(key, value);
            if (!this.freqMap.get(1)) {
                this.freqMap.set(1, [key]);
            } else {
                let arrToAdd = this.freqMap.get(1);
                this.freqMap.set(1, [...arrToAdd, key]);
            }
            this.currentSize++;
            if (this.least === 0) this.least++;
        } else {
            this.hashMap.set(key, value);
        }
    }
}

// const test = new LFUCache(5);
// test.put('Actor~1', { id: '1', firstName: 'Harrison' });
// console.log(test);
