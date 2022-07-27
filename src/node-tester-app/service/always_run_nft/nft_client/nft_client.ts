const window = {
    meta_target:"http://154.31.50.111:1423",
    spv_target:"http://154.31.50.111:3516"
} 

import {
    bucky_time_2_js_time,
    BuckyError, BuckyErrorCode, BuckyErrorCodeEx,
    BuckyResult, create_meta_client,
    error, File, FileDecoder, JSBI,
    NDNAPILevel,
    NONAPILevel,
    NONObjectInfo,
    ObjectId,
    SharedCyfsStack,
    TransTaskState
} from "../cyfs/index";
import {JSONObject, JSONObjectDecoder} from "./json_object";
import {Err, Ok} from "ts-results";
import exp from "constants";

export type CoinTokenId = {"Coin": number} | {"Token": string};
export type NFTState = "Normal" | {"Auctioning": [number, CoinTokenId, number]} | {"Selling": [number, CoinTokenId]};
export type NFTType = "Atomic";
export type TxStatus = "Signing" | "Pending" | {"Complete": number};

export interface NFTUpdate {
    nft_id: string;
    name: string;
    nft_type: NFTType;
    nft_state: NFTState;
    sub_names: string[];
    sub_states: NFTState[];
}

export interface NFTBuy {
    nft_id: string;
    price: number;
    coin_id: CoinTokenId;
}

export interface NFTSell {
    nft_id: string;
    price: number;
    coin_id: CoinTokenId;
}

export interface NFTApplyBuy {
    nft_id: string;
    price: number;
    coin_id: CoinTokenId;
}

export interface NFTcancelApplyBuy {
    nft_id: string;
}

export interface NFTAgreeApply {
    nft_id: string;
    user_id: string;
}

export interface NFTLike {
    nft_id: string;
}

export interface NFTInfo {
    name: string;
    create_time: number;
    nft_type: NFTType;
    has_init: boolean;
    view_count: number;
    file_type: string;
    owner_id: string;
    author_id: string;
    parent_id?: string;
    sub_list?: string[];
}

export interface NFTData {
    nft_id: string;
    create_time: number;
    beneficiary: string;
    owner_id: string;
    author_id: string;
    reward_amount: number;
    like_count: number;
    state: NFTState;
    name: string;
    block_number: number;
    view_count: number;
    file_type: string;
    parent_id?: string;
    sub_list?: string[];
}

export interface NFTBidRecord {
    buyer_id: string;
    price: number;
    coin_id: CoinTokenId;
}

export interface NFTSummaryInfo {
    nft_id: string;
    name: string;
    file_type: string;
}

export interface NFTListResp {
    sum: number;
    list: NFTSummaryInfo[];
}

export interface NFTBuyItem {
    buyer_id: string;
    price: number;
    coin_id: CoinTokenId;
}

export interface ViewNFTBuyListResult {
    sum: number;
    list: NFTBuyItem[];
}

export interface LargestBuy {
    buyer_id: string;
    coin_id: CoinTokenId;
    price: number;
}

export interface NFTLikeItem {
    user_id: string;
    like_time: number;
    block_number: number;
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class CyfsNftClient {
    stack: SharedCyfsStack;
    dec_id: ObjectId;

    constructor(stack: SharedCyfsStack, dec_id: ObjectId) {
        this.stack = stack;
        this.dec_id = dec_id;
    }

    private async request(obj_type: number, req_data?: any, target?: ObjectId): Promise<BuckyResult<any>> {
        const ret = await this.stack.util().get_device({common: {flags: 0}});
        if (ret.err) {
            error("request err", ret, " obj_type ", obj_type);
            return ret;
        }
        const {device_id} = ret.unwrap();

        let send_content;
        if (req_data) {
            const encoder = new TextEncoder();
            send_content = encoder.encode(JSON.stringify(req_data));
        } else {
            send_content = new Uint8Array();
        }
        const obj = JSONObject.create(this.dec_id, device_id.object_id, obj_type, send_content);
        const obj_id = obj.desc().calculate_id();
        const obj_data = new Uint8Array(obj.raw_measure().unwrap());
        obj.raw_encode(obj_data).unwrap();
        const result = await this.stack.non_service().post_object({
            "common": {
                "dec_id": this.dec_id,
                "level": NONAPILevel.Router,
                "flags": 0,
                "target": target,
            }, "object": new NONObjectInfo(obj_id, obj_data)
        });
        if (result.err) {
            error("request err", result, " obj_type ", obj_type);
            return result;
        }

        const ret_obj = new JSONObjectDecoder().raw_decode(result.unwrap().object!!.object_raw);
        if (ret_obj.err) {
            error("request err", ret_obj, " obj_type ", obj_type);
            return ret_obj;
        }

        const [ret_json_obj] = ret_obj.unwrap();
        const decoder = new TextDecoder();
        const data = decoder.decode(ret_json_obj.body().unwrap().content().data);
        const json_obj = JSON.parse(data);

        return Ok(json_obj);
    }

    async update(nft_id: string, name: string, nft_type: NFTType, nft_state: NFTState, sub_names: string[], sub_states: NFTState[]): Promise<BuckyResult<string>> {
        return await this.request(0, {nft_id, name, nft_type, nft_state, sub_names, sub_states});
    }

    async bid(nft_id: string, price: number): Promise<BuckyResult<string>> {
        return await this.request(2, {nft_id, price, coin_id: {"Coin": 0}});
    }

    async buy(nft_id: string, price: number): Promise<BuckyResult<string>> {
        return await this.request(4, {nft_id, price, coin_id: {"Coin": 0}});
    }

    async apply_buy(nft_id: string, owner_id: string, price: number): Promise<BuckyResult<string>> {
        return await this.request(6, {nft_id, owner_id, price, coin_id: {"Coin": 0}});
    }

    async cancel_apply_buy(nft_id: string): Promise<BuckyResult<string>> {
        return await this.request(8, {nft_id});
    }

    async agree_apply(nft_id: string, user_id: string): Promise<BuckyResult<string>> {
        return await this.request(10, {nft_id, user_id});
    }

    async like(nft_id: string): Promise<BuckyResult<string>> {
        return await this.request(12, {nft_id});
    }

    async get_info(nft_id: string, target: string | undefined): Promise<BuckyResult<NFTInfo>> {
        if (target) {
            return await this.request(14, nft_id, ObjectId.from_base_58(target).unwrap());
        } else {
            return await this.request(14, nft_id);
        }
    }

    async get_list(offset: number, length: number): Promise<BuckyResult<NFTListResp>> {
        return await this.request(16, {offset, length});
    }

    async get_nft_object(nft_id: string, target: string | undefined): Promise<BuckyResult<File>> {
        let target_id;
        if (target) {
            target_id = ObjectId.from_base_58(target).unwrap();
        }

        const result = await this.stack.non_service().get_object({
            "common": {
                "dec_id": this.dec_id,
                "target": target_id,
                "level": NONAPILevel.Router,
                "flags": 0
            }, "object_id": ObjectId.from_base_58(nft_id).unwrap()
        });

        if (result.err) {
            error("request err", result);
            return result;
        }

        const ret_obj = new FileDecoder().raw_decode(result.unwrap().object!!.object_raw);
        if (ret_obj.err) {
            error("request err", ret_obj);
            return ret_obj;
        }

        return Ok(ret_obj.unwrap()[0]);
    }

    async get_nft_apply_buy_list(nft_id: string, offset: number, length: number): Promise<BuckyResult<ViewNFTBuyListResult>> {
        const meta_client = create_meta_client(window.meta_target, window.spv_target);
        const resp = await meta_client.nft_get_apply_buy_list(nft_id, offset, length);
        if (resp.err) {
            return resp;
        }
        const ret = resp.unwrap();
        const list = ret.list.map((item) => {
            return {
                buyer_id: item.buyer_id.to_base_58(),
                coin_id: {Coin: 0},
                price: item.price
            };
        });
        return Ok({
            sum: ret.sum,
            list});
    }


    async get_nft_bid_list(nft_id: string, offset: number, length: number): Promise<BuckyResult<ViewNFTBuyListResult>> {
        const meta_client = create_meta_client(window.meta_target, window.spv_target);
        const resp = await meta_client.nft_get_bid_list(nft_id, offset, length);
        if (resp.err) {
            return resp;
        }
        const ret = resp.unwrap();
        const list = ret.list.map((item) => {
            return {
                buyer_id: item.buyer_id.to_base_58(),
                coin_id: {Coin: 0},
                price: item.price
            };
        });
        return Ok({
            sum: ret.sum,
            list});
    }

    async get_nft_latest_likes(nft_id: string, count: number): Promise<BuckyResult<NFTLikeItem[]>> {
        const meta_client = create_meta_client(window.meta_target, window.spv_target);
        const resp = await meta_client.nft_get_latest_likes(nft_id, count);
        if (resp.err) {
            return Err(new BuckyError(resp.err, resp.msg));
        }
        const list = resp.result.map((item) => {
            return {
                user_id: item[0],
                like_time: bucky_time_2_js_time(JSBI.BigInt(item[2])),
                block_number: item[1]
            };
        });
        return Ok(list);
    }

    async get_nft_from_chain(nft_id: string): Promise<BuckyResult<NFTData>> {
        const meta_client = create_meta_client(window.meta_target, window.spv_target);
        const resp = await meta_client.nft_get(nft_id);
        if (resp.err) {
            return Err(new BuckyError(resp.err, resp.msg));
        }
        const ret = resp.result;
        return Ok(ret as NFTData);
    }

    async get_nft_from_owner(nft_id: string, owner_id: string): Promise<BuckyResult<NFTData>> {
        const chain_ret = await this.get_nft_from_chain(nft_id);
        if (chain_ret.err) {
            return chain_ret;
        }

        const data = chain_ret.unwrap();
        if (data.owner_id !== "" && data.beneficiary !== "") {
            const object_id = ObjectId.from_base_58(data.beneficiary).unwrap();
            const resp = await this.stack.util().resolve_ood({
                common: {
                    flags: 0
                },
                object_id
            });

            const ood_id = resp.unwrap().device_list[0].object_id;
            const file_info_ret = await this.get_info(nft_id, ood_id.to_base_58());
            if (file_info_ret.err) {
                return file_info_ret;
            }
            const file_info = file_info_ret.unwrap();
            if (file_info.view_count) {
                data.view_count = file_info.view_count;
            } else {
                data.view_count = 0;
            }
            data.file_type = file_info.file_type;
            return Ok(data);
        }


        const object_id = ObjectId.from_base_58(owner_id).unwrap();
        const resp = await this.stack.util().resolve_ood({
            common: {
                flags: 0
            },
            object_id
        });

        const ood_id = resp.unwrap().device_list[0].object_id;
        const obj_resp = await this.stack.non_service().get_object({
            object_id: ObjectId.from_base_58(nft_id).unwrap(),
            common: {
                level: NONAPILevel.Router,
                target: ood_id,
                flags: 0
            }
        });

        if (obj_resp.err) {
            return obj_resp;
        }
        const obj_data = obj_resp.unwrap();

        const file_info_ret = await this.get_info(nft_id, ood_id.to_base_58());
        if (file_info_ret.err) {
            return file_info_ret;
        }
        const file_info = file_info_ret.unwrap();

        const beneficiary = file_info.author_id;
        const author_id = file_info.author_id;
        return Ok({
            nft_id,
            create_time: file_info.create_time,
            beneficiary,
            owner_id: file_info.owner_id,
            author_id,
            name: file_info.name,
            reward_amount: data.reward_amount,
            like_count: data.like_count,
            state: "Normal",
            block_number: 0,
            view_count: file_info.view_count,
            file_type: file_info.file_type,
            parent_id: file_info.parent_id,
            sub_list: file_info.sub_list
        });
    }

    async get_largest_buy(nft_id: string): Promise<BuckyResult<LargestBuy | null>> {
        const meta_client = create_meta_client(window.meta_target, window.spv_target);
        const resp = await meta_client.nft_get_largest_buy(nft_id);
        if (resp.err) {
            return resp;
        }
        const ret = resp.unwrap();
        if (ret.value.is_none()) {
            return Ok(null);
        } else {
            return Ok({
                buyer_id: ret.value.unwrap().buyer_id.to_base_58(),
                price: ret.value.unwrap().price,
                coin_id: {Coin: 0}
            });
        }
    }

    async withdraw(nft_id: string, price: string): Promise<BuckyResult<string>> {
        return await this.request(30, {nft_id, price, coin_id: {Coin: 0}});
    }

    async get_tx_status(tx_id: string): Promise<BuckyResult<TxStatus>> {
        return await this.request(32, tx_id);
    }

    async has_like(nft_id: string, user_id: string): Promise<BuckyResult<boolean>> {
        const meta_client = create_meta_client(window.meta_target, window.spv_target);
        const resp = await meta_client.nft_has_like(nft_id, user_id);
        if (resp.err) {
            return Err(new BuckyError(resp.err, resp.msg));
        }

        return Ok(resp.result);
    }

    async view(beneficiary: string, nft_id: string): Promise<any> {
        const owner_id = ObjectId.from_base_58(beneficiary).unwrap();
        const resp = await this.stack.util().resolve_ood({
            common: {
                flags: 0
            },
            object_id: owner_id
        });
        if (resp.err) {
            return resp;
        }
        const ood_id = resp.unwrap().device_list[0].object_id;
        return await this.request(34, nft_id, ood_id);
    }

    async create(file_id: string, name: string, create_time: number): Promise<BuckyResult<string>> {
        return await this.request(36, {file_id, name, create_time});
    }

    async create2(file_list: [string, string, number][]): Promise<BuckyResult<string>> {
        return await this.request(38, {file_list});
    }
}
