import {GitTextObjectDecoder} from "../types";
import {NONPostObjectOutputRequestJsonCodec, RouterHandlerPostObjectRequest} from "../../cyfs";


export function DecoderPostParam(param: RouterHandlerPostObjectRequest): {route: string, data: Object} {
    const codec = new NONPostObjectOutputRequestJsonCodec();
    console.info('post_object param: ', JSON.stringify(codec.encode_object(param.request)));
    const [text, buf] = new GitTextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
    console.info(`put_object text_object: route=${text.id}, header=${text.header}, body=${text.value}`);
    const route = text.id
    const data = JSON.parse(text.value)

    return {
        route,
        data
    }
}
