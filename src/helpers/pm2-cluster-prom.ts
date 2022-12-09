/*
From https://github.com/JakeH/pm2-cluster-prometheus
Prometheus metrics aggregation for PM2's clustered mode.

Returns an aggregation of the default prom-client registry from all PM2 processes
when running in clustered mode, otherwise, returns the current proc's metrics.

Not using npm dep as it require pm2 version <=4 and we use 5+
*/
import * as pm2 from 'pm2';
import * as client from 'prom-client';

interface ProcessPacket {
    /**
     * The message topic
     */
    topic: string;

    /**
    * The PM2 proc id the message is currently on (seems weird, but PM2 is changing this id)
    */
    id: number;

    /**
     * The data payload of this packet
     */
    data: any;

    /**
     * Is this message a reply
     */
    isReply?: boolean;

    /**
     * PM2 id which is expecting the reply
     */
    replyTo?: number;

    /**
     * The originating PM2 proc id
     */
    originalProcId: number;

    /**
     * The originating instance
     */
    instanceVar: string;
}

/**
 * This process's PM proc id
 */
const currentProcId = parseInt(process.env.pm_id, 10);

/**
 * This process's instance
 */
const instanceVar = process.env[process.env.instance_var];

/**
 * Indicates the process is being ran in PM2's cluster mode
 */
export const isClusterMode = process.env.exec_mode === 'cluster_mode';

/**
 * Returns a list of PM2 processes when running in clustered mode
 */
function getProcList(): Promise<Array<pm2.ProcessDescription>> {
    return new Promise((resolve, reject) => {
        pm2.list((err, list) => {
            err ? reject(err)
                // only return processes with the same name
                : resolve(list.filter(o => o.name === process.env.name && o.pm2_env.status === 'online'));
        });
    });
}

/**
 * Broadcasts message to all processes in the cluster, resolving with the number of processes sent to
 * @param packet The packet to send
 */
async function broadcastToAll(packet: ProcessPacket): Promise<number> {
    return getProcList().then(list => {
        list.forEach(proc => pm2.sendDataToProcessId(proc.pm_id, packet, err => true));
        return list.length;
    });
}

/**
 * Sends a message to all processes in the cluster and resolves once all processes repsonsed or after a timeout
 * @param topic The name of the topic to broadcast
 * @param data The optional data payload
 * @param timeoutInMilliseconds The length of time to wait for responses before rejecting the promise
 */
function awaitAllProcMessagesReplies(topic: string, timeoutInMilliseconds: number): Promise<Array<ProcessPacket>> {

    return new Promise(async (resolve, reject) => {
        const responses = [];

        const procLength = await broadcastToAll({
            id: currentProcId,
            replyTo: currentProcId,
            originalProcId: currentProcId,
            topic,
            data: {},
            isReply: false,
            instanceVar,
        });

        const timeoutHandle = setTimeout(() => reject('timeout'), timeoutInMilliseconds);

        const handler = (response: ProcessPacket) => {

            if (!response.isReply || response.topic !== topic) {
                return;
            }

            responses.push(response);

            if (responses.length === procLength) {
                process.removeListener('message', handler);
                clearTimeout(timeoutHandle);
                resolve(responses);
            }
        };

        process.on('message', handler);

    });

}

/**
 * Sends a reply to the processes which originated a broadcast
 * @param originalPacket The original packet received
 * @param data The optional data to responed with
 */
function sendProcReply(originalPacket: ProcessPacket, data: any = {}) {

    const returnPacket: ProcessPacket = {
        ...originalPacket,
        data,
        isReply: true,
        id: currentProcId,
        originalProcId: currentProcId,
        instanceVar,
    };

    pm2.sendDataToProcessId(originalPacket.replyTo, returnPacket, err => true);
}

/**
 * Init
 */
if (isClusterMode) {
    const handleProcessMessage = async (packet: ProcessPacket) => {
        if (packet && packet.topic === 'metrics-get' && !packet.isReply) {
            try {
                sendProcReply(packet, await client.register.getMetricsAsJSON());
            } catch (err) {
                // pass
            }
        }
    };
    process.removeListener('message', handleProcessMessage);
    process.on('message', handleProcessMessage);
}

/**
 * Returns the aggregate metric if running in cluster mode, otherwise, just the current
 * instance's metrics
 * @param timeoutInMilliseconds How long to wait for other processes to provide their metrics.
 */
export async function getAggregateMetrics(timeoutInMilliseconds: number = 10e3): Promise<client.Registry> {

    if (isClusterMode) {
        const procMetrics = await awaitAllProcMessagesReplies('metrics-get', timeoutInMilliseconds);
        return client.AggregatorRegistry.aggregate(procMetrics.map(o => o.data));
    } else {
        return client.register;
    }

}

/**
 * Creates a timer which executes when the current time is cleanly divisible by `syncTimeInMS`
 * @param syncTimeInMilliseconds The time, in milliseconds
 * @param fun The function to execute
 * @returns The timer handle
 */
export function timeSyncRun(syncTimeInMilliseconds: number, fun: () => void): NodeJS.Timer {
    const handle = setTimeout(fun, syncTimeInMilliseconds - Date.now() % syncTimeInMilliseconds);
    handle.unref();
    return handle;
}
