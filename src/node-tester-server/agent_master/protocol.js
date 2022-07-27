const Constant = {
    netInfo: {
        type: {
            any: 0,
            wire: 1,
            wifi: 2,
        },
        udpEnable: {
            close: 0,
            open: 1,
            any: 2,
        },
        tcpEnable: {
            close: 0,
            open: 1,
            any: 2,
        }
    }    
}

const FieldArray = {
    encode: (arr, buffer, offset, elementEncoder) => {
        if (buffer.length - offset < 2) {
            return -1;
        }

        const startPos = offset;

        buffer.writeUInt16LE(arr.length, offset);
        offset += 2;

        for (let i = 0; i < arr.length; i++) {
            let elementSize = elementEncoder.encode(arr[i], buffer, offset);
            offset += elementSize;
            if (elementSize < 0) {
                return -1;
            }
        }
        return offset - startPos;
    },

    decode: (buffer, offset, elementDecoder) => {
        if (buffer.length - offset < 2) {
            return {length: -1, pkg: null};
        }

        const startPos = offset;
        let count = buffer.readUInt16LE(offset);
        offset += 2;

        let arr = new Array(count);

        for (let i = 0; i < count; i++) {
            let decodeResult = elementDecoder.decode(buffer, offset);
            offset += decodeResult.length;
            if (decodeResult.length < 0) {
                return decodeResult;
            }
            arr[i] = decodeResult.pkg;
        }

        return {length: offset - startPos, pkg: arr};
    }
}

const FieldString = {
    encode: (str, buffer, offset) => {
        if (buffer.length - offset < str.length + 2) {
            return -1;
        }
        buffer.writeUInt16LE(str.length, offset);
        buffer.write(str, offset + 2);
        return str.length + 2;
    },

    decode: (buffer, offset) => {
        if (buffer.length - offset < 2) {
            return {length: -1, pkg: null};
        }
        const length = buffer.readUInt16LE(offset) + 2;
        if (buffer.length < length) {
            return {length: -1, pkg: null};
        }
        offset += 2;
        return {length, pkg: buffer.slice(offset, offset + length - 2).toString()};
    }
}

const FieldArrayString = {
    encode: (strArr, buffer, offset) => {
        return FieldArray.encode(strArr, buffer, offset, FieldString);
    },

    decode: (buffer, offset) => {
        return FieldArray.decode(buffer, offset, FieldString);
    }
}

const FieldNameSpace = {
    encode: (pkg, buffer, offset) => {
        pkg.agentId = pkg.agentId || "";
        pkg.serviceId = pkg.serviceId || "";
        pkg.taskId = pkg.taskId || "";

        const serviceId = pkg.serviceId;
        const taskId = pkg.taskId;

        const length = 8 + pkg.agentId.length + serviceId.length + taskId.length;
        if (buffer.length - offset < length) {
            return -1;
        }

        let startPos = offset;
        buffer.writeUInt16LE(length - 2, offset);
        offset += 2;

        let fieldSize = FieldString.encode(pkg.agentId, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldString.encode(serviceId, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldString.encode(taskId, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        return offset - startPos;
    },

    decode: (buffer, offset) => {
        let startPos = offset;

        if (buffer.length - offset < 8) {
            return {length: -1, pkg: null};
        }
        const length = buffer.readUInt16LE(offset);
        if (buffer.length < length + 2) {
            return {length: -1, pkg: null};
        }

        let pkg = {};

        offset += 2;
        let decodeResult = FieldString.decode(buffer, offset);
        if (decodeResult.length < 0) {
            return {length: -1, pkg: null}
        }

        pkg.agentId = decodeResult.pkg;
        offset += decodeResult.length;

        decodeResult = FieldString.decode(buffer, offset);
        if (decodeResult.length < 0) {
            return {length: -1, pkg: null}
        }

        pkg.serviceId = decodeResult.pkg;
        offset += decodeResult.length;

        decodeResult = FieldString.decode(buffer, offset);
        if (decodeResult.length < 0) {
            return {length: -1, pkg: null}
        }

        pkg.taskId = decodeResult.pkg;
        offset += decodeResult.length;
        return {length: offset - startPos, pkg};
    }
}

const FieldNetInfo = {
    encode: (pkg, buffer, offset) => {
        let startPos = offset;

        // buffer.writeUInt16LE(offset - startPos - 2, offset); 最后填
        offset += 2;

        if (pkg) {
            let fieldSize = FieldString.encode(pkg.name, buffer, offset);
            offset += fieldSize;
            if (fieldSize < 0) {
                return -1;
            }
    
            if (buffer.length - offset < 1) {
                return -1;
            }
            buffer.writeUInt8(pkg.type, offset);
            offset += 1;
    
            fieldSize = FieldArrayString.encode(pkg.ipv4, buffer, offset);
            offset += fieldSize;
            if (fieldSize < 0) {
                return -1;
            }
    
            fieldSize = FieldArrayString.encode(pkg.ipv6, buffer, offset);
            offset += fieldSize;
            if (fieldSize < 0) {
                return -1;
            }
    
            if (buffer.length - offset < 2) {
                return -1;
            }
            buffer.writeUInt8(pkg.udpEnable, offset++);
            buffer.writeUInt8(pkg.tcpEnable, offset++);    
        }

        buffer.writeUInt16LE(offset - startPos - 2, startPos);

        return offset - startPos;
    },

    decode: (buffer, offset) => {
        let startPos = offset;

        if (buffer.length - offset < 2) {
            return {length: -1, pkg: null};
        }
        const length = buffer.readUInt16LE(offset);
        offset += 2;
        if (length === 0) {
            return {length: 2, pkg: null};
        }

        if (buffer.length < length + 2) {
            return {length: -1, pkg: null};
        }

        let pkg = {};

        let decodeResult = FieldString.decode(buffer, offset);
        pkg.name = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return {length: -1, pkg: null};
        }

        if (buffer.length - offset < 1) {
            return {length: -1, pkg: null};
        }
        pkg.type = buffer.readUInt8(offset);
        offset += 1;

        decodeResult = FieldArrayString.decode(buffer, offset);
        pkg.ipv4 = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldArrayString.decode(buffer, offset);
        pkg.ipv6 = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        if (buffer.length - offset < 2) {
            return {length: -1, pkg: null};
        }
        pkg.udpEnable = buffer.readUInt8(offset++);
        pkg.tcpEnable = buffer.readUInt8(offset++);

        return {length: offset - startPos, pkg};
    }
}

const Header = {
    encode: (pkg, buffer, offset) => {
        const startPos = offset;

        let fieldSize = FieldString.encode(pkg.name, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        if (buffer.length - offset < 4) {
            return -1;
        }
        buffer.writeUInt32LE(pkg.seq, offset);
        offset += 4;

        fieldSize = FieldNameSpace.encode(pkg.to, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldNameSpace.encode(pkg.from, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }
        
        return offset - startPos;
    },

    decode: (buffer, offset) => {
        let startPos = offset;
        let pkg = {};

        let decodeResult = FieldString.decode(buffer, offset);
        pkg.name = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        if (buffer.length - offset < 4) {
            return {length: -1, pkg: null};
        }
        pkg.seq = buffer.readUInt32LE(offset);
        offset += 4;

        decodeResult = FieldNameSpace.decode(buffer, offset);
        pkg.to = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldNameSpace.decode(buffer, offset);
        pkg.from = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        return {length: offset - startPos, pkg};
    }
}

const EmptyPkg = {
    encode: (pkg, buffer, offset) => {
        return 0;
    },

    decode: (buffer, offset) => {
        return {length: 0, pkg: {}};
    }
}

const ErrorRespPkg = {
    encode: (pkg, buffer, offset) => {
        if (buffer.length - offset < 1) {
            return -1;
        }
        buffer.writeUInt8(pkg.err, offset);
        return 1;
    },

    decode: (buffer, offset) => {
        if (buffer.length - offset < 1) {
            return {length: -1, pkg: null};
        }

        let pkg = {};
        pkg.err = buffer.readUInt8(offset);
        return {length: 1, pkg};
    }
}

const HeartbeatReq = {
    encode: (pkg, buffer, offset) => {
        const startPos = offset;

        let fieldSize = FieldString.encode(pkg.version);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldString.encode(pkg.platform);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        if (buffer.length - offset < 2) {
            return -1;
        }
        const serviceCount = pkg.services? pkg.services.length : 0;
        buffer.writeUInt16LE(serviceCount, offset);
        offset += 2;

        for (let service of pkg.services) {
            fieldSize = FieldString.encode(service.serviceId.toString(), buffer, offset);
            offset += fieldSize;
            if (fieldSize < 0) {
                return -1;
            }

            fieldSize = FieldString.encode(service.name, buffer, offset);
            offset += fieldSize;
            if (fieldSize < 0) {
                return -1;
            }

            fieldSize = FieldString.encode(service.version, buffer, offset);
            offset += fieldSize;
            if (fieldSize < 0) {
                return -1;
            }

            if (buffer.length - offset < 1) {
                return -1;
            }
            buffer.writeUInt8(service.status, offset);
            offset++;
        }

        if (buffer.length - offset < 2) {
            return -1;
        }
        const taskCount = pkg.tasks? pkg.tasks.length : 0;
        buffer.writeUInt16LE(taskCount, offset);
        offset += 2;

        for (let taskId of pkg.tasks) {
            fieldSize = FieldString.encode(taskId.toString(), buffer, offset);
            offset += fieldSize;
            if (fieldSize < 0) {
                return -1;
            }
        }

        return offset - startPos;
    },

    decode: (buffer, offset) => {
        let startPos = offset;
        let pkg = {
            version: '',
            services: [],
            tasks: []
        };

        let decodeResult =  FieldString.decode(buffer, offset);
        pkg.version = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult =  FieldString.decode(buffer, offset);
        pkg.platform = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        if (buffer.length - offset < 2) {
            return {length: -1, pkg: null};
        }
        const serviceCount = buffer.readUInt16LE(offset);
        offset += 2;

        pkg.services = new Array(serviceCount);

        for (let i = 0; i < serviceCount; i++) {
            let service = {};
            pkg.services[i] = service;

            decodeResult = FieldString.decode(buffer, offset);
            service.serviceId = parseInt(decodeResult.pkg);
            offset += decodeResult.length;
            if (decodeResult.length < 0) {
                return decodeResult;
            }
 
            decodeResult = FieldString.decode(buffer, offset);
            service.name = decodeResult.pkg;
            offset += decodeResult.length;
            if (decodeResult.length < 0) {
                return decodeResult;
            }
    
            decodeResult = FieldString.decode(buffer, offset);
            service.version = decodeResult.pkg;
            offset += decodeResult.length;
            if (decodeResult.length < 0) {
                return decodeResult;
            }

            if (buffer.length - offset < 1) {
                return {length: -1, pkg: null};
            }
            service.status = buffer.readUInt8(offset);
            offset++;
        }

        if (buffer.length - offset < 2) {
            return {length: -1, pkg: null};
        }
        
        const taskCount = buffer.readUInt16LE(offset);
        offset += 2;

        pkg.tasks = new Array(taskCount);
        for (let i = 0; i < taskCount; i++) {
            decodeResult = FieldString.decode(buffer, offset);
            pkg.tasks[i] = parseInt(decodeResult.pkg);
            offset += decodeResult.length;
            if (decodeResult.length < 0) {
                return decodeResult;
            }
        }

        return {length: offset - startPos, pkg};
    }
}

const HeartbeatResp = {
    encode: (pkg, buffer, offset) => {
        const startPos = offset;

        if (buffer.length - offset < 2) {
            return -1;
        }
        const serviceCount = pkg.services? pkg.services.length : 0;
        buffer.writeUInt16LE(serviceCount, offset);
        offset += 2;

        for (let service of pkg.services) {
            let fieldSize = FieldString.encode(service.serviceId.toString(), buffer, offset);
            offset += fieldSize;
            if (fieldSize < 0) {
                return -1;
            }

            fieldSize = FieldString.encode(service.name, buffer, offset);
            offset += fieldSize;
            if (fieldSize < 0) {
                return -1;
            }

            fieldSize = FieldString.encode(service.url, buffer, offset);
            offset += fieldSize;
            if (fieldSize < 0) {
                return -1;
            }

            fieldSize = FieldString.encode(service.md5, buffer, offset);
            offset += fieldSize;
            if (fieldSize < 0) {
                return -1;
            }

            fieldSize = FieldString.encode(service.version, buffer, offset);
            offset += fieldSize;
            if (fieldSize < 0) {
                return -1;
            }
        }

        fieldSize = FieldArrayString.encode(pkg.invalidServices || [], buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        return offset - startPos;
    },

    decode: (buffer, offset) => {
        let startPos = offset;
        let pkg = {
            services: [],
            invalidServices: [],
        };

        if (buffer.length - offset < 2) {
            return {length: -1, pkg: null};
        }
        const serviceCount = buffer.readUInt16LE(offset);
        offset += 2;

        pkg.services = new Array(serviceCount);

        for (let i = 0; i < serviceCount; i++) {
            let service = {};
            pkg.services[i] = service;

            let decodeResult = FieldString.decode(buffer, offset);
            service.serviceId = parseInt(decodeResult.pkg);
            offset += decodeResult.length;
            if (decodeResult.length < 0) {
                return decodeResult;
            }    
 
            decodeResult = FieldString.decode(buffer, offset);
            service.name = decodeResult.pkg;
            offset += decodeResult.length;
            if (decodeResult.length < 0) {
                return decodeResult;
            }
 
            decodeResult = FieldString.decode(buffer, offset);
            service.url = decodeResult.pkg;
            offset += decodeResult.length;
            if (decodeResult.length < 0) {
                return decodeResult;
            }
 
            decodeResult = FieldString.decode(buffer, offset);
            service.md5 = decodeResult.pkg;
            offset += decodeResult.length;
            if (decodeResult.length < 0) {
                return decodeResult;
            }
    
            decodeResult = FieldString.decode(buffer, offset);
            service.version = decodeResult.pkg;
            offset += decodeResult.length;
            if (decodeResult.length < 0) {
                return decodeResult;
            }
        }

        decodeResult = FieldArrayString.decode(buffer, offset);
        pkg.invalidServices = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        return {length: offset - startPos, pkg};
    }
}

const GetAgentReq = {
    encode: (pkg, buffer, offset) => {
        const startPos = offset;

        let fieldSize = FieldString.encode(pkg.serviceId.toString(), buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldNetInfo.encode(pkg.netInfo, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }
        
        fieldSize = FieldArrayString.encode(pkg.includeTags, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }
        
        fieldSize = FieldArrayString.encode(pkg.excludeTags, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }
        
        fieldSize = FieldArrayString.encode(pkg.excludeAgentIds, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }
        
        return offset - startPos;
    },

    decode: (buffer, offset) => {
        let startPos = offset;
        let pkg = {};

        let decodeResult = FieldString.decode(buffer, offset);
        pkg.serviceId = parseInt(decodeResult.pkg);
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldNetInfo.decode(buffer, offset);
        pkg.netInfo = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldArrayString.decode(buffer, offset);
        pkg.includeTags = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldArrayString.decode(buffer, offset);
        pkg.excludeTags = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldArrayString.decode(buffer, offset);
        pkg.excludeAgentIds = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        return {length: offset - startPos, pkg};
    }
}

const GetAgentResp = {
    encode: (pkg, buffer, offset) => {
        const startPos = offset;
        let fieldSize = FieldString.encode(pkg.agentId, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }
        
        fieldSize = FieldNetInfo.encode(pkg.netInfo, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        return offset - startPos;
    },

    decode: (buffer, offset) => {
        let startPos = offset;
        let pkg = {};

        let decodeResult = FieldString.decode(buffer, offset);
        pkg.agentId = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldNetInfo.decode(buffer, offset);
        pkg.netInfo = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        return {length: offset - startPos, pkg};
    }
}

const UpdateServiceReq = {
    encode: (pkg, buffer, offset) => {
        const startPos = offset;

        let fieldSize = FieldString.encode(pkg.serviceId.toString(), buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldString.encode(pkg.serviceName, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }
        
        fieldSize = FieldString.encode(pkg.newVersion, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldString.encode(pkg.url, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldString.encode(pkg.md5, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        return offset - startPos;
    },

    decode: (buffer, offset) => {
        let startPos = offset;
        let pkg = {};

        let decodeResult = FieldString.decode(buffer, offset);
        pkg.serviceId = parseInt(decodeResult.pkg);
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldString.decode(buffer, offset);
        pkg.serviceName = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldString.decode(buffer, offset);
        pkg.newVersion = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldString.decode(buffer, offset);
        pkg.url = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldString.decode(buffer, offset);
        pkg.md5 = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        return {length: offset - startPos, pkg};
    }
}

const UpdateServiceResp = {
    encode: (pkg, buffer, offset) => {

    },

    decode: (buffer, offset) => {

    }
}

const StartServiceReq = {
    encode: (pkg, buffer, offset) => {
        const startPos = offset;

        let fieldSize = FieldString.encode(pkg.serviceId.toString(), buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldArrayString.encode(pkg.params, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        return offset - startPos;
    },

    decode: (buffer, offset) => {
        let startPos = offset;
        let pkg = {};

        let decodeResult = FieldString.decode(buffer, offset);
        pkg.serviceId = parseInt(decodeResult.pkg);
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldArrayString.decode(buffer, offset);
        pkg.params = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        return {length: offset - startPos, pkg};
    }
}

const StartServiceResp = ErrorRespPkg

const StopServiceReq = {
    encode: (pkg, buffer, offset) => {
        const startPos = offset;

        let fieldSize = FieldString.encode(pkg.serviceId.toString(), buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        return offset - startPos;
    },

    decode: (buffer, offset) => {
        let startPos = offset;
        let pkg = {};

        let decodeResult = FieldString.decode(buffer, offset);
        pkg.serviceId = parseInt(decodeResult.pkg);
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        return {length: offset - startPos, pkg};
    }
}

const StopServiceResp = ErrorRespPkg;

const RunTaskReq = {
    encode: (pkg, buffer, offset) => {
        const startPos = offset;

        // <TODO> 测试
        if (pkg.taskId === 133) {
            console.log('trace');
        }

        let fieldSize = FieldString.encode(pkg.jobId.toString(), buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldString.encode(pkg.serviceId.toString(), buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldString.encode(pkg.taskId.toString(), buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldString.encode(pkg.version, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldString.encode(pkg.url, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldString.encode(pkg.md5, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldArrayString.encode(pkg.params, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        return offset - startPos;
    },

    decode: (buffer, offset) => {
        let startPos = offset;
        let pkg = {};

        let decodeResult = FieldString.decode(buffer, offset);
        pkg.jobId = parseInt(decodeResult.pkg);
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldString.decode(buffer, offset);
        pkg.serviceId = parseInt(decodeResult.pkg);
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldString.decode(buffer, offset);
        pkg.taskId = parseInt(decodeResult.pkg);
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldString.decode(buffer, offset);
        pkg.version = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldString.decode(buffer, offset);
        pkg.url = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldString.decode(buffer, offset);
        pkg.md5 = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldArrayString.decode(buffer, offset);
        pkg.params = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        return {length: offset - startPos, pkg};
    }
}

const RunTaskResp = ErrorRespPkg;

const TaskFinishReq = {
    encode: (pkg, buffer, offset) => {
        const startPos = offset;

        let fieldSize = FieldString.encode(pkg.taskId.toString(), buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldString.encode(pkg.jobId.toString(), buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldString.encode(pkg.msg, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        if (buffer.length - offset < 1) {
            return -1;
        }
        buffer.writeUInt8(pkg.code, offset);
        offset += 1;

        fieldSize = FieldArrayString.encode(pkg.urls, buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        return offset - startPos;
    },

    decode: (buffer, offset) => {
        let startPos = offset;
        let pkg = {};

        let decodeResult = FieldString.decode(buffer, offset);
        pkg.taskId = parseInt(decodeResult.pkg);
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldString.decode(buffer, offset);
        pkg.jobId = parseInt(decodeResult.pkg);
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldString.decode(buffer, offset);
        pkg.msg = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        if (buffer.length - offset < 1) {
            return {length: -1, pkg: null};
        }
        pkg.code = buffer.readUInt8(offset);
        offset++;

        decodeResult = FieldArrayString.decode(buffer, offset);
        pkg.urls = decodeResult.pkg;
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        return {length: offset - startPos, pkg};
    }
}

const StopTaskReq = {
    encode: (pkg, buffer, offset) => {
        const startPos = offset;

        let fieldSize = FieldString.encode(pkg.serviceId.toString(), buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        fieldSize = FieldString.encode(pkg.taskId.toString(), buffer, offset);
        offset += fieldSize;
        if (fieldSize < 0) {
            return -1;
        }

        return offset - startPos;
    },

    decode: (buffer, offset) => {
        let startPos = offset;
        let pkg = {};

        let decodeResult = FieldString.decode(buffer, offset);
        pkg.serviceId = parseInt(decodeResult.pkg);
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        decodeResult = FieldString.decode(buffer, offset);
        pkg.taskId = parseInt(decodeResult.pkg);
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            return decodeResult;
        }

        return {length: offset - startPos, pkg};
    }
}

const StopTaskResp = ErrorRespPkg;

const UnknownTypePkg = {
    encode: (pkg, buffer, offset) => {
        const startPos = offset;

        if (buffer.length - offset < pkg.originalBuffer.length) {
            return -1;
        }

        pkg.originalBuffer.copy(buffer, offset);
        offset += pkg.originalBuffer.length;

        return offset - startPos;
    },

    decode: (buffer, offset) => {
        let startPos = offset;
        let pkg = {};

        pkg.originalBuffer = new Buffer(buffer.slice(offset));
        offset += pkg.originalBuffer.length;

        return {length: offset - startPos, pkg};
    }
}

const GenerateBodyCodeMap = () => {
    let bodyCodecMap = new Map();

    bodyCodecMap.set('sys.heartbeat.req', HeartbeatReq);
    bodyCodecMap.set('sys.heartbeat.resp', HeartbeatResp);
    bodyCodecMap.set('sys.getagent.req', GetAgentReq);
    bodyCodecMap.set('sys.getagent.resp', GetAgentResp);
    bodyCodecMap.set('sys.updateservice.req', UpdateServiceReq);
    bodyCodecMap.set('sys.updateservice.resp', UpdateServiceResp);
    bodyCodecMap.set('sys.startservice.req', StartServiceReq);
    bodyCodecMap.set('sys.startservice.resp', StartServiceResp);
    bodyCodecMap.set('sys.stopservice.req', StopServiceReq);
    bodyCodecMap.set('sys.stopservice.resp', StopServiceResp);
    bodyCodecMap.set('sys.runtask.req', RunTaskReq);
    bodyCodecMap.set('sys.runtask.resp', RunTaskResp);
    bodyCodecMap.set('sys.stoptask.req', StopTaskReq);
    bodyCodecMap.set('sys.stoptask.resp', StopTaskResp);
    bodyCodecMap.set('sys.taskfinish.req', TaskFinishReq);

    return bodyCodecMap;
}

const GetRespName = (reqName) => {
    let fields = reqName.split('.');
    if (fields[2] !== 'req') {
        return null;
    }
    fields[2] = 'resp';
    return fields.join('.');
}

const BodyCodecMap = GenerateBodyCodeMap();

const GetBodyCodecByPkgName = (name) => {
    return BodyCodecMap.get(name) || UnknownTypePkg;
}

module.exports = {
    Header,
    GetBodyCodecByPkgName,
    GetRespName,
    Constant,
};