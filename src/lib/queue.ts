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

async function process() {
    if (!queue.isEmpty()) {
        const task = queue.pop();

        try {
            task.resolve(await task.fn());
        } catch (e) {
            task.reject(e);
        }
    }

    setTimeout(process, 10);
}

export default function <T>(priority: Priority, fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        queue.enqueue({ priority, created: Date.now(), fn, resolve, reject });
    });
}

process();
