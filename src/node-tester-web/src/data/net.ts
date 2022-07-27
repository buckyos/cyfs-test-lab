import { ConfigInfo } from './config';

// 处理promise和fetch的兼容性以及引入
//require('es6-promise').polyfill();
//require('isomorphic-fetch');


// response 转化
function parseJSON(response: any) {
    return response.json();
}

export class FetchHelper {
    public static formatUrl(obj: any) {
        const param: any = Object.values(obj).reduce((a, b, i) => `${a}${Object.keys(obj)[i]}=${b}&`, '?');
        return param.substring(0, param.length - 1);
    }

    public static async PostFetch(url: any, option: {} & any): Promise<{err: number, value?: any}> {
        option.headers = option.headers || {};

        option.method = 'post';
        option.headers['Content-Type'] = option.headers['Content-Type'] || 'application/json';
        option.body = JSON.stringify(option.body);

        return await new Promise<{err: number, value?: any}>((v) => {
            fetch(ConfigInfo.apiServer + url, option).then((resp)=>{
                if (resp.status !== 200) {
                    return {err: 1};
                }

                resp.json().then((value) => {
                     v({err: 0, value});
                }).catch(() =>{
                    v({err: 1});
                });
            }).catch(() => {
                v({err: 1});
            }); 
        });
    }
}