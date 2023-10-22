import { ICompare, PriorityQueue } from "@datastructures-js/priority-queue";
import Priority from "./priority.js";

interface Task<T> {
    priority: number;
    created: number;
    fn: () => Promise<T>;
    resolve: (obj: T) => void;
    reject: (error: any) => void;
}

const compare: ICompare<Task<any>> = (a, b) => {
    return a.priority - b.priority || a.created - b.created;
};

const queue = new PriorityQueue<Task<any>>(compare);

let running = false;

async function process() {
    running = true;
    if (queue.isEmpty()) return (running = false);

    const task = queue.pop();

    task.fn()
        .then((x) => task.resolve(x))
        .catch((e) => task.reject(e));

    setTimeout(process);
}

export default function <T>(priority: Priority, fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => fn().then(resolve).catch(reject));

    // return new Promise((resolve, reject) => {
    //     queue.enqueue({ priority, created: Date.now(), fn, resolve, reject });
    //     if (!running) process();
    // });
}
