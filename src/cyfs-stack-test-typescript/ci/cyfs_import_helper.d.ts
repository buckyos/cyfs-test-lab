type API = typeof import('../cyfs_node/cyfs_node') 
const cyfs= <any>{ }
let run_param = "ci"
if (run_param = "npm") {
    import( "../cyfs_node/cyfs_node").then((module)=>{Object.assign(cyfs, module)
    });
} else if (run_param = "source") {
    import( "../cyfs_node/cyfs_node").then((module)=>{Object.assign(cyfs, module)
    });
}
else if (run_param = "ci") {
    import("../cyfs_node/cyfs_node").then((module)=>{Object.assign(cyfs, module)
    });
}

async function importModule(moduleName:string):Promise<any>{
    if (moduleName = "npm"){
    console.log("importing ", moduleName);

    const importedModule = import("../cyfs_node/cyfs_node");
    console.log("\timported ...");
    return importedModule;
}else if (moduleName = "source")
{
    console.log("importing ", moduleName);

    const importedModule =import("../cyfs_node/cyfs_node");
    console.log("\timported ...");
    return importedModule;
}else if (moduleName = "ci"){
    console.log("importing ", moduleName);

    const importedModule = import("../cyfs_node/cyfs_node");
    console.log("\timported ...");
    return importedModule;
}

}

export default  cyfs
