import React, { useEffect, useState } from 'react';
import * as cyfs from '@src/cyfs';
import { Button, Input, Spin } from 'antd';
import { post_put_object } from "@www/apis/handler_request"
import Select from 'react-select'
import JSONEditor from 'react-json-editor-ajrm';

const locale = require('react-json-editor-ajrm/locale/zh-CN');
const { TextArea } = Input;


export default function TestBoard() {
    const [request_json, set_request_json] = useState({
        PutObjectReq: {
            message: "input message"
        }
    });
    const [request_type, set_request_type] = useState({
        value: "put-object",
        label: "PutObject",
    });
    const [response, set_response] = useState({});
    const [publishLoading, setPublishLoading] = useState(false);
    const handle_request_type = (value: string) => {
        //request_type = value;
        console.info(`select request_type = ${request_type}`)
    }

    const schema = {
        title: 'Todo',
        type: 'object',
        required: ['title'],
        properties: {
            title: { type: 'string', title: 'Title', default: 'A new task' },
            done: { type: 'boolean', title: 'Done?', default: false },
        },
    };

    const uiSchema = {
        done: {
            'ui:widget': 'checkbox',
        },
    };

    const handlePostObject = async () => {
        setPublishLoading(true);
        const request_type_value = request_type ? request_type.value : "";
        console.log(`send request， request_type = ${request_type.value} ,request_data = ${JSON.stringify(request_json)}`);
        const r = await post_put_object(request_type.value, JSON.stringify(request_json));
        set_response(r);
        setPublishLoading(false);
        set_request_json({
            PutObjectReq: {
                message: "input message"
            }
        });
    };
    const options = [
        {
            value: "PutObject",
            label: "PutObject",
        },
        {
            value: "GetObject",
            label: "GetObject",
        },
        {
            value: "TransFile",
            label: "TransFile",
        },
        {
            value: "PrepareTransFile",
            label: "PrepareTransFile",
        },
        {
            value: "UpdateContext",
            label: "UpdateContext",
        },
        {
            value: "AddContext",
            label: "AddContext",
        },
        {
            value: "ShareFileAddAccess",
            label: "ShareFileAddAccess",
        },
        {
            value: "OS_IO_ReadFile",
            label: "OS_IO_ReadFile",
        },
        {
            value: "OS_IO_WriteFile",
            label: "OS_IO_WriteFile",
        },
        {
            value: "OS_IO_RunFile",
            label: "OS_IO_RunFile",
        },
        {
            value: "OS_Network_HttpListern",
            label: "OS_Network_HttpListern",
        },
        {
            value: "OS_Network_HttpRequest",
            label: "OS_Network_HttpRequest",
        },
    ]
    const editorStyle = {
        background: 'black',
        color: 'rgb(255, 168, 0)', // 橙色
    };

    return (
        <div >
            <div >
                <h2>测试页面</h2>
            </div>
            <div>
                <Select options={options} value={request_type} onChange={set_request_type} />
                <JSONEditor
                    id="json-editor-request"
                    placeholder={request_json}
                    theme="light_mitsuketa_tribute"
                    height="400px"
                    colors={editorStyle}
                    waitAfterKeyPress={5000}
                    onChange={(value: any) => set_request_json(value)}
                    locale={locale}
                />
                <Button
                    type="primary"
                    onClick={() => handlePostObject()}
                    loading={publishLoading}
                >
                    Post Object
                </Button>
                <JSONEditor
                    id="json-editor-response"
                    placeholder={response}
                    theme="light_mitsuketa_tribute"
                    height="400px"
                    colors={editorStyle}
                    onChange={(value: any) => set_response(value)}
                    locale={locale}
                />
            </div>
        </div>

    );
}
