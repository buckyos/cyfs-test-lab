import {EventEmitter} from 'events';
import { FetchHelper } from './net';


export class SystemUpdateProvider extends EventEmitter {
    public static LatestPublishUrl: string ='/system/lastpublish';
    public static PublishUrl: string = '/system/publish'; //发布到全网
    public static PrePublishUrl: string ='/system/prepublish';
    
    public static async latest(): Promise<{succ: boolean, msg?: string, value?: any}> {
        let option: any = {
            body: {},
        };

        let resp = await FetchHelper.PostFetch(SystemUpdateProvider.LatestPublishUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${SystemUpdateProvider.LatestPublishUrl}`);
            return {succ: false, msg:'网络错误'};
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${SystemUpdateProvider.LatestPublishUrl}`);
            return {succ: false, msg: `服务器返回失败 resp=${JSON.stringify(resp)}`};
        }

        return {succ: true, value: resp.value!};
    }

    public static async prepublish(param: {
        url: string,
        md5: string,
        version: string,
    }): Promise<{succ: boolean, msg?: string}> {
        let option: any = {
            body: param,
        };

        let resp = await FetchHelper.PostFetch(SystemUpdateProvider.PrePublishUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${SystemUpdateProvider.PrePublishUrl}`);
            return {succ: false, msg:'网络错误'};
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${SystemUpdateProvider.PrePublishUrl}`);
            return {succ: false, msg: `服务器返回失败 resp=${JSON.stringify(resp)}`};
        }

        return {succ: true};
    }

    public static async publish(version: string): Promise<{succ: boolean, msg?: string}> {
        let option: any = {
            body: {
                version
            },
        };

        let resp = await FetchHelper.PostFetch(SystemUpdateProvider.PublishUrl, option);
        if (resp.err) {
            console.log(`request server failed, url=${SystemUpdateProvider.PublishUrl}`);
            return {succ: false, msg:'网络错误'};
        }

        if (resp.value!.err === undefined || !resp.value!.err.code === undefined || resp.value!.err.code !== 0) {
            console.log(`server answer, err=${resp.value!.err}, url=${SystemUpdateProvider.PublishUrl}`);
            return {succ: false, msg: `服务器返回失败 resp=${JSON.stringify(resp)}`};
        }

        return {succ: true};
    }
}